/** Book Studio types — kid-authored books with AI grammar assist + per-page illustrations.
 *  Distinct from `creation.types.ts` because books are multi-session authoring artifacts
 *  with locked layout fields and a `pages` subcollection. See docs/data-model.md#books. */

/** What the book contains per page */
export type BookFormat = 'text' | 'image' | 'text_image';

/** Trim size — LOCKED at creation. Drives `dimensions` and PDF rendering. */
export type BookSize = 'square' | 'tall' | 'pocket' | 'landscape';

/** Underlying page-structure bucket. The kid never sees this — it's how we map
 *  18 user-facing types onto 6 layout shapes. */
export type BookBucket =
  | 'narrative'
  | 'memoir_catalog'
  | 'entry_list'
  | 'collection'
  | 'concept'
  | 'visual';

/** 18 user-facing book types shown in the wizard */
export type BookType =
  | 'storybook'
  | 'picture_book'
  | 'about_me'
  | 'family'
  | 'travel'
  | 'recipe'
  | 'field_guide'
  | 'fact_book'
  | 'how_to'
  | 'science_log'
  | 'poem'
  | 'joke'
  | 'diary'
  | 'quote'
  | 'letter'
  | 'sketchbook'
  | 'wordless'
  | 'abc_counting';

/** Book lifecycle */
export type BookStatus = 'draft' | 'complete' | 'published';

/** Per-page layout variants. Allowed set varies by `bucket` (see BUCKET_LAYOUTS). */
export type PageLayout =
  | 'text_top_image_bottom'
  | 'image_top_text_bottom'
  | 'image_full_bleed'
  | 'text_only'
  | 'entry_centered'
  | 'recipe_split'
  | 'concept_letter'
  | 'gallery';

/** Frozen page dimensions derived from `size` at creation. */
export interface BookDimensions {
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
}

/** Default typography picked at creation; per-page overrides allowed. */
export interface BookTypography {
  titleFont: string;
  bodyFont: string;
  baseFontSize: number;
}

/** Front cover composition */
export interface BookCover {
  title: string;
  subtitle: string;
  authorName: string;
  backgroundColor: string;
  imageUrl: string | null;
  imagePrompt: string | null;
  font: string;
}

/** Optional back cover blurb */
/** Back cover content. Always rendered (even if all fields are empty) so the
 *  book has a real "back of book" feel — at minimum it shows the author name,
 *  the creation date, and GSI branding. Kid can fill in the other fields via
 *  the Cover designer. */
export interface BookBackCover {
  /** Book blurb / "About this book" — what the story is about. */
  text: string;
  /** Optional decorative image (e.g., a scene from the book). */
  imageUrl: string | null;
  /** "About the author" — short bio in the kid's own words. */
  authorBio: string | null;
  /** Author photo or avatar URL. Falls back to the first letter of author name. */
  authorPhotoUrl: string | null;
}

/** Per-page style override — falls back to book-level `typography`. */
export interface PageStyleOverride {
  font?: string;
  fontSize?: number;
  alignment?: 'left' | 'center' | 'right';
  textColor?: string;
  backgroundColor?: string;
}

/** Optional story plan — collected in the wizard for narrative books. Each
 *  beat is the kid's own short sentence (1-3 sentences). Used as a sidebar
 *  reference in the editor so the kid can see their plan while writing
 *  pages. NOT AI-generated. NOT auto-inserted into pages. */
export interface BookPlot {
  /** "What is your story about?" — the seed idea, often 1 sentence. */
  idea: string;
  /** "How does your story start?" */
  beginning: string;
  /** "What goes wrong?" */
  problem: string;
  /** "What happens next?" — the journey/adventure */
  adventure: string;
  /** "How does it end?" */
  ending: string;
}

/** A character that can recur across pages. Anchor image is generated once at
 *  setup and reused (verbatim look description) on every per-page scene
 *  generation so the character looks the same throughout the book. */
export interface BookCharacter {
  id: string;
  name: string;
  /** Verbatim physical description prepended to scene-image prompts.
   *  Locks down hair, clothing, age, distinguishing features. */
  lookDescription: string;
  /** Anchor portrait — generated once at character setup. */
  anchorImageUrl: string | null;
  /** Prompt used to generate the anchor (kept for re-roll & audit). */
  anchorPrompt: string | null;
  createdAt: Date;
}

