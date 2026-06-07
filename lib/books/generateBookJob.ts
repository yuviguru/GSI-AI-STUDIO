/**
 * BOOK-008 — async book generation pipeline.
 *
 * Runs OUTSIDE the request (Netlify background function in prod, inline in dev),
 * so it has the 15-min budget the synchronous 26s route never did. It fills a
 * pending book shell: LLM draft → write text/pages → hero anchor → reference-
 * edited cover + pages (Qwen standard / Nano-Banana|GPT premium), retrying each
 * image, streaming progress into `generation.*`, then finalizing
 * complete/partial. On a hard failure (no draft) it refunds the kid.
 */

import { filterOutput, filterImagePrompt } from '@gsi/safety';
import { llmRouter } from '@gsi/ai/router';
import { getImageProvider, editImageWithReference, type ImageStyle } from '@gsi/ai/imageProvider';
import { dimsForBookAndLayout } from '@gsi/ai/imageDims';
import {
  BOOK_GENERATE_SYSTEM_PROMPT,
  buildBookGenerateUserMessage,
  buildPageImagePrompt,
  buildCoverImagePrompt,
  characterLookDescription,
  type BookCharacterGuide,
  type BookSceneType,
} from '@gsi/ai/prompts/bookGeneratePrompt';
import {
  writeGeneratedBookContent,
  setPageImage,
  setBookCoverImage,
  setBookAnchorImage,
  updateBookGeneration,
  finalizeBookGeneration,
} from '@gsi/firebase/bookService';
import { refundCredits } from '@/lib/billing/credits';
import { BOOK_FONTS, getBookTypeCard } from '@/lib/templates/bookTemplates';
import { sceneTypeToLayout } from '@/lib/books/sceneLayout';
import type { AiBookGenerateInput } from '@/lib/validators';

export interface BookGenerationJob {
  bookId: string;
  input: AiBookGenerateInput;
  scope: { sessionId: string; kidId: string | null };
  /** Total credits debited at enqueue — refunded if the draft never lands. */
  billedCredits: number;
}

// ── draft parsing (moved from the sync route) ───────────────────────
interface BookDraftResponse {
  title: string;
  coverPrompt: string;
  characterGuide: BookCharacterGuide | null;
  pages: Array<{ plainText: string; imagePrompt: string; emotion: string; sceneType?: BookSceneType }>;
}

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
function asStr(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  return '';
}
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
function extractHeroName(title: string | undefined, topic: string): string | null {
  const named = topic.match(/\bnamed\s+([A-Z][a-zA-Z]+)/);
  if (named?.[1]) return named[1];
  const fromTitle = title?.match(/\b([A-Z][a-z]{2,})\b/);
  if (fromTitle?.[1]) return fromTitle[1];
  const words = topic.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    const w = words[i]!.replace(/[^A-Za-z]/g, '');
    if (/^[A-Z][a-z]{2,}$/.test(w)) return w;
  }
  return null;
}
function fallbackCharacterGuide(input: { topic: string; title?: string }): BookCharacterGuide {
  return {
    name: extractHeroName(input.title, input.topic) ?? 'the hero',
    age: '',
    appearance: '',
    clothing: '',
    accessory: '',
    personality: '',
    colorTheme: '',
  };
}
function validateBookDraft(raw: unknown): BookDraftResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.title !== 'string' || typeof obj.coverPrompt !== 'string') return null;
  if (!Array.isArray(obj.pages) || obj.pages.length === 0) return null;
  const pages = obj.pages
    .filter((p): p is Record<string, unknown> => p !== null && typeof p === 'object')
    .map((p) => ({
      plainText: typeof p.plainText === 'string' ? p.plainText : '',
      imagePrompt: typeof p.imagePrompt === 'string' ? p.imagePrompt : '',
      emotion: asStr(p.emotion),
      sceneType: asSceneType(p.sceneType),
    }))
    .filter((p) => p.plainText.length > 0);
  if (pages.length === 0) return null;
  return {
    title: obj.title,
    coverPrompt: obj.coverPrompt,
    characterGuide: parseCharacterGuide(obj.characterGuide),
    pages,
  };
}

/** Retry an async op up to `attempts` times; returns null if all attempts fail
 *  (or return a falsy value). */
