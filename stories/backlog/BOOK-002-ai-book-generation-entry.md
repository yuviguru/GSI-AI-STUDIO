# BOOK-002: AI Book Generation Entry Point — reduce blank-page friction

> The user explicitly asked for this: "If we give full manual generation at the start, for each page they have to add, there is great friction, and they might not do it at all." The single biggest UX risk for Book Studio is the blank page. This story fixes that.

## Scope

When a kid taps "New Book", show a 2-option chooser BEFORE the wizard:

1. **Write it myself** (existing flow — NewBookWizard step-by-step)
2. **Generate with AI** (new flow — single form → full draft book)

After AI-generated draft lands, kid is dropped into the existing book editor with all pages prefilled. They can keep, edit, or delete any page. **Every keystroke they make is tracked** so BOOK-003 can compute the AI-vs-kid ratio at publish time.

### In scope (this story)

- New `BookCreationMode` chooser component shown when "Create a Book" is tapped
- New AI-Generate form: topic + age + style + page count (5 for free, up to limit for paid)
- New API endpoint `POST /api/ai/book-generate` — generates title, cover prompt, and N pages of `{richText, imagePrompt}` in one Claude call. Triggers page-image generation per page in parallel.
- New service method `bookService.createGeneratedBook()` — creates Book + pages atomically with all `authorship.source='ai_generated'` flags set
- `BookPage.authorship` field added to schema (seeds BOOK-003)
- `Book.authorship` summary field (denormalized for fast badge lookup)
- "Try writing your own page" nudge banner shown after the kid has scrolled past N AI-generated pages without editing one
- Track per-page edits in BookEditorClient so AI characters can decay as kid types

### Out of scope (deferred to follow-up)

- **Multi-turn conversational agent** (user said "conversational agent" — I'm shipping single-form first because it's the fastest path to value and we can A/B against multi-turn later). Follow-up story: `BOOK-002-FOLLOWUP-multi-turn`.
- **AI-generated character setup** — characters are skipped for AI books (the AI just generates scenes without locked cast). Adding locked-cast generation is a separate story.
- **AI-generated plot beats** — same as above, the BookPlot field stays null for AI books.
- **Streaming generation** — first version blocks until all pages are drafted. A 10-page book takes ~30s. Streaming is a follow-up polish.

## Data model additions

### `BookPage.authorship` (NEW)

| Field | Type | Required | Description |
|---|---|---|---|
| source | `'ai_generated' \| 'kid_written' \| 'mixed'` | yes | Initial provenance |
| aiCharCount | number | yes | Original character count from AI generation (frozen) |
| kidCharCount | number | yes | Character count of current `plainText` minus surviving AI chars |
| imageSource | `'ai_generated' \| 'kid_added' \| 'none'` | yes | Where the image came from |
| lastEditedAt | timestamp | yes | When kid last touched this page |

**Edit-time decay**: when the kid edits a page, we compare current `plainText` against the original AI text using a simple diff to compute "surviving AI chars". The `kidCharCount = currentLength - survivingAiChars`. The `source` flips to `'mixed'` once `kidCharCount > 0`.

### `Book.authorship` (NEW — denormalized summary)

| Field | Type | Required | Description |
|---|---|---|---|
| initialSource | `'ai_generated' \| 'wizard_blank' \| 'wizard_seeded'` | yes | How the book started |
| aiCharTotal | number | yes | Sum of `aiCharCount` across all current pages |
| kidCharTotal | number | yes | Sum of `kidCharCount` across all current pages |
| aiImagePageCount | number | yes | Pages where `imageSource === 'ai_generated'` |
| kidImagePageCount | number | yes | Pages where `imageSource === 'kid_added'` |
| updatedAt | timestamp | yes | Last edit that touched authorship |

This is denormalized so the publish-time badge lookup is a single read. Recomputed on every page write.

## API

### `POST /api/ai/book-generate` (NEW)

**Request:**
```json
{
  "topic": "A dragon who is afraid of the dark",
  "age": 8,
  "style": "funny",
  "type": "storybook",
  "format": "text_image",
  "pageCount": 5,
  "size": "square",
  "title": "(optional, otherwise AI generates)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookId": "abc123",
    "redirectUrl": "/create/book/abc123",
    "pagesGenerated": 5,
    "creditsCharged": 25
  }
}
```