/** A grammar suggestion from Groq for a chunk of page text. */
export interface GrammarSuggestion {
  id: string;
  type: 'grammar' | 'spelling' | 'punctuation';
  original: string;
  suggested: string;
  explanation: string;
  startIndex: number;
  endIndex: number;
  status: 'pending' | 'accepted' | 'rejected';
}

/** TipTap document JSON. We keep this loose because TipTap's official types live
 *  upstream and pinning them would tangle our types with the editor version. */
export interface TipTapDocument {
  type: 'doc';
  content?: unknown[];
}

/** How a piece of a book came into existence — drives the effort badge
 *  computation in BOOK-003. Per-page on `BookPage.authorship`, denormalized
 *  on `Book.authorship` for fast publish-time read. */
export type AuthorshipSource = 'ai_generated' | 'kid_written' | 'mixed';
export type ImageAuthorshipSource = 'ai_generated' | 'kid_added' | 'none';

/** Per-page authorship breakdown.
 *
 *  For AI-generated pages: `originalAiText` is frozen at creation. On every
 *  page save the server runs LCS(originalAiText, currentPlainText) to derive
 *  `aiCharCount` (surviving AI characters). `kidCharCount = max(0,
 *  currentLength - aiCharCount)`. This is the honest model: if the kid
 *  rewrites everything, AI drops to ~0 and the kid earns the full badge.
 *
 *  For kid-written pages: `originalAiText` is empty, `aiCharCount` stays
 *  0, and `kidCharCount` is just the current plainText length. */
export interface PageAuthorship {
  source: AuthorshipSource;
  /** Frozen at creation for AI-generated pages. Empty for kid_written. */
  originalAiText: string;
  /** Recomputed via LCS on every save. */
  aiCharCount: number;
  /** Current text length minus surviving AI chars, clamped >= 0. */
  kidCharCount: number;
  imageSource: ImageAuthorshipSource;
  lastEditedAt: Date;
}

/** A single page in the `books/{bookId}/pages` subcollection */
export interface BookPage {
  id: string;
  pageNumber: number;
  layout: PageLayout;
  richText: TipTapDocument | null;
  plainText: string;
  imageUrl: string | null;
  imagePrompt: string | null;
  imageStyle: string | null;
  voiceTranscriptRaw: string | null;
  grammarSuggestions: GrammarSuggestion[];
  style: PageStyleOverride | null;
  /** Provenance breakdown — drives the effort badge (BOOK-003).
   *  Optional for backwards-compat with pre-BOOK-002 pages; readers should
   *  treat missing values as 100% kid-written. */
  authorship: PageAuthorship | null;
  createdAt: Date;
  updatedAt: Date;
}

/** How a book started life — never changes after creation. */
export type BookInitialSource = 'ai_generated' | 'wizard_blank' | 'wizard_seeded';

/** Effort-badge keys (BOOK-003). One of these is awarded at publish. */
export type EffortBadgeKey =
  | 'pure_imagination'
  | 'co_author'
  | 'ai_sidekick'
  | 'ai_generated';

/** Denormalized authorship summary on the book doc. Recomputed by the server
 *  on every page write. Single read drives the effort badge at publish time. */
export interface BookAuthorship {
  initialSource: BookInitialSource;
  aiCharTotal: number;
  kidCharTotal: number;
  aiImagePageCount: number;
  kidImagePageCount: number;
  updatedAt: Date;
}

/** The effort badge awarded at publish (BOOK-003). null until publish. */
export interface EffortBadge {
  key: EffortBadgeKey;
  /** 0-100, rounded to 1 decimal. */
  aiPercentage: number;
  awardedAt: Date;
  /** Frozen snapshot for the "How was this earned?" tooltip. */
  breakdown: {
    aiCharTotal: number;
    kidCharTotal: number;
    aiImagePageCount: number;
    kidImagePageCount: number;
  };
}

/** Sales config (BOOK-004 Phase 1). Until Phase 2 ships, no actual purchases
 *  happen — `enabled=true` just lists the book on the shop with "Coming Soon"
 *  on the Buy button. */
export interface BookSales {
  enabled: boolean;
  /** INR. Bounded 10-999. Required when enabled. */
  priceInr: number | null;
  /** First time enabled flipped to true. Stable thereafter. */
  listedAt: Date | null;
}