async function withRetry<T>(fn: () => Promise<T>, attempts: number, label: string): Promise<T | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const v = await fn();
      if (v) return v;
    } catch (err) {
      console.warn(
        `[generateBookJob] ${label} attempt ${i + 1}/${attempts} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return null;
}

/**
 * The full async pipeline. Mutates the pending book at `job.bookId` in place and
 * never throws (failures are recorded on `generation.status`).
 */
export async function generateBookJob(job: BookGenerationJob): Promise<void> {
  const { bookId, input, scope } = job;
  const typeCard = getBookTypeCard(input.type);
  const defaultFont = BOOK_FONTS[0]!;
  const setup = {
    title: input.title ?? 'My Book',
    author: input.author ?? 'Anonymous Author',
    type: input.type,
    bucket: typeCard?.bucket ?? 'narrative',
    format: input.format,
    size: input.size,
    pageLimit: input.pageCount,
    typography: { titleFont: defaultFont.name, bodyFont: defaultFont.name, baseFontSize: 16 },
    themeColor: typeCard?.suggestedThemeColor,
  };

  try {
    await updateBookGeneration(bookId, { status: 'generating', step: 'drafting' });

    // 1) LLM draft.
    let parsed: unknown;
    try {
      const res = await llmRouter.generateJsonWithMeta<unknown>({
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
      parsed = res.data;
    } catch (err) {
      console.warn('[generateBookJob] LLM draft failed:', err instanceof Error ? err.message : err);
    }
    const draft = validateBookDraft(parsed);
    if (!draft) {
      await finalizeBookGeneration(bookId, {
        failed: true,
        error: 'The story draft failed. Please try again.',
      });
      if (scope.kidId) {
        await refundCredits({
          kidId: scope.kidId,
          amount: job.billedCredits,
          feature: 'book.aiGenerate',
          reason: 'generation_failed_no_draft',
        }).catch(() => {});
      }
      return;
    }

    // Character anchor (fallback when the model omits one) + safety-filter.
    const rawGuide = draft.characterGuide ?? fallbackCharacterGuide({ topic: input.topic, title: input.title });
    const safeField = (v: string, fn: (s: string) => string): string => (v ? fn(v) : '');
    const safeGuide: BookCharacterGuide = {
      name: safeField(rawGuide.name, filterOutput) || 'the hero',
      age: rawGuide.age,
      appearance: safeField(rawGuide.appearance, filterImagePrompt),
      clothing: safeField(rawGuide.clothing, filterImagePrompt),
      accessory: safeField(rawGuide.accessory, filterImagePrompt),
      personality: safeField(rawGuide.personality, filterOutput),
      colorTheme: safeField(rawGuide.colorTheme, filterImagePrompt),
    };

    const seed = Math.floor(Math.random() * 2_147_483_647);
    const coverPrompt = buildCoverImagePrompt({
      coverPrompt: filterImagePrompt(draft.coverPrompt),
      guide: safeGuide,
      age: input.age,
    });
    const pages = draft.pages.map((p, i) => ({
      plainText: filterOutput(p.plainText),
      imagePrompt: buildPageImagePrompt({
        scenePrompt: filterImagePrompt(p.imagePrompt),
        emotion: p.emotion || undefined,
        guide: safeGuide,
        age: input.age,
      }),
      layout: sceneTypeToLayout(p.sceneType, input.size, i),
    }));
    const title = filterOutput(draft.title);

    // 2) Write the draft onto the shell (pages get text + prompts; images null).
    const { pageIds } = await writeGeneratedBookContent(
      bookId,
      setup,
      {
        title,
        coverPrompt,
        imageSeed: seed,
        character: {
          name: safeGuide.name,
          lookDescription: characterLookDescription(safeGuide),
          anchorPrompt: safeGuide.appearance,
        },
        pages,
      },
      scope,
    );

    // 3) Hero anchor portrait (txt2img) — the reference every page is edited against.
    await updateBookGeneration(bookId, { step: 'anchor' });
    const { imageFunction } = getImageProvider();
    const style: ImageStyle = 'cartoon';
    const dims = dimsForBookAndLayout(input.size);
    const anchorPrompt = buildPageImagePrompt({
      scenePrompt: `full-body character reference of ${safeGuide.name}, standing front view, friendly expression, on a plain soft pastel studio background, clean character model sheet, single character only`,
      guide: safeGuide,
      age: input.age,
    });
    const anchorImageUrl = await withRetry(
      () => imageFunction({ prompt: anchorPrompt, style, width: dims.width, height: dims.height, seed }),
      3,
      'anchor',
    );
    if (anchorImageUrl) await setBookAnchorImage(bookId, anchorImageUrl);

    // 4) Reference-edit the cover + each page; stream results in as they land.
    await updateBookGeneration(bookId, { step: 'images' });
    const isPremium = input.quality === 'premium';
    const preferProviders = isPremium ? ['nano-banana', 'gpt-image'] : ['pixazo-qwen-edit'];
    const maxCostTier: 'cheap' | 'premium' = isPremium ? 'premium' : 'cheap';

    const renderScene = async (scenePrompt: string): Promise<string | null> => {
      if (anchorImageUrl) {
        const ref = anchorImageUrl;
        const edited = await withRetry(
          async () => {
            const { url } = await editImageWithReference({
              prompt: scenePrompt,
              referenceImageUrl: ref,
              width: dims.width,
              height: dims.height,
              style,
              preferProviders,
              maxCostTier,
            });
            return url;
          },
          3,
          'reference-edit',
        );
        if (edited) return edited;
      }
      return withRetry(
        () => imageFunction({ prompt: scenePrompt, style, width: dims.width, height: dims.height, seed }),
        2,
        'txt2img',
      );
    };

    let pagesRendered = 0;
    const coverWork = renderScene(coverPrompt).then(async (url) => {
      if (url) await setBookCoverImage(bookId, url);
    });
    const pageWork = pages.map((p, i) =>
      renderScene(p.imagePrompt).then(async (url) => {
        if (url) {
          await setPageImage(bookId, pageIds[i]!, url);
          pagesRendered += 1;
          await updateBookGeneration(bookId, { pagesRendered });
        }
      }),
    );
    await Promise.all([coverWork, ...pageWork]);

    // 5) Finalize → complete (everything rendered) or partial (some null).
    await finalizeBookGeneration(bookId);
  } catch (err) {
    console.error('[generateBookJob] unexpected failure:', err);
    await finalizeBookGeneration(bookId, {
      failed: true,
      error: 'Something went wrong while making your book.',
    }).catch(() => {});
  }
}