**Implementation:**
1. Validate input (Zod)
2. `assertEntitled` for credits (cost: 5 credits + 4 per page for images, see creditCosts)
3. Single Claude call generates: book title, cover prompt, plus N `{richText, imagePrompt}` entries
4. Create Book doc with `authorship.initialSource='ai_generated'`
5. Create pages in parallel; for each, fire-and-forget the page-image generation (existing pipeline)
6. Pages render with `<Loading…>` placeholders for images until they resolve
7. Return bookId; client redirects to editor

### `PATCH /api/books/[id]/pages/[pageId]` — extend existing

Already exists. Extended to recompute authorship counts when `plainText` changes. Server-side only — client doesn't compute the diff.

## UX

### Two-option chooser (`BookCreationModeChooser.tsx`)

Replaces the direct path from `BookStudioClient.openWizard()` to `NewBookWizard`. Shown as a sheet/modal before the wizard renders.

```
┌───────────────────────────────────────┐
│        How do you want to start?      │
│                                       │
│  ┌─────────────────┐ ┌──────────────┐ │
│  │   ✍️ Write it    │ │  ✨ Generate │ │
│  │   myself        │ │  with AI    │ │
│  │                 │ │             │ │
│  │ Page by page,   │ │ Tell me     │ │
│  │ your own words. │ │ what you    │ │
│  │ AI helps with   │ │ want — I'll │ │
│  │ grammar.        │ │ draft it.   │ │
│  └─────────────────┘ └──────────────┘ │
│                                       │
│       [ small print: badges  ]        │
│   "Both paths track who did what so   │
│   your effort badge is honest."       │
└───────────────────────────────────────┘
```

The small print educates the kid early — they see badges before they generate so they understand the trade-off (AI=fast but cheaper badge; kid=slow but Pure Imagination).

### AI-Generate form (`AiGenerateBookForm.tsx`)

Single-form, 4 fields:
- **Topic** (long text input, multi-line, placeholder "A dragon who is afraid of the dark")
- **Age** (chip picker 6/8/10/12)
- **Style** (chip picker: funny / brave / silly / scary / sweet / mysterious)
- **Pages** (chip picker — free: 5; paid: 8/10/16)

Footer: "We'll draft your whole book. You can edit anything after — and the more you edit, the better your effort badge."

Mascot appears with "thinking" expression while generation runs.

### Editor nudge (`AuthorYourOwnNudge.tsx`)

After the AI book lands in the editor:
- If `book.authorship.initialSource === 'ai_generated'` and the kid has visited >= 3 pages without editing any, show a dismissible banner:
  - "✨ This book was drafted by AI. Try rewriting a page in your own words — your badge gets better the more you make it yours!"
- Dismissed state persists in localStorage so we don't nag.

## Open questions (logged for follow-up, NOT blocking)

- Cost: should AI book generation drain a much higher credit bucket than per-page generation? Currently doing 5 + 4×pages (so 5-page book = 25 credits). May want a flat bigger rate to discourage repeat-spam.
- AI-generated character continuity — currently NO locked cast for AI books, so faces drift between pages. Acceptable for v1 (since it's a draft), but worth adding "regenerate with locked cast" in v2.
- Should we generate a back-cover blurb too? Defaulting to skipping it — kid can write their own.

## Acceptance criteria

- [ ] Tapping "New Book" anywhere shows the 2-option chooser; clicking "Write it myself" continues the existing flow unchanged
- [ ] Clicking "Generate with AI" → form → submitting calls `/api/ai/book-generate` → redirects to editor with N pages prefilled
- [ ] Each AI-generated page has `authorship: { source: 'ai_generated', aiCharCount: <len>, kidCharCount: 0, imageSource: 'ai_generated', ... }`
- [ ] Book has `authorship.initialSource === 'ai_generated'`, `aiCharTotal === sum(pages.aiCharCount)`
- [ ] Editing a page updates `pages[i].kidCharCount` and rolls into `book.authorship.kidCharTotal`
- [ ] Nudge banner appears once after browsing 3 AI pages without edits, dismissible
- [ ] `pnpm build`, `pnpm lint`, `pnpm test --run` all green
- [ ] Manual smoke: generate a 5-page book about a dragon, verify pages prefilled, edit one page, confirm authorship counts update