/** Lifecycle of the async AI generation pipeline (BOOK-008). Distinct from
 *  `BookStatus` (which is the editorial lifecycle). `null` on non-AI / legacy
 *  books and on books created by the manual wizard. */
export type BookGenerationStatus = 'pending' | 'generating' | 'partial' | 'complete' | 'failed';
export type BookGenerationStep = 'queued' | 'drafting' | 'anchor' | 'images' | 'done';

/** Live progress of background book generation. The home tile reads this to
 *  show "Thinking up your story…" → "Drawing 2/5…", and to gate entry (the
 *  book isn't openable until `status` leaves `pending`/`generating`). */
export interface BookGeneration {
  status: BookGenerationStatus;
  step: BookGenerationStep;
  /** Expected page count for the in-progress bar. */
  pagesTotal: number;
  /** Pages whose image has rendered (success). */
  pagesRendered: number;
  coverRendered: boolean;
  anchorRendered: boolean;
  /** How many times the whole job has been (re)attempted. */
  attempts: number;
  /** Last error message when `status === 'failed'`. */
  error: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}

/** Slim generation summary carried on list items for the progress tile. */
export interface BookGenerationSummary {
  status: BookGenerationStatus;
  step: BookGenerationStep;
  pagesTotal: number;
  pagesRendered: number;
}

/** Top-level book document */
export interface Book {
  id: string;
  title: string;
  author: string;
  status: BookStatus;
  type: BookType;
  bucket: BookBucket;
  format: BookFormat;
  size: BookSize;
  dimensions: BookDimensions;
  typography: BookTypography;
  cover: BookCover;
  backCover: BookBackCover | null;
  /** Up to 3 characters that appear across pages (narrative books only).
   *  Empty for diary/recipe/joke/etc. Their lookDescription is reused verbatim
   *  when generating per-page scene images so faces/clothes stay consistent. */
  characters: BookCharacter[];
  /** Optional story plan (idea + 4 beats). Narrative books only. Shown in
   *  the editor as a reference sidebar so the kid can write pages knowing
   *  where they're going. Empty fields = "kid skipped this beat". */
  plot: BookPlot | null;
  pageCount: number;
  pageLimit: number;
  themeColor: string | null;
  /** Image seed pinned across the cover + every AI-generated page so the hero
   *  and palette stay consistent (BOOK-002). Persisted so later per-page
   *  regeneration can reuse it. Optional/null for pre-BOOK-002 books and books
   *  whose images were all kid-added. */
  imageSeed?: number | null;
  sessionId: string;
  userId: string | null;
  kidId: string | null;
  coverThumbnail: string | null;
  isPublic: boolean;
  publishedAt: Date | null;
  pdfUrl: string | null;
  printOrderEligible: boolean;
  shareUrl: string | null;
  /** Authorship summary (BOOK-002). Optional for pre-BOOK-002 books; treat
   *  missing as wizard_blank with zero AI characters. */
  authorship: BookAuthorship | null;
  /** Effort badge (BOOK-003). null until the book is published. */
  effortBadge: EffortBadge | null;
  /** Sales config (BOOK-004 Phase 1). null until author opts in. */
  sales: BookSales | null;
  /** Async generation progress (BOOK-008). null for manual-wizard / legacy books. */
  generation: BookGeneration | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Library list-item shape — denormalized for fast listing */
export interface BookListItem {
  id: string;
  title: string;
  type: BookType;
  size: BookSize;
  pageCount: number;
  pageLimit: number;
  status: BookStatus;
  /** Async generation summary for in-progress tiles (BOOK-008); null when not
   *  AI-generating. Drives the progress bar + "not openable yet" gating. */
  generation: BookGenerationSummary | null;
  coverThumbnail: string | null;
  /** Effort badge for the kid's library/gallery card (BOOK-003).
   *  null on drafts and on books published before BOOK-003. */
  effortBadge: EffortBadge | null;
  /** Sales config (BOOK-004 Phase 1). null when the author hasn't set up
   *  sales yet. Exposed in the list shape so surfaces like PlayerCard can
   *  count "X books in shop" without fetching each book individually. */
  sales: BookSales | null;
  updatedAt: Date;
}
