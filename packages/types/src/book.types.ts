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
  createdAt: Date;
  updatedAt: Date;
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
  sessionId: string;
  userId: string | null;
  kidId: string | null;
  coverThumbnail: string | null;
  isPublic: boolean;
  publishedAt: Date | null;
  pdfUrl: string | null;
  printOrderEligible: boolean;
  shareUrl: string | null;
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
  coverThumbnail: string | null;
  updatedAt: Date;
}
