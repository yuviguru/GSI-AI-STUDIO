# BOOK-001: Book Studio Foundation — Multi-Session Authoring with AI Grammar Assist

## Description

Build a new **Book Studio** that lets kids author printable books across multiple sessions. Distinct from the 5 one-shot creation studios (Story/Music/Quiz/Game/Comic) — kids write the content themselves; AI only assists with **grammar (Groq)** and **per-page illustrations** (existing image cascade). Books are persisted in a new `books` Firestore collection with a `pages` subcollection, exported to PDF, and (in v1) gated to digital download with the print partner deferred.

This is the foundation story covering: types, validators, Firestore service, API endpoints, the New Book wizard, the page editor (TipTap + Groq grammar + voice + image insert), cover designer, flipbook preview, and PDF export.

## Design Decisions

- **Distinct collection**: separate `books` collection + `pages` subcollection, NOT extending `creations`. Reason: multi-document structure, locked layout fields, different lifecycle (`draft` → `complete` → `published`).
- **Lock-in fields**: `size`, `format`, `bucket` are LOCKED at creation (server enforces with `400 LOCKED_FIELD` on PATCH attempts). Reason: changing layout mid-author would re-flow every page.
- **18 user-facing types → 6 underlying buckets**: kid sees friendly cards (Storybook, Diary, Recipe, Field Guide, etc.); under the hood all 18 route to one of 6 page-structure buckets (`narrative`, `memoir_catalog`, `entry_list`, `collection`, `concept`, `visual`). Adding a new type later = adding a card + theme defaults, not a new editor.
- **Grammar AI = Groq, NOT Claude**: existing `lib/ai/groqClient.ts` extended with a strict-prompt grammar helper. Flag mistakes only, NEVER rephrase for style. **Preserves kid's voice.**
- **Voice input = browser Web Speech API**: existing `useVoiceInput` hook (Sarvam/Groq Whisper STT exist server-side in `lib/bot/services/stt/` but the web app uses browser-native `lang=en-IN`).
- **Editor = TipTap**: ProseMirror-based, headless, plays well with Tailwind. Stores `richText` as TipTap JSON, derives `plainText` for grammar check + search.
- **Page count caps**: free 5, paid kits at 8/16/24/32, custom up to 40 max (NOT 50 — kid completion rates drop past 30, and abandoned half-books are worse UX than completed shorter ones).
- **PDF first, print TBD**: digital PDF export is MVP. "Order print" button rendered but disabled with "Notify me" placeholder.
- **Book CRUD does NOT count toward creation rate limit**: book authoring isn't AI generation. AI calls (`/api/ai/grammar-check`, `/api/ai/page-image`) DO count toward generation quota.
- **AI X-Ray for Book Studio**: explains "AI assistance vs generation" — that the kid wrote it, AI only proofread + illustrated.

## Requires KB Updates

- ✅ `docs/data-model.md` — `books` collection + `pages` subcollection schemas (committed)
- ✅ `docs/api-contracts.md` — 14 Book Studio endpoints (committed)
- ✅ `docs/architecture.md` — Book Studio component + Book Authoring Flow data flow (committed)
- ✅ `docs/ux-patterns.md` — Book Studio (Multi-Session Authoring) pattern (committed)

## Subtasks

### [TYPE] Define Book + Page types

**Target**: `types/book.types.ts` (new), `types/index.ts` (update)
**Action**: Create + Update
**Requirements**:
- Define `BookFormat` (`text` | `image` | `text_image`), `BookSize` (`square` | `tall` | `pocket` | `landscape`), `BookBucket` (6 buckets), `BookType` (18 user-facing types), `BookStatus` (`draft` | `complete` | `published`), `PageLayout` (8 layouts)
- Define `BookDimensions`, `BookTypography`, `BookCover`, `BookBackCover`, `Book`, `BookPage`, `GrammarSuggestion`, `PageStyleOverride`
- Add `export * from './book.types'` to `types/index.ts`

### [TYPE] Add Zod validators for books + pages

