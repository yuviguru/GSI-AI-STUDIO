import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import {
  BOOK_SIZES,
  FREE_TIER_PAGE_LIMIT,
  PAID_TIER_PAGE_MAX,
  isValidTypeBucket,
  isLayoutAllowedForBucket,
} from '@/lib/templates/bookTemplates';
import { nanoid } from 'nanoid';
import type {
  Book,
  BookAuthorship,
  BookBackCover,
  BookCharacter,
  BookCover,
  BookGeneration,
  BookGenerationStatus,
  BookGenerationStep,
  BookGenerationSummary,
  BookInitialSource,
  BookListItem,
  BookPage,
  BookPlot,
  BookSales,
  BookStatus,
  EffortBadge,
  PageAuthorship,
  PageLayout,
  TipTapDocument,
} from '@gsi/types';
import type {
  AiBookGenerateInput,
  BookCreateInput,
  BookPatchInput,
  CharacterCreateInput,
  CharacterPatchInput,
  CoverPatchInput,
  PageCreateInput,
  PagePatchInput,
  PageReorderInput,
  SalesConfigPatchInput,
} from '@/lib/validators';
import {
  aggregateBookAuthorship,
  recomputePageAuthorship,
} from './bookAuthorship';
import { computeEffortBadge } from '@/lib/books/effortBadge';

const BOOKS_COLLECTION = 'books';
const PAGES_SUBCOLLECTION = 'pages';
const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 50;

/** Recursively strip `undefined` values so Firestore never rejects the write. */
function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined) as unknown as T;
  if (obj instanceof Timestamp) return obj;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value !== undefined) cleaned[key] = stripUndefined(value);
  }
  return cleaned as T;
}

/** Owner scope. Books are owned DURABLY by the kid (or, for true anonymous
 *  sessions, by the session that created them). `kidId` may be absent in the
 *  scope passed by routes — it's recovered from the session id when needed. */
export interface OwnerScope {
  sessionId: string;
  userId?: string | null;
  kidId?: string | null;
}

/**
 * Durable owner key for a scope. A kid's session id encodes the kid
 * (`kid-<kidId>-<dayKey>`), so we can recover the owning kid even when a route
 * only put the session id in scope. Returns null for true anonymous sessions
 * (a random UUID), which stay session-scoped.
 *
 * This is the fix for the "lost books" bug: the kid session id rolls over every
 * calendar day, so listing/owning by session id hid every book not created
 * today. Listing/owning by kidId makes a kid's books durable across days and
 * sign-outs.
 */
export function effectiveKidId(scope: OwnerScope): string | null {
  if (scope.kidId) return scope.kidId;
  const sid = scope.sessionId ?? '';
  if (sid.startsWith('kid-')) {
    // `kid-<kidId>-<YYYY-MM-DD>` — the kidId is a dash-free Firestore doc id.
    const kid = sid.split('-')[1];
    return kid && kid.length > 0 ? kid : null;
  }
  return null;
}

/**
 * True if `scope` owns `book`. Kid ownership is durable (matched on kidId across
 * every daily session); anonymous/legacy books with no kidId fall back to the
 * session that created them.
 */
export function ownsBook(
  book: { sessionId?: string; kidId?: string | null },
  scope: OwnerScope,
): boolean {
  const kid = effectiveKidId(scope);
  if (kid && book.kidId && book.kidId === kid) return true;
  return !!book.sessionId && book.sessionId === scope.sessionId;
}

export interface ListBooksFilters {
  status?: BookStatus;
  limit?: number;
  cursor?: string;
}

export interface ListBooksResult {
  items: BookListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Default cover seed when wizard doesn't provide one. */
function defaultCover(input: BookCreateInput): BookCover {
  return {
    title: input.title,
    subtitle: '',
    authorName: input.author,
    backgroundColor: input.themeColor ?? '#5B5FFF',
    imageUrl: null,
    imagePrompt: null,
    font: input.typography.titleFont,
  };
}

/** Convert plot from Firestore. Returns null if the field is missing or empty. */
/** Normalize a Firestore back-cover map into a runtime BookBackCover.
 *  Handles old books that predate authorBio/authorPhotoUrl by defaulting
 *  them to null so the Book type stays consistent. */
function reviveBackCover(raw: unknown): BookBackCover | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return {
    text: typeof r.text === 'string' ? r.text : '',
    imageUrl: typeof r.imageUrl === 'string' ? r.imageUrl : null,
    authorBio: typeof r.authorBio === 'string' ? r.authorBio : null,
    authorPhotoUrl: typeof r.authorPhotoUrl === 'string' ? r.authorPhotoUrl : null,
  };
}

function revivePlot(raw: unknown): BookPlot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const plot: BookPlot = {
    idea: typeof r.idea === 'string' ? r.idea : '',
    beginning: typeof r.beginning === 'string' ? r.beginning : '',
    problem: typeof r.problem === 'string' ? r.problem : '',
    adventure: typeof r.adventure === 'string' ? r.adventure : '',
    ending: typeof r.ending === 'string' ? r.ending : '',
  };
  // Treat all-empty as no-plot — keeps the editor sidebar quiet for non-plot books
  const allEmpty =
    !plot.idea && !plot.beginning && !plot.problem && !plot.adventure && !plot.ending;
  return allEmpty ? null : plot;
}

/** Convert character data from Firestore (timestamps -> Date). */
function reviveCharacters(raw: unknown): BookCharacter[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is Record<string, unknown> => c !== null && typeof c === 'object')
    .map((c) => {
      const createdAtRaw = c.createdAt;
      let createdAt: Date;
      if (createdAtRaw instanceof Timestamp) {
        createdAt = createdAtRaw.toDate();
      } else if (createdAtRaw instanceof Date) {
        createdAt = createdAtRaw;
      } else if (typeof createdAtRaw === 'string') {
        createdAt = new Date(createdAtRaw);
      } else {
        createdAt = new Date();
      }
      return {
        id: String(c.id ?? ''),
        name: String(c.name ?? ''),
        lookDescription: String(c.lookDescription ?? ''),
        anchorImageUrl: (c.anchorImageUrl as string | null | undefined) ?? null,
        anchorPrompt: (c.anchorPrompt as string | null | undefined) ?? null,
        createdAt,
      };
    });
}

/** Revive a stored authorship blob into a strongly-typed PageAuthorship. */
function revivePageAuthorship(raw: unknown): PageAuthorship | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const lastEditedRaw = r.lastEditedAt;
  let lastEditedAt: Date;
  if (lastEditedRaw instanceof Timestamp) lastEditedAt = lastEditedRaw.toDate();
  else if (lastEditedRaw instanceof Date) lastEditedAt = lastEditedRaw;
  else lastEditedAt = new Date();
  const source = (r.source === 'ai_generated' || r.source === 'kid_written' || r.source === 'mixed')
    ? r.source
    : 'kid_written';
  const imageSource = (r.imageSource === 'ai_generated' || r.imageSource === 'kid_added' || r.imageSource === 'none')
    ? r.imageSource
    : 'none';
  return {
    source,
    originalAiText: typeof r.originalAiText === 'string' ? r.originalAiText : '',
    aiCharCount: typeof r.aiCharCount === 'number' ? r.aiCharCount : 0,
    kidCharCount: typeof r.kidCharCount === 'number' ? r.kidCharCount : 0,
    imageSource,
    lastEditedAt,
  };
}

function reviveBookAuthorship(raw: unknown): BookAuthorship | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const initialSource = (r.initialSource === 'ai_generated' || r.initialSource === 'wizard_seeded')
    ? r.initialSource
    : 'wizard_blank';
  const updatedAtRaw = r.updatedAt;
  let updatedAt: Date;
  if (updatedAtRaw instanceof Timestamp) updatedAt = updatedAtRaw.toDate();
  else if (updatedAtRaw instanceof Date) updatedAt = updatedAtRaw;
  else updatedAt = new Date();
  return {
    initialSource,
    aiCharTotal: typeof r.aiCharTotal === 'number' ? r.aiCharTotal : 0,
    kidCharTotal: typeof r.kidCharTotal === 'number' ? r.kidCharTotal : 0,
    aiImagePageCount: typeof r.aiImagePageCount === 'number' ? r.aiImagePageCount : 0,
    kidImagePageCount: typeof r.kidImagePageCount === 'number' ? r.kidImagePageCount : 0,
    updatedAt,
  };
}

