import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { aiBookGenerateSchema } from '@/lib/validators';
import { filterInput, filterOutput, filterImagePrompt } from '@gsi/safety';
import { checkRateLimit, enforceIpRateLimit, trackCreation } from '@gsi/firebase/sessionService';
import { createGeneratedBook } from '@gsi/firebase/bookService';
import { llmRouter } from '@gsi/ai/router';
import { getImageProvider, type ImageStyle } from '@gsi/ai/imageProvider';
import { dimsForBookAndLayout } from '@gsi/ai/imageDims';
import { BOOK_FONTS, getBookTypeCard } from '@/lib/templates/bookTemplates';
import { enforceBilling } from '@/lib/billing';
import { ipFromRequest } from '@/lib/api/requestUtils';
import {
  BOOK_GENERATE_SYSTEM_PROMPT,
  buildBookGenerateUserMessage,
  buildPageImagePrompt,
  buildCoverImagePrompt,
  characterLookDescription,
  type BookCharacterGuide,
  type BookSceneType,
} from '@gsi/ai/prompts/bookGeneratePrompt';
import { sceneTypeToLayout } from '@/lib/books/sceneLayout';

/** Claim Netlify's max synchronous function budget (26s on paid plans).
 *  The image phase below is independently capped so we return within this
 *  window even when an image provider is slow or unhealthy. */
export const maxDuration = 26;

/** Hard ceiling on the per-page image phase. Whatever hasn't rendered by
 *  this point is persisted as null and regenerated later in the editor via
 *  /api/ai/page-image — far better than letting one slow/paywalled provider
 *  (e.g. Pollinations 402/502 retries) drag the whole request past the
 *  function timeout and return an HTML 502 the client can't parse. */
const IMAGE_PHASE_BUDGET_MS = 18_000;

/** Resolve to the image URL, or null if it errors OR misses the budget.
 *  The underlying request may keep running after we resolve — that's fine,
 *  we just stop waiting on it so the function returns in time. */