**Target**: `lib/validators.ts`
**Action**: Update
**Requirements**:
- `bookCreateSchema` — wizard input (type, format, size, pageLimit, typography, themeColor, title?, author?)
- `bookPatchSchema` — metadata-only updates (title, author, themeColor, typography, cover, backCover, isPublic); `.strict()` rejects locked fields automatically
- `pageCreateSchema` — append page (layout, optional initial richText/imagePrompt)
- `pagePatchSchema` — page edits (richText, plainText, imageUrl, imagePrompt, imageStyle, style)
- `pageReorderSchema` — `{order: [{pageId, pageNumber}]}`
- `coverPatchSchema` — partial cover composition fields
- `grammarCheckSchema` — `{text, ageHint?, bookId?, pageId?}`
- `pageImageSchema` — `{prompt, style, aspect, bookId?, pageId?}`
- Export inferred types: `BookCreateInput`, `BookPatchInput`, `PageCreateInput`, `PagePatchInput`, etc.

### [LIB] Book templates + bucket layouts catalog

**Target**: `lib/templates/bookTemplates.ts` (new), `lib/templates/index.ts` (update)
**Action**: Create + Update
**Requirements**:
- Export `BOOK_TYPE_CARDS`: 18 cards each with `{type, label, emoji, bucket, defaultFormat, defaultLayouts, suggestedThemeColor, samplePrompts}`
- Export `BUCKET_LAYOUTS`: per-bucket array of allowed `PageLayout` values + display labels
- Export `BOOK_SIZES`: dimensions in `{widthMm, heightMm, widthPx, heightPx}` for square/tall/pocket/landscape (300dpi for px)
- Export `BOOK_FONTS`: 6 entries (Quicksand, Lexend, Lora, Patrick Hand, Fredoka, Comic Neue) with Google Fonts URLs
- Export `BOOK_KIT_PRESETS`: `[{label: "Mini (8 pages)", pageLimit: 8, tier: "paid"}, ...]`

### [API] Firestore book service

**Target**: `lib/firebase/bookService.ts` (new), `lib/firebase/bookService.spec.ts` (new)
**Action**: Create
**Requirements**:
- `createBook(input)` → returns `{id, book}`. Sets initial `pageCount=0`. Validates `{type, format, size, bucket}` combo against `BOOK_TYPE_CARDS`.
- `getBook(id, ownerScope)` → returns `{book, pages}` (subcollection scan, ordered by `pageNumber` asc)
- `listBooks(ownerScope, filters)` → paginated (cursor on `updatedAt`); owner scope = `sessionId` (P1) or `userId/kidId` (P2)
- `updateBook(id, patch, ownerScope)` → throws `LOCKED_FIELD` if patch contains size/format/bucket/dimensions; bumps `updatedAt`
- `deleteBook(id, ownerScope)` → batch delete pages + book
- `appendPage(bookId, input)` → Firestore transaction: read book → check `pageCount < pageLimit` → write page + increment pageCount
- `updatePage(bookId, pageId, patch)` → derives `plainText` from `richText` if missing; bumps both page and book `updatedAt`
- `deletePage(bookId, pageId)` → transaction: delete + renumber remaining pages + decrement pageCount
- `reorderPages(bookId, order)` → transaction
- `updateCover(bookId, cover)` → partial merge into `cover` map; clears `coverThumbnail` (regen happens on next list/preview)
- `publishBook(bookId)` → mints unique `shareUrl` slug, sets `status=published`, `publishedAt`
- All writes use existing `stripUndefined` helper. Owner-scope checks raise `NOT_FOUND` (not `FORBIDDEN`) to avoid leaking existence.

### [API] Groq grammar prompt

**Target**: `lib/ai/prompts/bookGrammarPrompt.ts` (new), `lib/ai/prompts/index.ts` (update)
**Action**: Create + Update
**Requirements**:
- `BOOK_GRAMMAR_SYSTEM_PROMPT` — instructs Groq:
  - Flag ONLY: grammar, spelling, punctuation
  - NEVER: rephrase for style, "improve" wording, change kid-isms or creative phrasing
  - Each suggestion includes `id`, `type`, `original`, `suggested`, `explanation` (kid-friendly, no jargon), `startIndex`, `endIndex` (character offsets in plaintext)
  - Empty array if nothing to flag
- Output schema: `{suggestions: GrammarSuggestion[]}` — Groq must return valid JSON, parsed by `generateJsonWithGroq`
- `buildGrammarUserPrompt(text, ageHint)` — builds user message; ageHint shapes explanation tone
- Pattern: follow `lib/ai/prompts/storyPrompt.ts`