function reviveEffortBadge(raw: unknown): EffortBadge | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const validKeys = ['pure_imagination', 'co_author', 'ai_sidekick', 'ai_generated'] as const;
  if (typeof r.key !== 'string' || !validKeys.includes(r.key as typeof validKeys[number])) return null;
  const awardedRaw = r.awardedAt;
  let awardedAt: Date;
  if (awardedRaw instanceof Timestamp) awardedAt = awardedRaw.toDate();
  else if (awardedRaw instanceof Date) awardedAt = awardedRaw;
  else awardedAt = new Date();
  const breakdown = (r.breakdown && typeof r.breakdown === 'object')
    ? r.breakdown as Record<string, unknown>
    : {};
  return {
    key: r.key as EffortBadge['key'],
    aiPercentage: typeof r.aiPercentage === 'number' ? r.aiPercentage : 0,
    awardedAt,
    breakdown: {
      aiCharTotal: typeof breakdown.aiCharTotal === 'number' ? breakdown.aiCharTotal : 0,
      kidCharTotal: typeof breakdown.kidCharTotal === 'number' ? breakdown.kidCharTotal : 0,
      aiImagePageCount: typeof breakdown.aiImagePageCount === 'number' ? breakdown.aiImagePageCount : 0,
      kidImagePageCount: typeof breakdown.kidImagePageCount === 'number' ? breakdown.kidImagePageCount : 0,
    },
  };
}

function reviveSales(raw: unknown): BookSales | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const listedRaw = r.listedAt;
  let listedAt: Date | null = null;
  if (listedRaw instanceof Timestamp) listedAt = listedRaw.toDate();
  else if (listedRaw instanceof Date) listedAt = listedRaw;
  return {
    enabled: r.enabled === true,
    priceInr: typeof r.priceInr === 'number' ? r.priceInr : null,
    listedAt,
  };
}

/** Convert a Firestore document snapshot into a Book object. */
function docToBook(doc: FirebaseFirestore.DocumentSnapshot): Book {
  const data = doc.data();
  if (!data) {
    throw new AppException('NOT_FOUND', 'Book not found', 404);
  }
  return {
    id: doc.id,
    title: data.title,
    author: data.author,
    status: data.status,
    type: data.type,
    bucket: data.bucket,
    format: data.format,
    size: data.size,
    dimensions: data.dimensions,
    typography: data.typography,
    cover: data.cover,
    backCover: reviveBackCover(data.backCover),
    characters: reviveCharacters(data.characters),
    plot: revivePlot(data.plot),
    pageCount: data.pageCount ?? 0,
    pageLimit: data.pageLimit,
    themeColor: data.themeColor ?? null,
    imageSeed: data.imageSeed ?? null,
    sessionId: data.sessionId,
    userId: data.userId ?? null,
    kidId: data.kidId ?? null,
    coverThumbnail: data.coverThumbnail ?? null,
    isPublic: data.isPublic ?? false,
    publishedAt: data.publishedAt ? data.publishedAt.toDate() : null,
    pdfUrl: data.pdfUrl ?? null,
    printOrderEligible: data.printOrderEligible ?? false,
    shareUrl: data.shareUrl ?? null,
    authorship: reviveBookAuthorship(data.authorship),
    effortBadge: reviveEffortBadge(data.effortBadge),
    sales: reviveSales(data.sales),
    generation: reviveGeneration(data.generation),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  };
}

/** Convert a Firestore page document snapshot into a BookPage object. */
function docToPage(doc: FirebaseFirestore.DocumentSnapshot): BookPage {
  const data = doc.data();
  if (!data) {
    throw new AppException('NOT_FOUND', 'Page not found', 404);
  }
  return {
    id: doc.id,
    pageNumber: data.pageNumber,
    layout: data.layout,
    richText: (data.richText as TipTapDocument | null) ?? null,
    plainText: data.plainText ?? '',
    imageUrl: data.imageUrl ?? null,
    imagePrompt: data.imagePrompt ?? null,
    imageStyle: data.imageStyle ?? null,
    imageHistory: (data.imageHistory as string[] | undefined) ?? [],
    voiceTranscriptRaw: data.voiceTranscriptRaw ?? null,
    grammarSuggestions: data.grammarSuggestions ?? [],
    style: data.style ?? null,
    authorship: revivePageAuthorship(data.authorship),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  };
}

/** Reduce a Book to a BookListItem for fast library listing. */
function toListItem(book: Book): BookListItem {
  return {
    id: book.id,
    title: book.title,
    type: book.type,
    size: book.size,
    pageCount: book.pageCount,
    pageLimit: book.pageLimit,
    status: book.status,
    coverThumbnail: book.coverThumbnail,
    effortBadge: book.effortBadge,
    sales: book.sales,
    generation: book.generation
      ? {
          status: book.generation.status,
          step: book.generation.step,
          pagesTotal: book.generation.pagesTotal,
          pagesRendered: book.generation.pagesRendered,
        }
      : null,
    updatedAt: book.updatedAt,
  };
}

/** Revive the `generation` sub-doc (BOOK-008). Returns null for non-AI books. */
function reviveGeneration(data: unknown): BookGeneration | null {
  if (!data || typeof data !== 'object') return null;
  const g = data as Record<string, unknown>;
  if (typeof g.status !== 'string') return null;
  const toDate = (v: unknown): Date | null =>
    v && typeof v === 'object' && typeof (v as { toDate?: unknown }).toDate === 'function'
      ? (v as { toDate: () => Date }).toDate()
      : null;
  return {
    status: g.status as BookGenerationStatus,
    step: (typeof g.step === 'string' ? g.step : 'queued') as BookGenerationStep,
    pagesTotal: typeof g.pagesTotal === 'number' ? g.pagesTotal : 0,
    pagesRendered: typeof g.pagesRendered === 'number' ? g.pagesRendered : 0,
    coverRendered: !!g.coverRendered,
    anchorRendered: !!g.anchorRendered,
    attempts: typeof g.attempts === 'number' ? g.attempts : 0,
    error: typeof g.error === 'string' ? g.error : null,
    startedAt: toDate(g.startedAt) ?? new Date(0),
    finishedAt: toDate(g.finishedAt),
  };
}

/** Default empty authorship for a brand-new kid-written page. */
function defaultKidAuthorship(now: Date): PageAuthorship {
  return {
    source: 'kid_written',
    originalAiText: '',
    aiCharCount: 0,
    kidCharCount: 0,
    imageSource: 'none',
    lastEditedAt: now,
  };
}

/** Default empty book-level authorship for a wizard-blank book. */
function defaultBookAuthorship(
  initialSource: BookInitialSource,
  now: Date,
): BookAuthorship {
  return {
    initialSource,
    aiCharTotal: 0,
    kidCharTotal: 0,
    aiImagePageCount: 0,
    kidImagePageCount: 0,
    updatedAt: now,
  };
}

/** Convert page authorship to a Firestore-storable shape (Date → Timestamp). */
function authorshipToStored(a: PageAuthorship): Record<string, unknown> {
  return {
    source: a.source,
    originalAiText: a.originalAiText,
    aiCharCount: a.aiCharCount,
    kidCharCount: a.kidCharCount,
    imageSource: a.imageSource,
    lastEditedAt: Timestamp.fromDate(a.lastEditedAt),
  };
}

/** Convert book authorship to a Firestore-storable shape. */
function bookAuthorshipToStored(a: BookAuthorship): Record<string, unknown> {
  return {
    initialSource: a.initialSource,
    aiCharTotal: a.aiCharTotal,
    kidCharTotal: a.kidCharTotal,
    aiImagePageCount: a.aiImagePageCount,
    kidImagePageCount: a.kidImagePageCount,
    updatedAt: Timestamp.fromDate(a.updatedAt),
  };
}

/** Validate the wizard input combo before persisting. */
function validateCreateInput(input: BookCreateInput): void {
  if (!isValidTypeBucket(input.type, input.bucket)) {
    throw new AppException(
      'INVALID_INPUT',
      `Type '${input.type}' does not belong to bucket '${input.bucket}'`,
      400
    );
  }
  if (input.pageLimit > PAID_TIER_PAGE_MAX) {
    throw new AppException(
      'INVALID_INPUT',
      `pageLimit cannot exceed ${PAID_TIER_PAGE_MAX}`,
      400
    );
  }
}