function imageWithBudget(p: Promise<string>, ms: number): Promise<string | null> {
  return Promise.race([
    p.then((url) => (typeof url === 'string' ? url : null)).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/** Shape Claude/Groq must return. Validated defensively after the router
 *  parses the JSON — provider drift on optional fields shouldn't 500. The
 *  characterGuide is the "book bible": a single locked look injected into
 *  every page + cover image prompt so the hero renders consistently. */
interface BookDraftResponse {
  title: string;
  coverPrompt: string;
  /** Null if the model omitted it — generation still works, just without
   *  the character-consistency anchor. */
  characterGuide: BookCharacterGuide | null;
  pages: Array<{
    plainText: string;
    imagePrompt: string;
    emotion: string;
    /** Composition the AI framed the page as — drives the page layout. */
    sceneType?: BookSceneType;
  }>;
}

/** The scene types the layout mapper understands. Anything else → undefined
 *  (falls back to the alternating framed default). */
const SCENE_TYPES: ReadonlySet<string> = new Set([
  'wide_establishing',
  'character_closeup',
  'action',
  'discovery',
  'emotional_reaction',
  'environmental_wonder',
  'dramatic_reveal',
]);

function asSceneType(v: unknown): BookSceneType | undefined {
  return typeof v === 'string' && SCENE_TYPES.has(v) ? (v as BookSceneType) : undefined;
}

/** Coerce a string-ish field to a trimmed string (defensive against the
 *  model emitting numbers/nulls for fields like character age). */
function asStr(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  return '';
}

/** Parse the characterGuide if present and usable. Requires at least a name
 *  + some visual detail; otherwise returns null so we fall back gracefully. */
function parseCharacterGuide(raw: unknown): BookCharacterGuide | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const guide: BookCharacterGuide = {
    name: asStr(r.name),
    age: asStr(r.age),
    appearance: asStr(r.appearance),
    clothing: asStr(r.clothing),
    accessory: asStr(r.accessory),
    personality: asStr(r.personality),
    colorTheme: asStr(r.colorTheme),
  };
  if (!guide.name || (!guide.appearance && !guide.clothing)) return null;
  return guide;
}

/** Validate the parsed shape. Router already JSON-parsed; we only check
 *  the structural fields we depend on. Throws AppException on any miss. */
function validateBookDraft(raw: unknown): BookDraftResponse {
  if (!raw || typeof raw !== 'object') {
    throw new AppException('AI_GENERATION_FAILED', 'AI returned an unexpected shape', 502);
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.title !== 'string' || typeof obj.coverPrompt !== 'string') {
    throw new AppException('AI_GENERATION_FAILED', 'AI draft missing title/cover', 502);
  }
  if (!Array.isArray(obj.pages) || obj.pages.length === 0) {
    throw new AppException('AI_GENERATION_FAILED', 'AI draft has no pages', 502);
  }
  const pages = obj.pages
    .filter((p): p is Record<string, unknown> => p !== null && typeof p === 'object')
    .map((p) => ({
      plainText: typeof p.plainText === 'string' ? p.plainText : '',
      imagePrompt: typeof p.imagePrompt === 'string' ? p.imagePrompt : '',
      emotion: asStr(p.emotion),
      sceneType: asSceneType(p.sceneType),
    }))
    .filter((p) => p.plainText.length > 0);
  if (pages.length === 0) {
    throw new AppException('AI_GENERATION_FAILED', 'AI draft pages were all empty', 502);
  }
  return {
    title: obj.title,
    coverPrompt: obj.coverPrompt,
    characterGuide: parseCharacterGuide(obj.characterGuide),
    pages,
  };
}

/**
 * POST /api/ai/book-generate (BOOK-002)
 *
 * Drafts a complete kid's book in one call: topic + age + style → title,
 * cover prompt, N pages of {text, image}. The book is persisted with
 * every page stamped `authorship.source = 'ai_generated'` so future kid
 * edits decay the AI share honestly toward their effort badge (BOOK-003).
 *
 * Cost: `book.aiGenerate` (flat LLM) + N × `image.flux` (per-page image).
 * Charged separately so a 5-page book = 10 + 5×5 = 35 credits at defaults.
 *
 * Returns `{ bookId, pagesGenerated, creditsCharged }`. Client redirects
 * to `/create/book/[bookId]`.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const input = aiBookGenerateSchema.parse(await request.json());

    // Safety: topic is kid-supplied freeform text
    filterInput(input.topic);

    await enforceIpRateLimit(ipFromRequest(request));
    await checkRateLimit(sessionId);

    // Resolve the bucket + default font for the requested book type.
    const typeCard = getBookTypeCard(input.type);
    if (!typeCard) {
      throw new AppException('INVALID_INPUT', `Unknown book type: ${input.type}`, 400);
    }
    const defaultFont = BOOK_FONTS[0]!;

    // BOOK-002 billing — preflight the FULL budget upfront so partial
    // success can't leave the kid out of pocket without a book.
    // Original P1 bug (Codex review): we billed images AFTER they rendered,
    // so a kid with enough for LLM + 1 image but not 2 spent 15 credits
    // and got no book back. Fixed by debiting everything first; if the
    // wallet can't cover the whole job we fail before any provider call.
    //
    // Image failures after this point don't refund — the provider still
    // charged us per attempt and the kid can regenerate failed pages
    // later via /api/ai/page-image without re-paying for the LLM draft.
    await enforceBilling(request, { feature: 'book.aiGenerate' });
    for (let i = 0; i < input.pageCount; i++) {
      await enforceBilling(request, { feature: 'image.flux' });
    }

    // Generate the draft via the LLM router — auto-picks Claude / Groq /
    // … and falls through to the next provider on auth or transport errors.
    // This is why story / quiz / etc. survive an Anthropic outage; book-
    // generate previously bypassed the router and inherited the risk.
    const parsed = await llmRouter.generateJson<unknown>({
      systemPrompt: BOOK_GENERATE_SYSTEM_PROMPT,
      userMessage: buildBookGenerateUserMessage({
        topic: input.topic,
        age: input.age,
        style: input.style,
        pageCount: input.pageCount,
        size: input.size,
        titleHint: input.title,
      }),
      maxTokens: 4096,
      temperature: 0.85,
    });
    const draft = validateBookDraft(parsed);

    // Safety-filter the character bible's freeform fields before it feeds
    // into any image prompt. Returns null if the model gave us no guide.
    const safeGuide: BookCharacterGuide | null = draft.characterGuide
      ? {
          name: filterOutput(draft.characterGuide.name),
          age: draft.characterGuide.age,
          appearance: filterImagePrompt(draft.characterGuide.appearance),
          clothing: filterImagePrompt(draft.characterGuide.clothing),
          accessory: filterImagePrompt(draft.characterGuide.accessory),
          personality: filterOutput(draft.characterGuide.personality),
          colorTheme: filterImagePrompt(draft.characterGuide.colorTheme),
        }
      : null;

    // Apply output safety to text + scene prompts, then compose the FINAL
    // image prompts: scene + locked character anchor + age art style +
    // quality suffix. The composed prompt is what we both render now AND
    // persist, so later per-page/cover regeneration stays consistent.
    const safeDraft = {
      title: filterOutput(draft.title),
      coverPrompt: buildCoverImagePrompt({
        coverPrompt: filterImagePrompt(draft.coverPrompt),
        guide: safeGuide,
        age: input.age,
      }),
      pages: draft.pages.map((p, i) => ({
        plainText: filterOutput(p.plainText),
        imagePrompt: buildPageImagePrompt({
          scenePrompt: filterImagePrompt(p.imagePrompt),
          emotion: p.emotion || undefined,
          guide: safeGuide,
          age: input.age,
        }),
        // Hybrid-by-scene-type: the AI's scene framing → a concrete layout,
        // varied by trim size and alternated so consecutive framed pages
        // differ. createGeneratedBook validates this against the bucket.
        layout: sceneTypeToLayout(p.sceneType, input.size, i),
      })),
    };

    // Per-page image generation in parallel, capped by IMAGE_PHASE_BUDGET_MS.
    // Already billed upfront per the preflight above — any page that errors
    // OR misses the budget is persisted with imageUrl:null and the kid
    // regenerates it in the editor via /api/ai/page-image (which has its own
    // debit) without re-paying for the LLM draft. Bounding the phase is what
    // keeps the function inside the Netlify timeout when a provider stalls.
    const { imageFunction } = getImageProvider();
    const style: ImageStyle = 'cartoon';
    const dims = dimsForBookAndLayout(input.size); // book-size aware; layout-agnostic for the bulk pass
    const imageUrls = await Promise.all(
      safeDraft.pages.map((p) =>
        imageWithBudget(
          imageFunction({
            prompt: p.imagePrompt,
            style,
            width: dims.width,
            height: dims.height,
          }),
          IMAGE_PHASE_BUDGET_MS,
        ),
      ),
    );

    let successfulImages = 0;
    const pagesWithImages = safeDraft.pages.map((p, i) => {
      const url = imageUrls[i] ?? null;
      if (url) successfulImages++;
      return { ...p, imageUrl: url };
    });

    // Persist atomically
    const book = await createGeneratedBook(
      {
        setup: {
          title: safeDraft.title,
          author: input.author ?? 'Anonymous Author',
          type: input.type,
          bucket: typeCard.bucket,
          format: input.format,
          size: input.size,
          pageLimit: input.pageCount,
          typography: {
            titleFont: defaultFont.name,
            bodyFont: defaultFont.name,
            baseFontSize: 16,
          },
          themeColor: typeCard.suggestedThemeColor,
        },
        draft: {
          title: safeDraft.title,
          coverPrompt: safeDraft.coverPrompt,
          pages: pagesWithImages,
          // Persist the book bible as a cast member so it survives into the
          // editor (CastEditor) and anchors any later image regeneration.
          character: safeGuide
            ? {
                name: safeGuide.name,
                lookDescription: characterLookDescription(safeGuide),
                anchorPrompt: safeGuide.appearance,
              }
            : null,
        },
      },
      { sessionId },
    );

    await trackCreation(sessionId);

    return apiSuccess({
      bookId: book.id,
      redirectUrl: `/create/book/${book.id}`,
      pagesGenerated: pagesWithImages.length,
      pagesWithImages: successfulImages,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