### [API] POST /api/books + GET /api/books

**Target**: `app/api/books/route.ts` (new)
**Action**: Create
**Requirements**:
- POST: validate session (`X-Session-Id`), parse `bookCreateSchema`, call `createBook`, return 201 with `{book}`. Do NOT count toward creation rate limit.
- GET: validate session, parse query params (`status?`, `limit=20`, `cursor?`), call `listBooks`, return `{items, nextCursor, hasMore}`
- Pattern: follow `app/api/creations/route.ts`

### [API] GET / PATCH / DELETE /api/books/[id]

**Target**: `app/api/books/[id]/route.ts` (new)
**Action**: Create
**Requirements**:
- GET: returns `{book, pages}`
- PATCH: parse `bookPatchSchema`, call `updateBook`. Returns updated book. Server throws `LOCKED_FIELD` for size/format/bucket/dimensions.
- DELETE: cascades to pages; returns `204 No Content`

### [API] Page CRUD + reorder

**Target**: `app/api/books/[id]/pages/route.ts` (new), `app/api/books/[id]/pages/[pageId]/route.ts` (new), `app/api/books/[id]/pages/reorder/route.ts` (new)
**Action**: Create
**Requirements**:
- POST `/pages`: append page (server checks page-limit cap). Throws `400 PAGE_LIMIT_REACHED`.
- PATCH `/pages/[pageId]`: update page. Safety-filter `plainText` (`filterInput`) and `imagePrompt` (`filterImagePrompt`). Auto-derive `plainText` if missing.
- DELETE `/pages/[pageId]`: delete + renumber. Returns `204`.
- POST `/pages/reorder`: transaction-based reorder with `pageReorderSchema`.

### [API] Cover, publish, export-pdf

**Target**: `app/api/books/[id]/cover/route.ts`, `app/api/books/[id]/publish/route.ts`, `app/api/books/[id]/export-pdf/route.ts` (all new)
**Action**: Create
**Requirements**:
- POST `/cover`: parse `coverPatchSchema`, update cover, regenerate `coverThumbnail` (delegate to image cascade with cover prompt)
- POST `/publish`: validate `pageCount >= 1`, mint unique `shareUrl` slug, generate PDF, set `status=published`, `publishedAt`. Returns `{shareUrl, pdfUrl}`.
- POST `/export-pdf`: idempotent — return cached `pdfUrl` if `book.updatedAt` hasn't moved since last generation. Otherwise regenerate.

### [API] /api/ai/grammar-check + /api/ai/page-image

**Target**: `app/api/ai/grammar-check/route.ts` (new), `app/api/ai/page-image/route.ts` (new)
**Action**: Create
**Requirements**:
- `/grammar-check`: parse `grammarCheckSchema`, `filterInput` on `text`, call `generateJsonWithGroq` with `BOOK_GRAMMAR_SYSTEM_PROMPT`, run each `suggested` through `filterOutput`, return `{suggestions[]}`
- `/page-image`: parse `pageImageSchema`, `filterImagePrompt`, call existing `imageProvider.generateImage`, return `{imageUrl, model, latencyMs}`
- Both DO count toward AI generation quota — call `trackCreation(sessionId)` (or a more general `trackAiCall` if we add one) before generating

### [LIB] Extend pdfGenerator for books