/** Throw if pageLimit exceeds the caller's tier. P1 = always free. */
function enforceTierLimit(pageLimit: number, tier: 'free' | 'paid'): void {
  if (tier === 'free' && pageLimit > FREE_TIER_PAGE_LIMIT) {
    throw new AppException(
      'PAGE_LIMIT_EXCEEDS_TIER',
      `Free tier is limited to ${FREE_TIER_PAGE_LIMIT} pages. Upgrade for longer books!`,
      400
    );
  }
}

/**
 * Create a new book document. Initial pageCount=0, status=draft.
 * Wizard fields (type, bucket, format, size) are validated for consistency.
 */
export async function createBook(
  input: BookCreateInput,
  scope: OwnerScope,
  tier: 'free' | 'paid' = 'free'
): Promise<Book> {
  validateCreateInput(input);
  enforceTierLimit(input.pageLimit, tier);

  const dimensions = BOOK_SIZES[input.size];
  const docRef = adminDb.collection(BOOKS_COLLECTION).doc();
  const id = docRef.id;
  const now = Timestamp.now();

  // Build initial character list from wizard input, if present
  const initialCharacters: BookCharacter[] = (input.characters ?? []).map((c) => ({
    id: nanoid(10),
    name: c.name,
    lookDescription: c.lookDescription,
    anchorImageUrl: c.anchorImageUrl ?? null,
    anchorPrompt: c.anchorPrompt ?? null,
    createdAt: new Date(),
  }));

  const bookDoc = {
    id,
    title: input.title,
    author: input.author,
    status: 'draft' as BookStatus,
    type: input.type,
    bucket: input.bucket,
    format: input.format,
    size: input.size,
    dimensions: {
      widthMm: dimensions.widthMm,
      heightMm: dimensions.heightMm,
      widthPx: dimensions.widthPx,
      heightPx: dimensions.heightPx,
    },
    typography: input.typography,
    cover: defaultCover(input),
    backCover: null,
    characters: initialCharacters.map(charToStored),
    plot: input.plot
      ? {
          idea: input.plot.idea,
          beginning: input.plot.beginning,
          problem: input.plot.problem,
          adventure: input.plot.adventure,
          ending: input.plot.ending,
        }
      : null,
    pageCount: 0,
    pageLimit: input.pageLimit,
    themeColor: input.themeColor ?? null,
    sessionId: scope.sessionId,
    userId: scope.userId ?? null,
    kidId: scope.kidId ?? null,
    coverThumbnail: null,
    isPublic: false,
    publishedAt: null,
    pdfUrl: null,
    printOrderEligible: false,
    shareUrl: null,
    // BOOK-002 authorship — wizard-seeded if plot/characters/title were
    // supplied, otherwise wizard_blank. AI-generated path uses
    // `createGeneratedBook` which sets initialSource: 'ai_generated'.
    authorship: bookAuthorshipToStored(
      defaultBookAuthorship(
        input.plot || (input.characters && input.characters.length > 0)
          ? 'wizard_seeded'
          : 'wizard_blank',
        now.toDate(),
      ),
    ),
    effortBadge: null,
    sales: null,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(stripUndefined(bookDoc));
  const snapshot = await docRef.get();
  return docToBook(snapshot);
}

/** Throw NOT_FOUND if book doesn't exist or doesn't belong to scope. */
async function loadOwnedBook(id: string, scope: OwnerScope): Promise<{
  ref: FirebaseFirestore.DocumentReference;
  book: Book;
}> {
  const ref = adminDb.collection(BOOKS_COLLECTION).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new AppException('NOT_FOUND', 'Book not found', 404);
  }
  const book = docToBook(snapshot);
  if (!ownsBook(book, scope)) {
    throw new AppException('NOT_FOUND', 'Book not found', 404);
  }
  return { ref, book };
}

/** Fetch a single book + all its pages (ordered by pageNumber). */
export async function getBook(
  id: string,
  scope: OwnerScope
): Promise<{ book: Book; pages: BookPage[] }> {
  const { ref, book } = await loadOwnedBook(id, scope);
  const pagesSnap = await ref.collection(PAGES_SUBCOLLECTION).orderBy('pageNumber', 'asc').get();
  const pages = pagesSnap.docs.map(docToPage);
  return { book, pages };
}

/** List books for the current scope. Cursor on `updatedAt`. */
export async function listBooks(
  scope: OwnerScope,
  filters: ListBooksFilters = {}
): Promise<ListBooksResult> {
  const limit = Math.min(filters.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);
  const kid = effectiveKidId(scope);

  // ── Durable kid-scoped listing ──────────────────────────────────────────
  // The kid's session id rolls over every calendar day, so a session-scoped
  // query hides every book not created today. Books carry `kidId`, so we list
  // by it. Fetch-all + in-memory sort/paginate keeps this index-free (a single
  // kidId equality needs no composite index) and a kid's book count is small.
  if (kid) {
    const kidSnap = await adminDb
      .collection(BOOKS_COLLECTION)
      .where('kidId', '==', kid)
      .get();
    let books = kidSnap.docs.map(docToBook);
    if (filters.status) books = books.filter((b) => b.status === filters.status);
    books.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    if (filters.cursor) {
      const cursorMs = new Date(filters.cursor).getTime();
      if (!Number.isNaN(cursorMs)) books = books.filter((b) => b.updatedAt.getTime() < cursorMs);
    }
    const page = books.slice(0, limit);
    const items = page.map(toListItem);
    const hasMore = books.length > limit;
    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1]!.updatedAt.toISOString() : null;
    return { items, nextCursor, hasMore };
  }

  // ── Anonymous / legacy session-scoped path (uses the existing index) ─────
  let query = adminDb
    .collection(BOOKS_COLLECTION)
    .where('sessionId', '==', scope.sessionId)
    .orderBy('updatedAt', 'desc')
    .limit(limit + 1); // Fetch one extra to detect hasMore

  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }

  if (filters.cursor) {
    const cursorDate = new Date(filters.cursor);
    if (!isNaN(cursorDate.getTime())) {
      query = query.startAfter(Timestamp.fromDate(cursorDate));
    }
  }

  const snap = await query.get();
  const docs = snap.docs;
  const hasMore = docs.length > limit;
  const items = docs.slice(0, limit).map(docToBook).map(toListItem);
  const nextCursor =
    hasMore && items.length > 0 ? items[items.length - 1]!.updatedAt.toISOString() : null;

  return { items, nextCursor, hasMore };
}

/**
 * Update book metadata. Server enforces locked fields — Zod's `.strict()` on
 * `bookPatchSchema` already rejects size/format/bucket/dimensions, but we
 * also defend at the service layer as belt-and-suspenders.
 */
export async function updateBook(
  id: string,
  patch: BookPatchInput,
  scope: OwnerScope
): Promise<Book> {
  // Truly locked at creation — never editable from the editor (re-flow problem)
  const lockedKeys = ['size', 'bucket', 'type', 'dimensions', 'sessionId'];
  for (const key of lockedKeys) {
    if (key in patch) {
      throw new AppException(
        'LOCKED_FIELD',
        `Field '${key}' cannot be changed after book creation`,
        400
      );
    }
  }

  const { ref } = await loadOwnedBook(id, scope);
  const updates: Record<string, unknown> = {
    ...patch,
    updatedAt: Timestamp.now(),
  };

  // Cover patches replace the whole cover map for simplicity — wizard already populates defaults.
  if (patch.cover) {
    updates.cover = patch.cover;
    updates.coverThumbnail = null; // Invalidate cached thumbnail
  }

  await ref.update(stripUndefined(updates));
  const snapshot = await ref.get();
  return docToBook(snapshot);
}

/** Delete a book + cascade to all pages. */
export async function deleteBook(id: string, scope: OwnerScope): Promise<void> {
  const { ref } = await loadOwnedBook(id, scope);
  const pagesSnap = await ref.collection(PAGES_SUBCOLLECTION).get();
  const batch = adminDb.batch();
  for (const pageDoc of pagesSnap.docs) {
    batch.delete(pageDoc.ref);
  }
  batch.delete(ref);
  await batch.commit();
}

/**
 * Append a new page to a book. Transactionally enforces pageCount < pageLimit.
 * Returns the new page document and the updated book pageCount.
 */
