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
  BookCharacter,
  BookCover,
  BookListItem,
  BookPage,
  BookPlot,
  BookStatus,
  PageLayout,
  TipTapDocument,
} from '@/types/book.types';
import type {
  BookCreateInput,
  BookPatchInput,
  CharacterCreateInput,
  CharacterPatchInput,
  CoverPatchInput,
  PageCreateInput,
  PagePatchInput,
  PageReorderInput,
} from '@/lib/validators';

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

/** Owner scope — P1 uses sessionId; P2 will add userId/kidId. */
export interface OwnerScope {
  sessionId: string;
  userId?: string | null;
  kidId?: string | null;
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
    backCover: data.backCover ?? null,
    characters: reviveCharacters(data.characters),
    plot: revivePlot(data.plot),
    pageCount: data.pageCount ?? 0,
    pageLimit: data.pageLimit,
    themeColor: data.themeColor ?? null,
    sessionId: data.sessionId,
    userId: data.userId ?? null,
    kidId: data.kidId ?? null,
    coverThumbnail: data.coverThumbnail ?? null,
    isPublic: data.isPublic ?? false,
    publishedAt: data.publishedAt ? data.publishedAt.toDate() : null,
    pdfUrl: data.pdfUrl ?? null,
    printOrderEligible: data.printOrderEligible ?? false,
    shareUrl: data.shareUrl ?? null,
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
    voiceTranscriptRaw: data.voiceTranscriptRaw ?? null,
    grammarSuggestions: data.grammarSuggestions ?? [],
    style: data.style ?? null,
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
    updatedAt: book.updatedAt,
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
  // P1 owner check: sessionId match. P2 will add userId/kidId.
  if (book.sessionId !== scope.sessionId) {
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
  if (preBook.sessionId !== scope.sessionId) {
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

  const updates: Record<string, unknown> = {
    ...patch,
    updatedAt: Timestamp.now(),
  };

  // Auto-derive plainText if richText is being patched but plainText isn't
  if (patch.richText && patch.plainText === undefined) {
    updates.plainText = plainTextFromTipTap(patch.richText);
  }

  await pageRef.update(stripUndefined(updates));
  await bookRef.update({ updatedAt: Timestamp.now() });

  const finalSnap = await pageRef.get();
  return docToPage(finalSnap);
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
    const now = Timestamp.now();

    tx.delete(pagesCol.doc(pageId));

    // Shift pageNumber for pages after the deleted one
    for (const doc of allSnap.docs) {
      if (doc.id === pageId) continue;
      const data = doc.data();
      if (data.pageNumber > removedPageNumber) {
        tx.update(doc.ref, { pageNumber: data.pageNumber - 1, updatedAt: now });
      }
    }

    tx.update(bookRef, {
      pageCount: FieldValue.increment(-1),
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
    // Verify all pages exist
    const reads = input.order.map((entry) => tx.get(pagesCol.doc(entry.pageId)));
    const snaps = await Promise.all(reads);
    for (const [i, snap] of snaps.entries()) {
      if (!snap.exists) {
        throw new AppException(
          'NOT_FOUND',
          `Page ${input.order[i]!.pageId} not found`,
          404
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
 * publishedAt. PDF generation is the caller's responsibility (separate step).
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

  await ref.update({
    status: 'published' as BookStatus,
    isPublic: options.isPublic ?? false,
    publishedAt: now,
    shareUrl,
    updatedAt: now,
  });

  const snapshot = await ref.get();
  return docToBook(snapshot);
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