**Target**: `lib/export/pdfGenerator.ts`
**Action**: Update
**Requirements**:
- Add `generateBookPdf(book: Book, pages: BookPage[]): Promise<{buffer: Buffer, url: string}>`
- Render at locked book dimensions (square/tall/pocket/landscape, 300dpi for print quality)
- Render: cover page → numbered pages → optional back cover
- TipTap JSON → HTML → PDF (use TipTap's HTML serializer; jspdf is already installed)
- Honor per-page `style` overrides (font, fontSize, alignment, color)
- Save buffer to Firebase Storage; return public URL

### [HOOK] useBook + useBookPages + useGrammarCheck

**Target**: `hooks/useBook.ts`, `hooks/useBookPages.ts`, `hooks/useGrammarCheck.ts` (all new)
**Action**: Create
**Requirements**:
- `useBook(bookId)` — SWR fetch + mutations (`patchBook`, `deleteBook`, `publishBook`, `exportPdf`, `updateCover`)
- `useBookPages(bookId)` — SWR fetch pages array + mutations (`appendPage`, `patchPage`, `deletePage`, `reorderPages`)
- `useGrammarCheck()` — POST `/api/ai/grammar-check`, returns `suggestions, loading, error, run(text)`
- Use existing `fetchWithSession`

### [FE] Book Studio entry page (Library + Wizard launcher)

**Target**: `app/(public)/create/book/page.tsx` (new), `app/(public)/create/book/BookStudioClient.tsx` (new)
**Action**: Create
**Requirements**:
- `page.tsx`: thin server wrapper with metadata + Suspense
- `BookStudioClient.tsx`: tabs/sections for "In progress" and "Published" books, `[+ New Book]` opens `NewBookWizard`
- Empty state when no books ("Start your first book →")
- Pattern: follow `ComicStudioClient.tsx` structure but no 3-step state machine — this is just library + wizard launcher

### [FE] NewBookWizard component (5 steps)

**Target**: `components/studios/book/NewBookWizard.tsx` (new)
**Action**: Create
**Requirements**:
- 5 steps: type cards → format → size → page-count kit → font
- Stepper UI (progress dots, framer-motion transitions between steps)
- Type cards from `BOOK_TYPE_CARDS`; clicking a card auto-suggests `bucket`, `defaultFormat`, `themeColor`
- Submit calls POST `/api/books`, on success routes to `/create/book/{id}`
- Disable/grey paid kits if user is on free tier (Phase 1: assume free)

### [FE] Book editor route

**Target**: `app/(public)/create/book/[bookId]/page.tsx` (new), `app/(public)/create/book/[bookId]/BookEditorClient.tsx` (new)
**Action**: Create
**Requirements**:
- `page.tsx`: server wrapper passes `bookId` param
- `BookEditorClient.tsx`: orchestrates page navigator + page editor + sidebar tools
- Loads `useBook(bookId)` + `useBookPages(bookId)`; redirects to library on 404
- Top bar: book title (editable inline), Cover/Preview/Publish buttons, overflow menu (delete, duplicate, export PDF)

### [FE] PageEditor component (TipTap + toolbar)

**Target**: `components/studios/book/PageEditor.tsx` (new)
**Action**: Create
**Requirements**:
- TipTap editor with extensions: StarterKit, Underline, TextAlign, Color, FontFamily, FontSize, Placeholder
- Toolbar: B / I / U, H1 / H2, bullet list, numbered list, alignment (left/center/right), font dropdown (6 fonts), size dropdown (S/M/L/XL), color (kid-safe palette of ~10)
- Voice button: integrates `useVoiceInput`, inserts transcript at cursor
- Grammar button: calls `useGrammarCheck()`, renders suggestions inline via `GrammarSuggestionPopover`
- Image slot (when format = `image` or `text_image`): "Generate" button calls `/api/ai/page-image`, kid can adjust prompt
- Auto-save: debounced PATCH on content change (500ms)
- Layout enforced by book's `format` and page's `layout` field

### [FE] GrammarSuggestionPopover

**Target**: `components/studios/book/GrammarSuggestionPopover.tsx` (new)
**Action**: Create
**Requirements**:
- Inline rendering inside TipTap: original strikethrough + suggested replacement
- Popover with kid-friendly explanation + Accept / Keep buttons
- Accept applies edit + removes suggestion; Keep dismisses; both PATCH page
- Empty state when no suggestions: small "Looks great!" mascot moment (Koko, 2s)

### [FE] PageNavigator (top strip)

**Target**: `components/studios/book/PageNavigator.tsx` (new)
**Action**: Create
**Requirements**:
- Horizontal strip of page thumbnails (live render of cover snippet)
- Tap to jump, drag to reorder (calls reorder API on drop)
- `+` button appends page; greyed out at limit with kid-friendly hint ("You've filled up your book! 🎉 [Get more pages]")

### [FE] CoverDesigner

**Target**: `components/studios/book/CoverDesigner.tsx` (new)
**Action**: Create
**Requirements**:
- Title, subtitle, author inputs
- Cover image: prompt textarea + Generate button (calls `/api/ai/page-image` with `aspect=cover`)
- Background color picker (kid-safe palette)
- Live preview at locked book size
- Save calls POST `/api/books/[id]/cover`

### [FE] FlipbookPreview

**Target**: `components/studios/book/FlipbookPreview.tsx` (new)
**Action**: Create
**Requirements**:
- Read-only flipbook with swipe (mobile) and arrow buttons (desktop)
- Renders cover, all pages in order, optional back cover
- Pages flip with framer-motion springs
- Reused at `/view/[id]` for shared books (`readOnly` prop)

### [FE] PublishModal

**Target**: `components/studios/book/PublishModal.tsx` (new)
**Action**: Create
**Requirements**:
- Checklist: cover set, `pageCount >= 1`
- "Publish my book" button calls POST `/api/books/[id]/publish`
- "Order print" button rendered but disabled, with "Notify me when print opens" CTA (no-op for v1)
- After publish: PDF download link, share link copy button, confetti

### [FE] Add Book Studio card to landing + nav

**Target**: `app/(public)/page.tsx`, `components/layout/BottomNav.tsx`
**Action**: Update
**Requirements**:
- Landing: add Book Studio card (📖 emoji, gradient `from-indigo-400 to-purple-500`) to studio grid
- BottomNav Create+ sheet: add Book Studio card alongside the existing 5

### [FE] Add Book to ViewerClient (shared book reader)

**Target**: `app/(viewer)/view/[id]/ViewerClient.tsx`
**Action**: Update
**Requirements**:
- Detect when shareUrl points to a book vs. a creation (try `getBook` on 404 from `getCreation`, or use prefix in `shareUrl`)
- Render `FlipbookPreview` in `readOnly` mode
- OG tag generation should use `book.coverThumbnail` and `book.title`

### [INFRA] Firestore indexes

**Target**: `firestore.indexes.json`
**Action**: Update
**Requirements**:
- Add for `books`: `(sessionId, updatedAt desc)`, `(userId, updatedAt desc)`, `(kidId, status, updatedAt desc)`, `(isPublic, publishedAt desc)`
- For `books/{bookId}/pages`: `(pageNumber asc)` — single-field, may already be auto-indexed
- Run `firebase deploy --only firestore:indexes` after merging

### [INFRA] Firestore security rules

**Target**: `firestore.rules`
**Action**: Update
**Requirements**:
- `books` writes server-side only via Admin SDK (deny direct client writes)
- Reads: by `sessionId` for own books, public reads if `isPublic && status='published'`
- `pages` subcollection follows parent book rules

### [TEST] Unit tests

**Target**: `lib/firebase/bookService.spec.ts`, `lib/templates/bookTemplates.spec.ts`, `lib/validators.spec.ts` (extend)
**Action**: Create + Update
**Requirements**:
- bookService: createBook, lock-field rejection, page count enforcement, reorder transaction, publish flow, owner-scope isolation
- bookTemplates: every type card maps to a valid bucket; every bucket has at least one layout; sizes have positive dimensions
- validators: `bookCreateSchema` rejects unknown fields and bad combos; `bookPatchSchema` rejects locked fields with `.strict()`

## Acceptance Criteria

- [ ] Kid can pick a book type from 18 cards in the wizard
- [ ] Wizard locks size/format/bucket; PATCH attempts on those fields return 400 LOCKED_FIELD
- [ ] Kid can write or dictate text on a page; TipTap saves richText + plainText
- [ ] Grammar check via Groq returns suggestions inline; kid accepts/rejects each
- [ ] Suggestions never rewrite for style — only fix grammar/spelling/punctuation
- [ ] Image generation per page works via existing image cascade
- [ ] Page navigator allows reorder, jump, append (up to pageLimit)
- [ ] Cover designer composes title/subtitle/author/image; saves regenerate coverThumbnail
- [ ] Flipbook preview renders cover + all pages
- [ ] Publish mints shareUrl + generates PDF; status moves to `published`
- [ ] PDF download works at locked book dimensions
- [ ] "Order print" button visible but disabled with "Notify me" CTA
- [ ] Free tier capped at 5 pages; paid kits 8/16/24/32, custom up to 40
- [ ] Book CRUD does not count toward creation rate limits; AI calls do
- [ ] Existing studios (Story/Music/Quiz/Game/Comic) unchanged
- [ ] All checks pass: `pnpm lint && pnpm build && pnpm test -- --run`