export async function appendPage(
  bookId: string,
  input: PageCreateInput,
  scope: OwnerScope
): Promise<{ page: BookPage; pageNumber: number }> {
  const bookRef = adminDb.collection(BOOKS_COLLECTION).doc(bookId);

  // Pre-flight ownership check (transactions can't read-then-throw cleanly with our error model)
  const preSnap = await bookRef.get();
  if (!preSnap.exists) {
    throw new AppException('NOT_FOUND', 'Book not found', 404);
  }
  const preBook = docToBook(preSnap);
  if (!ownsBook(preBook, scope)) {
    throw new AppException('NOT_FOUND', 'Book not found', 404);
  }
  if (!isLayoutAllowedForBucket(input.layout, preBook.bucket)) {
    throw new AppException(
      'INVALID_INPUT',
      `Layout '${input.layout}' is not allowed for bucket '${preBook.bucket}'`,
      400
    );
  }

  const newPageRef = bookRef.collection(PAGES_SUBCOLLECTION).doc();

  const result = await adminDb.runTransaction(async (tx) => {
    const fresh = await tx.get(bookRef);
    if (!fresh.exists) {
      throw new AppException('NOT_FOUND', 'Book not found', 404);
    }
    const book = docToBook(fresh);
    if (book.pageCount >= book.pageLimit) {
      throw new AppException(
        'PAGE_LIMIT_REACHED',
        `You've filled up your ${book.pageLimit}-page book! Upgrade for longer books.`,
        400
      );
    }

    const pageNumber = book.pageCount + 1;
    const now = Timestamp.now();
    const pageDoc = {
      id: newPageRef.id,
      pageNumber,
      layout: input.layout as PageLayout,
      richText: input.richText ?? null,
      plainText: '',
      imageUrl: null,
      imagePrompt: input.imagePrompt ?? null,
      imageStyle: null,
      voiceTranscriptRaw: null,
      grammarSuggestions: [],
      style: null,
      // BOOK-002 — pages added via the manual editor default to kid-written.
      authorship: authorshipToStored(defaultKidAuthorship(now.toDate())),
      createdAt: now,
      updatedAt: now,
    };

    tx.set(newPageRef, stripUndefined(pageDoc));
    tx.update(bookRef, {
      pageCount: FieldValue.increment(1),
      updatedAt: now,
    });

    return { pageNumber, pageId: newPageRef.id };
  });

  const finalSnap = await newPageRef.get();
  return { page: docToPage(finalSnap), pageNumber: result.pageNumber };
}

/** Best-effort plainText derivation from a TipTap document JSON. Accepts unknown
 *  because callers receive richText from Zod as a record (or untyped JSON). */
function plainTextFromTipTap(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return '';
  const content = (doc as { content?: unknown }).content;
  if (!Array.isArray(content)) return '';
  const out: string[] = [];
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if (typeof n.text === 'string') out.push(n.text);
    if (Array.isArray(n.content)) {
      for (const child of n.content) visit(child);
    }
  };
  for (const node of content) visit(node);
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Update a page. Auto-derives plainText from richText if richText changes
 * and plainText isn't explicitly provided.
 */
export async function updatePage(
  bookId: string,
  pageId: string,
  patch: PagePatchInput,
  scope: OwnerScope
): Promise<BookPage> {
  const { ref: bookRef, book } = await loadOwnedBook(bookId, scope);
  if (patch.layout && !isLayoutAllowedForBucket(patch.layout, book.bucket)) {
    throw new AppException(
      'INVALID_INPUT',
      `Layout '${patch.layout}' is not allowed for bucket '${book.bucket}'`,
      400
    );
  }

  const pageRef = bookRef.collection(PAGES_SUBCOLLECTION).doc(pageId);
  const pageSnap = await pageRef.get();
  if (!pageSnap.exists) {
    throw new AppException('NOT_FOUND', 'Page not found', 404);
  }

  const now = Timestamp.now();
  const existingPage = docToPage(pageSnap);
  const updates: Record<string, unknown> = {
    ...patch,
    updatedAt: now,
  };

  // Auto-derive plainText if richText is being patched but plainText isn't
  if (patch.richText && patch.plainText === undefined) {
    updates.plainText = plainTextFromTipTap(patch.richText);
  }

  // BOOK-002 — when text changes, recompute the page's authorship via LCS
  // and the book's denormalized authorship summary. Image source updates
  // are explicit (caller passes imageUrl change and we infer kid_added).
  const newPlainText = typeof updates.plainText === 'string'
    ? updates.plainText
    : existingPage.plainText;
  const imageDidChange = patch.imageUrl !== undefined;
  let newImageSource = existingPage.authorship?.imageSource ?? 'none';
  if (imageDidChange) {
    // Heuristic: any direct PATCH to imageUrl from the editor is treated as
    // a kid-curated change (kid added it, swapped it, or cleared it).
    // AI-generated images are set via the bulk createGeneratedBook write
    // and never PATCH'd directly. Clearing → 'none'.
    newImageSource = patch.imageUrl ? 'kid_added' : 'none';

    // BOOK-009 — never lose a generated picture. Remember every distinct image
    // the page has shown (the one leaving + the one arriving) so the kid can
    // bring any of them back from the editor's "Your pictures" gallery, even
    // after switching to a plain colour. Capped to keep the doc small.
    const history = [...(existingPage.imageHistory ?? [])];
    const remember = (url: string | null | undefined) => {
      if (url && !history.includes(url)) history.push(url);
    };
    remember(existingPage.imageUrl);
    remember(patch.imageUrl ?? null);
    updates.imageHistory = history.slice(-16);
  }

  const newAuthorship = recomputePageAuthorship({
    existing: existingPage.authorship,
    newPlainText,
    now: now.toDate(),
    imageSource: newImageSource,
  });
  updates.authorship = authorshipToStored(newAuthorship);

  await pageRef.update(stripUndefined(updates));

  // Recompute the book-level authorship summary from all pages.
  // For N typical book sizes (5-40 pages) this is one Firestore range read
  // — cheaper than maintaining per-field increments and risking drift.
  const allPagesSnap = await bookRef
    .collection(PAGES_SUBCOLLECTION)
    .orderBy('pageNumber', 'asc')
    .get();
  const pagesWithAuthorship = allPagesSnap.docs.map((d) => ({
    authorship: revivePageAuthorship(d.data().authorship),
  }));
  const bookAuthorshipSummary = aggregateBookAuthorship({
    pages: pagesWithAuthorship,
    initialSource: book.authorship?.initialSource ?? 'wizard_blank',
    now: now.toDate(),
  });
  await bookRef.update({
    authorship: bookAuthorshipToStored(bookAuthorshipSummary),
    updatedAt: now,
  });

  const finalSnap = await pageRef.get();
  return docToPage(finalSnap);
}

// ── AI generation (BOOK-002) ────────────────────────────────────

export interface CreateGeneratedBookInput {
  /** Wizard-style fields needed to set up the book shell. */
  setup: Omit<BookCreateInput, 'characters' | 'plot'>;
  /** The AI's draft. */
  draft: {
    title: string;
    coverPrompt: string;
    /** Resolved cover image URL — null if cover generation failed or wasn't
     *  attempted. The AI flow now drafts the cover too (BOOK-002). */
    coverImageUrl?: string | null;
    /** Image seed shared by the cover + every page image, persisted on the
     *  book so later per-page regeneration can stay on-model. */
    imageSeed?: number | null;
    pages: Array<{
      plainText: string;
      imagePrompt: string;
      /** Resolved image URL — null if the cascade failed for this page. */
      imageUrl: string | null;
      /** Per-page layout (hybrid-by-scene-type). Validated against the
       *  book's bucket; falls back to the bucket default if not allowed. */
      layout?: PageLayout;
    }>;
    /** Optional "book bible" hero, persisted as a BookCharacter so it shows
     *  in the cast editor and anchors later image regeneration. */
    character?: {
      name: string;
      lookDescription: string;
      anchorPrompt: string;
      /** Clean hero portrait the pages were reference-edited against (BOOK
       *  consistency). Becomes the cast member's anchor image. */
      anchorImageUrl?: string | null;
    } | null;
  };
}

/**
 * Atomically create a Book + N pages from an AI draft (BOOK-002).
 *
 * Every page is stamped with `authorship.source = 'ai_generated'` and the
 * book carries `authorship.initialSource = 'ai_generated'`. Per-page LCS
 * recompute on subsequent edits decays the AI share honestly toward the
 * kid's badge bucket (BOOK-003).
 */
export async function createGeneratedBook(
  input: CreateGeneratedBookInput,
  scope: OwnerScope,
  tier: 'free' | 'paid' = 'free',
): Promise<Book> {
  const { setup, draft } = input;
  validateCreateInput({ ...setup, title: draft.title } as BookCreateInput);
  enforceTierLimit(setup.pageLimit, tier);
  if (draft.pages.length === 0) {
    throw new AppException('INVALID_INPUT', 'Generated draft has no pages', 400);
  }
  if (draft.pages.length > setup.pageLimit) {
    throw new AppException(
      'INVALID_INPUT',
      `Draft has ${draft.pages.length} pages but limit is ${setup.pageLimit}`,
      400,
    );
  }

  const dimensions = BOOK_SIZES[setup.size];
  const bookRef = adminDb.collection(BOOKS_COLLECTION).doc();
  const bookId = bookRef.id;
  const now = Timestamp.now();
  const nowDate = now.toDate();

  // Derive an initial book-level authorship summary up front (we know each
  // page's aiCharCount because we just generated it).
  const pageAuthorships: PageAuthorship[] = draft.pages.map((p) => ({
    source: 'ai_generated' as const,
    originalAiText: p.plainText,
    aiCharCount: p.plainText.length,
    kidCharCount: 0,
    imageSource: p.imageUrl ? ('ai_generated' as const) : ('none' as const),
    lastEditedAt: nowDate,
  }));
  const bookAuthorship = aggregateBookAuthorship({
    pages: pageAuthorships.map((a) => ({ authorship: a })),
    initialSource: 'ai_generated' as const,
    now: nowDate,
  });

  const cover: BookCover = {
    title: draft.title,
    subtitle: '',
    authorName: setup.author,
    backgroundColor: setup.themeColor ?? '#5B5FFF',
    imageUrl: draft.coverImageUrl ?? null, // AI flow drafts the cover too (BOOK-002)
    imagePrompt: draft.coverPrompt,
    font: setup.typography.titleFont,
  };

  const bookDoc = {
    id: bookId,
    title: draft.title,
    author: setup.author,
    status: 'draft' as BookStatus,
    type: setup.type,
    bucket: setup.bucket,
    format: setup.format,
    size: setup.size,
    dimensions: {
      widthMm: dimensions.widthMm,
      heightMm: dimensions.heightMm,
      widthPx: dimensions.widthPx,
      heightPx: dimensions.heightPx,
    },
    typography: setup.typography,
    cover,
    backCover: null,
    // BOOK-002 — persist the AI "book bible" hero (if the draft carried one)
    // as a single locked-cast member. Reuses the existing BookCharacter
    // schema, so the editor's CastEditor and any later image regeneration
    // share the same character definition the pages were drawn against.
    characters: draft.character
      ? [
          charToStored({
            id: nanoid(10),
            name: draft.character.name,
            lookDescription: draft.character.lookDescription,
            anchorImageUrl: draft.character.anchorImageUrl ?? null,
            anchorPrompt: draft.character.anchorPrompt,
            createdAt: new Date(),
          }),
        ]
      : [],
    plot: null,
    pageCount: draft.pages.length,
    pageLimit: setup.pageLimit,
    themeColor: setup.themeColor ?? null,
    imageSeed: draft.imageSeed ?? null,
    sessionId: scope.sessionId,
    userId: scope.userId ?? null,
    kidId: scope.kidId ?? null,
    coverThumbnail: null,
    isPublic: false,
    publishedAt: null,
    pdfUrl: null,
    printOrderEligible: false,
    shareUrl: null,
    authorship: bookAuthorshipToStored(bookAuthorship),
    effortBadge: null,
    sales: null,
    createdAt: now,
    updatedAt: now,
  };

  // Pick a default layout per page based on whether we have an image.
  // text_image format: image_top_text_bottom; text-only: text_only; etc.
  const defaultLayout: PageLayout =
    setup.format === 'image' ? 'image_full_bleed'
      : setup.format === 'text' ? 'text_only'
        : 'image_top_text_bottom';

  // Hybrid-by-scene-type: honour the per-page layout the route mapped from
  // the AI's scene framing, but only if it's allowed for this bucket —
  // otherwise fall back to the bucket-safe default. A text-only page with no
  // image also can't be full-bleed, so guard that too.
  const layoutForPage = (p: CreateGeneratedBookInput['draft']['pages'][number]): PageLayout => {
    const wanted = p.layout;
    if (!wanted || !isLayoutAllowedForBucket(wanted, setup.bucket)) return defaultLayout;
    if ((wanted === 'image_full_bleed' || wanted === 'gallery') && !p.imageUrl) {
      return isLayoutAllowedForBucket('image_top_text_bottom', setup.bucket)
        ? 'image_top_text_bottom'
        : defaultLayout;
    }
    return wanted;
  };

  // Batch write: 1 book + N pages.
  const batch = adminDb.batch();
  batch.set(bookRef, stripUndefined(bookDoc));
  draft.pages.forEach((p, i) => {
    const pageRef = bookRef.collection(PAGES_SUBCOLLECTION).doc();
    const pageDoc = {
      id: pageRef.id,
      pageNumber: i + 1,
      layout: layoutForPage(p),
      richText: null, // will be set when kid first opens editor (server can derive richText from plainText if needed)
      plainText: p.plainText,
      imageUrl: p.imageUrl,
      imagePrompt: p.imagePrompt,
      imageStyle: null,
      voiceTranscriptRaw: null,
      grammarSuggestions: [],
      style: null,
      authorship: authorshipToStored(pageAuthorships[i]!),
      createdAt: now,
      updatedAt: now,
    };
    batch.set(pageRef, stripUndefined(pageDoc));
  });
  await batch.commit();

  const finalSnap = await bookRef.get();
  return docToBook(finalSnap);
}

// ── BOOK-008 async generation: shell + incremental fill ──────────────
//
// The home tile must appear the instant the kid clicks Generate, so the route
// writes a `pending` shell (createPendingGeneratedBook) and the background job
// (lib/books/generateBookJob) fills the draft + streams images in, flipping
// `generation.status` to complete/partial/failed. Books stay server-write-only
// (Admin SDK); clients read progress through GET /api/books.

function baseGenerationDoc(pagesTotal: number, now: Timestamp): Record<string, unknown> {
  return {
    status: 'pending',
    step: 'queued',
    pagesTotal,
    pagesRendered: 0,
    coverRendered: false,
    anchorRendered: false,
    attempts: 0,
    error: null,
    startedAt: now,
    finishedAt: null,
  };
}

/** Create an EMPTY book shell so the progress tile renders immediately. The
 *  background job fills it via writeGeneratedBookContent + setPageImage. */
export async function createPendingGeneratedBook(
  setup: Omit<BookCreateInput, 'characters' | 'plot'>,
  pagesTotal: number,
  scope: OwnerScope,
  /** The raw validated generate input — stored so a failed book can be retried
   *  without the kid re-entering anything. Opaque map (no package→app type dep);
   *  the retry route re-validates it. */
  generationInput?: Record<string, unknown>,
): Promise<{ id: string }> {
  validateCreateInput({ ...setup } as BookCreateInput);
  const dimensions = BOOK_SIZES[setup.size];
  const bookRef = adminDb.collection(BOOKS_COLLECTION).doc();
  const now = Timestamp.now();
  const cover: BookCover = {
    title: setup.title,
    subtitle: '',
    authorName: setup.author,
    backgroundColor: setup.themeColor ?? '#5B5FFF',
    imageUrl: null,
    imagePrompt: null,
    font: setup.typography.titleFont,
  };
  const bookDoc = {
    id: bookRef.id,
    title: setup.title,
    author: setup.author,
    status: 'draft' as BookStatus,
    type: setup.type,
    bucket: setup.bucket,
    format: setup.format,
    size: setup.size,
    dimensions: {
      widthMm: dimensions.widthMm,
      heightMm: dimensions.heightMm,
      widthPx: dimensions.widthPx,
      heightPx: dimensions.heightPx,
    },
    typography: setup.typography,
    cover,
    backCover: null,
    characters: [],
    plot: null,
    pageCount: 0,
    pageLimit: setup.pageLimit,
    themeColor: setup.themeColor ?? null,
    imageSeed: null,
    sessionId: scope.sessionId,
    userId: scope.userId ?? null,
    kidId: scope.kidId ?? null,
    coverThumbnail: null,
    isPublic: false,
    publishedAt: null,
    pdfUrl: null,
    printOrderEligible: false,
    shareUrl: null,
    authorship: null,
    effortBadge: null,
    sales: null,
    generation: baseGenerationDoc(pagesTotal, now),
    generationInput: generationInput ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await bookRef.set(stripUndefined(bookDoc));
  return { id: bookRef.id };
}

/** Read a book's stored generate input + current generation status (for retry).
 *  Owner-checked. */
export async function getBookGenerationInput(
  bookId: string,
  scope: OwnerScope,
): Promise<{ input: Record<string, unknown> | null; status: BookGenerationStatus | null }> {
  const snap = await adminDb.collection(BOOKS_COLLECTION).doc(bookId).get();
  if (!snap.exists) throw new AppException('NOT_FOUND', 'Book not found', 404);
  const data = snap.data()!;
  if (!ownsBook(data, scope)) throw new AppException('FORBIDDEN', 'Not your book', 403);
  return {
    input: (data.generationInput as Record<string, unknown> | undefined) ?? null,
    status: (data.generation?.status as BookGenerationStatus | undefined) ?? null,
  };
}

/** Reset a failed book back to `pending` and clear its pages so the job can
 *  re-run cleanly (manual retry). Owner-checked. */
export async function resetBookForRetry(bookId: string, scope: OwnerScope): Promise<void> {
  const bookRef = adminDb.collection(BOOKS_COLLECTION).doc(bookId);
  const snap = await bookRef.get();
  if (!snap.exists) throw new AppException('NOT_FOUND', 'Book not found', 404);
  const data = snap.data()!;
  if (!ownsBook(data, scope)) throw new AppException('FORBIDDEN', 'Not your book', 403);

  // Delete existing pages — the job re-writes them from a fresh draft.
  const pagesSnap = await bookRef.collection(PAGES_SUBCOLLECTION).get();
  const batch = adminDb.batch();
  pagesSnap.docs.forEach((d) => batch.delete(d.ref));
  const prevAttempts = (data.generation?.attempts as number | undefined) ?? 0;
  batch.set(
    bookRef,
    {
      pageCount: 0,
      characters: [],
      cover: { imageUrl: null },
      generation: {
        status: 'pending',
        step: 'queued',
        pagesRendered: 0,
        coverRendered: false,
        anchorRendered: false,
        attempts: prevAttempts + 1,
        error: null,
        finishedAt: null,
      },
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
  await batch.commit();
}

/** The AI draft (text + prompts) used to fill a pending shell. */
export interface GeneratedBookContent {
  title: string;
  coverPrompt: string;
  imageSeed: number;
  character: {
    name: string;
    lookDescription: string;
    anchorPrompt: string;
    anchorImageUrl?: string | null;
  } | null;
  pages: Array<{ plainText: string; imagePrompt: string; layout?: PageLayout }>;
}

/** Fill the pending shell with the AI draft: N pages (text + prompts, images
 *  still null), cover prompt, locked character, pinned seed. Flips generation →
 *  step:'anchor', status:'generating'. Returns ordered page ids so the job can
 *  attach images via setPageImage. */
export async function writeGeneratedBookContent(
  bookId: string,
  setup: Omit<BookCreateInput, 'characters' | 'plot'>,
  draft: GeneratedBookContent,
  scope: OwnerScope,
): Promise<{ pageIds: string[] }> {
  const bookRef = adminDb.collection(BOOKS_COLLECTION).doc(bookId);
  const snap = await bookRef.get();
  if (!snap.exists) throw new AppException('NOT_FOUND', 'Book not found', 404);
  if (!ownsBook(snap.data() ?? {}, scope)) {
    throw new AppException('FORBIDDEN', 'Not your book', 403);
  }
  const now = Timestamp.now();
  const nowDate = now.toDate();

  const pageAuthorships: PageAuthorship[] = draft.pages.map((p) => ({
    source: 'ai_generated' as const,
    originalAiText: p.plainText,
    aiCharCount: p.plainText.length,
    kidCharCount: 0,
    imageSource: 'none' as const, // images attach later via setPageImage
    lastEditedAt: nowDate,
  }));
  const bookAuthorship = aggregateBookAuthorship({
    pages: pageAuthorships.map((a) => ({ authorship: a })),
    initialSource: 'ai_generated' as const,
    now: nowDate,
  });

  const defaultLayout: PageLayout =
    setup.format === 'image' ? 'image_full_bleed'
      : setup.format === 'text' ? 'text_only'
        : 'image_top_text_bottom';
  const layoutForPage = (wanted: PageLayout | undefined): PageLayout =>
    wanted && isLayoutAllowedForBucket(wanted, setup.bucket) ? wanted : defaultLayout;

  const batch = adminDb.batch();
  const pageIds: string[] = [];
  draft.pages.forEach((p, i) => {
    const pageRef = bookRef.collection(PAGES_SUBCOLLECTION).doc();
    pageIds.push(pageRef.id);
    batch.set(
      pageRef,
      stripUndefined({
        id: pageRef.id,
        pageNumber: i + 1,
        layout: layoutForPage(p.layout),
        richText: null,
        plainText: p.plainText,
        imageUrl: null,
        imagePrompt: p.imagePrompt,
        imageStyle: null,
        voiceTranscriptRaw: null,
        grammarSuggestions: [],
        style: null,
        authorship: authorshipToStored(pageAuthorships[i]!),
        createdAt: now,
        updatedAt: now,
      }),
    );
  });

  const characters = draft.character
    ? [
        charToStored({
          id: nanoid(10),
          name: draft.character.name,
          lookDescription: draft.character.lookDescription,
          anchorImageUrl: draft.character.anchorImageUrl ?? null,
          anchorPrompt: draft.character.anchorPrompt,
          createdAt: new Date(),
        }),
      ]
    : [];

  batch.set(
    bookRef,
    stripUndefined({
      title: draft.title,
      cover: { title: draft.title, imagePrompt: draft.coverPrompt },
      characters,
      imageSeed: draft.imageSeed,
      pageCount: draft.pages.length,
      authorship: bookAuthorshipToStored(bookAuthorship),
      generation: { status: 'generating', step: 'anchor' },
      updatedAt: now,
    }),
    { merge: true },
  );

  await batch.commit();
  return { pageIds };
}

type GenerationPatch = Partial<{
  status: BookGenerationStatus;
  step: BookGenerationStep;
  pagesRendered: number;
  coverRendered: boolean;
  anchorRendered: boolean;
  attempts: number;
  error: string | null;
}>;

/** Patch the generation sub-doc from the background job. */
export async function updateBookGeneration(bookId: string, patch: GenerationPatch): Promise<void> {
  await adminDb
    .collection(BOOKS_COLLECTION)
    .doc(bookId)
    .set({ generation: stripUndefined(patch), updatedAt: Timestamp.now() }, { merge: true });
}

/** Attach a rendered image to a page (background job). */
export async function setPageImage(bookId: string, pageId: string, imageUrl: string): Promise<void> {
  await adminDb
    .collection(BOOKS_COLLECTION)
    .doc(bookId)
    .collection(PAGES_SUBCOLLECTION)
    .doc(pageId)
    .set(
      {
        imageUrl,
        imageStyle: 'cartoon',
        authorship: { imageSource: 'ai_generated' },
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
}

/** Attach the rendered cover image (background job). */
export async function setBookCoverImage(bookId: string, imageUrl: string): Promise<void> {
  await adminDb
    .collection(BOOKS_COLLECTION)
    .doc(bookId)
    .set(
      {
        cover: { imageUrl },
        coverThumbnail: null,
        generation: { coverRendered: true },
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
}

/** Persist the hero anchor portrait onto the first cast member (background job). */
export async function setBookAnchorImage(bookId: string, anchorImageUrl: string): Promise<void> {
  const bookRef = adminDb.collection(BOOKS_COLLECTION).doc(bookId);
  const snap = await bookRef.get();
  const chars = (snap.data()?.characters as Array<Record<string, unknown>> | undefined) ?? [];
  if (chars.length > 0 && chars[0]) chars[0].anchorImageUrl = anchorImageUrl;
  await bookRef.set(
    { characters: chars, generation: { anchorRendered: true }, updatedAt: Timestamp.now() },
    { merge: true },
  );
}

/** Close out a generation run: derive complete/partial/failed from what actually
 *  rendered and stamp finishedAt. Returns the final status. */
export async function finalizeBookGeneration(
  bookId: string,
  outcome: { failed?: boolean; error?: string | null } = {},
): Promise<BookGenerationStatus> {
  const bookRef = adminDb.collection(BOOKS_COLLECTION).doc(bookId);
  const now = Timestamp.now();

  if (outcome.failed) {
    await bookRef.set(
      {
        generation: {
          status: 'failed',
          step: 'done',
          error: outcome.error ?? 'Generation failed',
          finishedAt: now,
        },
        updatedAt: now,
      },
      { merge: true },
    );
    return 'failed';
  }

  const [bookSnap, pagesSnap] = await Promise.all([
    bookRef.get(),
    bookRef.collection(PAGES_SUBCOLLECTION).get(),
  ]);
  const total = pagesSnap.size;
  const rendered = pagesSnap.docs.filter((d) => !!d.data().imageUrl).length;
  const coverRendered = !!bookSnap.data()?.cover?.imageUrl;
  const status: BookGenerationStatus =
    total > 0 && rendered === total && coverRendered ? 'complete' : 'partial';

  await bookRef.set(
    {
      generation: { status, step: 'done', pagesRendered: rendered, error: null, finishedAt: now },
      updatedAt: now,
    },
    { merge: true },
  );
  return status;
}

/** Delete a page and renumber remaining pages within a transaction. */
export async function deletePage(
  bookId: string,
  pageId: string,
  scope: OwnerScope
): Promise<void> {
  const { ref: bookRef } = await loadOwnedBook(bookId, scope);
  const pagesCol = bookRef.collection(PAGES_SUBCOLLECTION);

  await adminDb.runTransaction(async (tx) => {
    const targetSnap = await tx.get(pagesCol.doc(pageId));
    if (!targetSnap.exists) {
      throw new AppException('NOT_FOUND', 'Page not found', 404);
    }
    const targetData = targetSnap.data()!;
    const removedPageNumber = targetData.pageNumber as number;

    const allSnap = await tx.get(pagesCol.orderBy('pageNumber', 'asc'));
    const bookSnap = await tx.get(bookRef);
    const now = Timestamp.now();
    const nowDate = now.toDate();

    tx.delete(pagesCol.doc(pageId));

    // Shift pageNumber for pages after the deleted one
    for (const doc of allSnap.docs) {
      if (doc.id === pageId) continue;
      const data = doc.data();
      if (data.pageNumber > removedPageNumber) {
        tx.update(doc.ref, { pageNumber: data.pageNumber - 1, updatedAt: now });
      }
    }

    // BOOK-003 — re-aggregate the denormalized authorship summary so a
    // deleted AI-generated page doesn't leave the badge math overstating
    // AI contribution. Pre-fix, deletePage only adjusted pageCount and
    // the next publish would award the wrong badge. publishBook now
    // also recomputes defensively, but maintaining the summary here
    // keeps consumers (live badge predictor, etc.) accurate between
    // page operations and publish. Codex review comment 3313051439.
    const remainingPages = allSnap.docs
      .filter((d) => d.id !== pageId)
      .map((d) => ({ authorship: revivePageAuthorship(d.data().authorship) }));
    const priorInitialSource = (() => {
      const a = bookSnap.exists ? bookSnap.data()?.authorship : null;
      if (a && typeof a === 'object' && typeof (a as Record<string, unknown>).initialSource === 'string') {
        const src = (a as Record<string, unknown>).initialSource;
        if (src === 'ai_generated' || src === 'wizard_seeded') return src;
      }
      return 'wizard_blank' as const;
    })();
    const freshAuthorship = aggregateBookAuthorship({
      pages: remainingPages,
      initialSource: priorInitialSource,
      now: nowDate,
    });

    tx.update(bookRef, {
      pageCount: FieldValue.increment(-1),
      authorship: bookAuthorshipToStored(freshAuthorship),
      updatedAt: now,
    });
  });
}

/** Apply a new page ordering. Transactional — all updates land atomically. */
export async function reorderPages(
  bookId: string,
  input: PageReorderInput,
  scope: OwnerScope
): Promise<void> {
  const { ref: bookRef } = await loadOwnedBook(bookId, scope);
  const pagesCol = bookRef.collection(PAGES_SUBCOLLECTION);

  await adminDb.runTransaction(async (tx) => {
    // 1. Load ALL existing pages to validate completeness
    const allPagesSnap = await tx.get(pagesCol);
    const existingIds = new Set(allPagesSnap.docs.map((d) => d.id));

    // 2. Validate the order covers every page exactly once
    const submittedIds = new Set(input.order.map((e) => e.pageId));
    if (submittedIds.size !== input.order.length) {
      throw new AppException(
        'INVALID_INPUT',
        'Duplicate page IDs in reorder request',
        400,
      );
    }
    if (submittedIds.size !== existingIds.size) {
      throw new AppException(
        'INVALID_INPUT',
        `Order must include all ${existingIds.size} pages, got ${submittedIds.size}`,
        400,
      );
    }
    for (const id of submittedIds) {
      if (!existingIds.has(id)) {
        throw new AppException('NOT_FOUND', `Page ${id} not found`, 404);
      }
    }

    // 3. Validate contiguous 1-based page numbers
    const pageNumbers = input.order.map((e) => e.pageNumber).sort((a, b) => a - b);
    for (let i = 0; i < pageNumbers.length; i++) {
      if (pageNumbers[i] !== i + 1) {
        throw new AppException(
          'INVALID_INPUT',
          `Page numbers must be contiguous 1..${pageNumbers.length}`,
          400,
        );
      }
    }

    const now = Timestamp.now();
    for (const entry of input.order) {
      tx.update(pagesCol.doc(entry.pageId), {
        pageNumber: entry.pageNumber,
        updatedAt: now,
      });
    }
    tx.update(bookRef, { updatedAt: now });
  });
}

/** Partial-merge cover composition fields. Invalidates cached coverThumbnail. */
export async function updateCover(
  bookId: string,
  patch: CoverPatchInput,
  scope: OwnerScope
): Promise<Book> {
  const { ref, book } = await loadOwnedBook(bookId, scope);
  const newCover: BookCover = {
    ...book.cover,
    ...patch,
  };

  await ref.update({
    cover: newCover,
    coverThumbnail: null, // Force re-render on next list/preview
    updatedAt: Timestamp.now(),
  });

  const snapshot = await ref.get();
  return docToBook(snapshot);
}

/** Mint a unique share-URL slug. Pattern: 8-char alphanumeric. */
function mintShareSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

/**
 * Move book to `published`. Validates pageCount >= 1, mints shareUrl, sets
 * publishedAt, and awards the effort badge (BOOK-003) from the denormalized
 * authorship summary. PDF generation is the caller's responsibility.
 */
export async function publishBook(
  bookId: string,
  scope: OwnerScope,
  options: { isPublic?: boolean } = {}
): Promise<Book> {
  const { ref, book } = await loadOwnedBook(bookId, scope);
  if (book.pageCount < 1) {
    throw new AppException(
      'INVALID_INPUT',
      'Add at least one page before publishing',
      400
    );
  }

  const shareUrl = book.shareUrl ?? `/view/book/${mintShareSlug()}`;
  const now = Timestamp.now();
  const nowDate = now.toDate();

  // BOOK-003 — Re-aggregate authorship from current pages BEFORE computing
  // the badge. We don't trust the denormalized `book.authorship` here
  // because `deletePage` (pre-fix) didn't maintain that summary, so a
  // kid who deleted an AI-generated page could publish with a stale
  // total that overstated AI contribution. Codex review comment 3313051439.
  //
  // This is one Firestore range read on a sub-50-page subcollection —
  // cheap compared to PDF generation and worth it for badge correctness.
  const pagesSnap = await ref
    .collection(PAGES_SUBCOLLECTION)
    .orderBy('pageNumber', 'asc')
    .get();
  const freshAuthorship = aggregateBookAuthorship({
    pages: pagesSnap.docs.map((d) => ({
      authorship: revivePageAuthorship(d.data().authorship),
    })),
    initialSource: book.authorship?.initialSource ?? 'wizard_blank',
    now: nowDate,
  });

  const effortBadge = computeEffortBadge(freshAuthorship, nowDate);
  const effortBadgeStored = {
    key: effortBadge.key,
    aiPercentage: effortBadge.aiPercentage,
    awardedAt: Timestamp.fromDate(effortBadge.awardedAt),
    breakdown: { ...effortBadge.breakdown },
  };

  await ref.update({
    status: 'published' as BookStatus,
    isPublic: options.isPublic ?? false,
    publishedAt: now,
    shareUrl,
    // Persist the recomputed summary alongside the badge so the
    // denormalized field stops lying (downstream readers like
    // BOOK-009's live badge predictor depend on it being correct).
    authorship: bookAuthorshipToStored(freshAuthorship),
    effortBadge: effortBadgeStored,
    updatedAt: now,
  });

  const snapshot = await ref.get();
  return docToBook(snapshot);
}

// ── Sales config (BOOK-004 Phase 1) ─────────────────────────────

/**
 * Update a book's sales config. Author-only. Book must be published
 * before sales can be enabled.
 *
 * Phase 1 — this only sets `book.sales`. No purchases happen until
 * BOOK-004 Phase 2 ships the Razorpay flow.
 */
export async function updateSalesConfig(
  bookId: string,
  input: SalesConfigPatchInput,
  scope: OwnerScope,
): Promise<Book> {
  const { ref, book } = await loadOwnedBook(bookId, scope);
  if (input.enabled && book.status !== 'published') {
    throw new AppException(
      'INVALID_STATE',
      'Publish the book before enabling sales',
      400,
    );
  }
  if (input.enabled && (input.priceInr ?? null) === null) {
    throw new AppException('INVALID_INPUT', 'priceInr required when enabling sales', 400);
  }

  const now = Timestamp.now();
  const prior = book.sales;
  const sales = {
    enabled: input.enabled,
    priceInr: input.enabled ? input.priceInr ?? null : prior?.priceInr ?? null,
    listedAt: prior?.listedAt
      ? Timestamp.fromDate(prior.listedAt)
      : input.enabled
        ? now
        : null,
  };

  await ref.update({
    sales,
    updatedAt: now,
  });

  const snap = await ref.get();
  return docToBook(snap);
}

export interface ListShopBooksFilters {
  limit?: number;
  cursor?: string;
}

export interface ShopBookItem {
  id: string;
  title: string;
  author: string;
  coverThumbnail: string | null;
  priceInr: number;
  effortBadge: Book['effortBadge'];
  listedAt: Date;
  shareUrl: string | null;
}

/**
 * Browse books listed for sale (BOOK-004 Phase 1). Public — no auth.
 * Returns published, public-readable, sales-enabled books ordered by
 * `sales.listedAt desc`.
 *
 * Resilience: this hits a composite index defined in firestore.indexes.json
 * (status + isPublic + sales.enabled + sales.listedAt). If that index isn't
 * deployed yet (a known launch step), Firestore throws FAILED_PRECONDITION.
 * Rather than 500 the whole shop page, we swallow that and return an empty
 * shelf — the UI already handles the empty state with a friendly "be the
 * first author" prompt. Same resilience pattern as getStudioLaunchStates /
 * getCommunityStats. Always logs a warning so the missing index doesn't
 * silently linger.
 */
export async function listShopBooks(filters: ListShopBooksFilters = {}): Promise<{
  items: ShopBookItem[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const limit = Math.min(filters.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);
  let query = adminDb
    .collection(BOOKS_COLLECTION)
    .where('status', '==', 'published')
    .where('isPublic', '==', true)
    .where('sales.enabled', '==', true)
    .orderBy('sales.listedAt', 'desc')
    .limit(limit + 1);

  if (filters.cursor) {
    const cursorDate = new Date(filters.cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      query = query.startAfter(Timestamp.fromDate(cursorDate));
    }
  }

  let snap: FirebaseFirestore.QuerySnapshot;
  try {
    snap = await query.get();
  } catch (err) {
    // FAILED_PRECONDITION (code 9) = missing composite index. Any other
    // error is also caught — the shop is a nice-to-have surface, not
    // critical, and we'd rather show an empty shelf than 500. The warn
    // line carries the underlying error so ops sees the missing-index
    // link + can run `firebase deploy --only firestore:indexes`.
    console.warn('[listShopBooks] query failed, serving empty shelf:', err);
    return { items: [], nextCursor: null, hasMore: false };
  }
  const docs = snap.docs.slice(0, limit);
  const items: ShopBookItem[] = docs.map((d) => {
    const b = docToBook(d);
    return {
      id: b.id,
      title: b.title,
      author: b.author,
      coverThumbnail: b.coverThumbnail,
      priceInr: b.sales?.priceInr ?? 0,
      effortBadge: b.effortBadge,
      listedAt: b.sales?.listedAt ?? b.updatedAt,
      shareUrl: b.shareUrl,
    };
  });
  const hasMore = snap.docs.length > limit;
  const nextCursor = hasMore ? items[items.length - 1]?.listedAt.toISOString() ?? null : null;
  return { items, nextCursor, hasMore };
}

// ── Characters ──────────────────────────────────────────────────

const MAX_CHARACTERS_PER_BOOK = 3;

/** Append a new character to the book. Enforces the 3-character cap. */
export async function addCharacter(
  bookId: string,
  input: CharacterCreateInput,
  scope: OwnerScope
): Promise<BookCharacter> {
  const { ref, book } = await loadOwnedBook(bookId, scope);
  if (book.characters.length >= MAX_CHARACTERS_PER_BOOK) {
    throw new AppException(
      'CHARACTER_LIMIT_REACHED',
      `Books can have up to ${MAX_CHARACTERS_PER_BOOK} characters`,
      400
    );
  }

  const character: BookCharacter = {
    id: nanoid(10),
    name: input.name,
    lookDescription: input.lookDescription,
    anchorImageUrl: null,
    anchorPrompt: null,
    createdAt: new Date(),
  };

  const stored = {
    ...character,
    createdAt: Timestamp.fromDate(character.createdAt),
  };

  await ref.update({
    characters: [...book.characters.map(charToStored), stored],
    updatedAt: Timestamp.now(),
  });

  return character;
}

/** Convert a runtime BookCharacter to the Firestore-storable shape. */
function charToStored(c: BookCharacter): Record<string, unknown> {
  return {
    id: c.id,
    name: c.name,
    lookDescription: c.lookDescription,
    anchorImageUrl: c.anchorImageUrl,
    anchorPrompt: c.anchorPrompt,
    createdAt:
      c.createdAt instanceof Date ? Timestamp.fromDate(c.createdAt) : c.createdAt,
  };
}

/** Update a character (name, look, anchor URL/prompt). */
export async function updateCharacter(
  bookId: string,
  characterId: string,
  patch: CharacterPatchInput,
  scope: OwnerScope
): Promise<BookCharacter> {
  const { ref, book } = await loadOwnedBook(bookId, scope);
  const idx = book.characters.findIndex((c) => c.id === characterId);
  if (idx === -1) {
    throw new AppException('NOT_FOUND', 'Character not found', 404);
  }
  const existing = book.characters[idx]!;
  const merged: BookCharacter = {
    ...existing,
    ...patch,
  };
  const next = [...book.characters];
  next[idx] = merged;

  await ref.update({
    characters: next.map(charToStored),
    updatedAt: Timestamp.now(),
  });

  return merged;
}

/** Remove a character from the book. */
export async function removeCharacter(
  bookId: string,
  characterId: string,
  scope: OwnerScope
): Promise<void> {
  const { ref, book } = await loadOwnedBook(bookId, scope);
  const filtered = book.characters.filter((c) => c.id !== characterId);
  if (filtered.length === book.characters.length) {
    throw new AppException('NOT_FOUND', 'Character not found', 404);
  }
  await ref.update({
    characters: filtered.map(charToStored),
    updatedAt: Timestamp.now(),
  });
}

/** Set the cached PDF URL for a published book. Caller generated the PDF. */
export async function setBookPdfUrl(
  bookId: string,
  pdfUrl: string,
  scope: OwnerScope
): Promise<void> {
  const { ref } = await loadOwnedBook(bookId, scope);
  await ref.update({
    pdfUrl,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Look up a published book by its share-URL slug. Used by the public
 * /view/book/[slug] route — does NOT require an owner scope, but only
 * returns books with status='published' AND isPublic=true OR with a
 * direct slug match (link-only sharing).
 */
export async function getPublishedBookBySlug(
  slug: string
): Promise<{ book: Book; pages: BookPage[] } | null> {
  const fullShareUrl = `/view/book/${slug}`;
  const querySnap = await adminDb
    .collection(BOOKS_COLLECTION)
    .where('shareUrl', '==', fullShareUrl)
    .where('status', '==', 'published')
    .limit(1)
    .get();

  if (querySnap.empty) return null;
  const doc = querySnap.docs[0]!;
  const book = docToBook(doc);
  const pagesSnap = await doc.ref
    .collection(PAGES_SUBCOLLECTION)
    .orderBy('pageNumber', 'asc')
    .get();
  const pages = pagesSnap.docs.map(docToPage);
  return { book, pages };
}
