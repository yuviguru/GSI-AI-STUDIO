import type {
  BookBucket,
  BookDimensions,
  BookFormat,
  BookSize,
  BookType,
  PageLayout,
} from '@/types/book.types';

export interface BookTypeCard {
  type: BookType;
  label: string;
  emoji: string;
  bucket: BookBucket;
  defaultFormat: BookFormat;
  defaultLayouts: PageLayout[];
  suggestedThemeColor: string;
  description: string;
  samplePrompts: string[];
}

/** 18 friendly book-type cards shown in the wizard. Each maps to one of 6 buckets
 *  under the hood — kid never sees the bucket name. */
export const BOOK_TYPE_CARDS: BookTypeCard[] = [
  // narrative bucket
  {
    type: 'storybook',
    label: 'Storybook',
    emoji: '📖',
    bucket: 'narrative',
    defaultFormat: 'text_image',
    defaultLayouts: ['text_top_image_bottom', 'image_top_text_bottom', 'image_full_bleed'],
    suggestedThemeColor: '#5B5FFF',
    description: 'A story you write — adventure, fantasy, mystery, anything you imagine.',
    samplePrompts: [
      'A girl who can talk to her pet parrot',
      'A robot lost in a candy factory',
      'Two friends find a magic doorway in their school',
    ],
  },
  {
    type: 'picture_book',
    label: 'Picture Book',
    emoji: '🖼',
    bucket: 'narrative',
    defaultFormat: 'text_image',
    defaultLayouts: ['image_full_bleed', 'image_top_text_bottom'],
    suggestedThemeColor: '#FF9F43',
    description: 'Big illustrations, short text — great for younger readers.',
    samplePrompts: ['A day in the life of a butterfly', 'The puppy who learned to swim'],
  },

  // memoir_catalog bucket
  {
    type: 'about_me',
    label: 'About Me',
    emoji: '🙋',
    bucket: 'memoir_catalog',
    defaultFormat: 'text_image',
    defaultLayouts: ['text_top_image_bottom', 'text_only'],
    suggestedThemeColor: '#8A5CFF',
    description: 'Your story so far — your favourites, dreams, what makes you you.',
    samplePrompts: [
      'My favourite hobby is...',
      'A funny memory from school',
      'When I grow up I want to...',
    ],
  },
  {
    type: 'family',
    label: 'My Family',
    emoji: '👨‍👩‍👧',
    bucket: 'memoir_catalog',
    defaultFormat: 'text_image',
    defaultLayouts: ['text_top_image_bottom'],
    suggestedThemeColor: '#20C997',
    description: 'A book about your family — people, traditions, places.',
    samplePrompts: ['About my Dadi', 'Our family Diwali', 'My cousins'],
  },
  {
    type: 'travel',
    label: 'Travel Diary',
    emoji: '✈️',
    bucket: 'memoir_catalog',
    defaultFormat: 'text_image',
    defaultLayouts: ['image_top_text_bottom', 'text_top_image_bottom'],
    suggestedThemeColor: '#FF9F43',
    description: 'Capture a trip — places, food, things you saw and did.',
    samplePrompts: ['Our trip to Goa', 'Day 1 in the Himalayas', "My summer at Nani's"],
  },

  // entry_list bucket
  {
    type: 'recipe',
    label: 'Recipe Book',
    emoji: '🍳',
    bucket: 'entry_list',
    defaultFormat: 'text_image',
    defaultLayouts: ['recipe_split', 'text_top_image_bottom'],
    suggestedThemeColor: '#FF9F43',
    description: 'Family recipes, snacks you love, things you can cook.',
    samplePrompts: [
      "Aloo paratha (Mom's recipe)",
      'My famous mango lassi',
      'Easy after-school sandwich',
    ],
  },
  {
    type: 'field_guide',
    label: 'Field Guide',
    emoji: '🦋',
    bucket: 'entry_list',
    defaultFormat: 'text_image',
    defaultLayouts: ['image_top_text_bottom', 'text_top_image_bottom'],
    suggestedThemeColor: '#20C997',
    description: 'Animals, plants, anything you observe — one entry per page.',
    samplePrompts: ['Birds in my garden', 'Bugs I found this week', 'Trees on my street'],
  },
  {
    type: 'fact_book',
    label: 'All About...',
    emoji: '🌍',
    bucket: 'entry_list',
    defaultFormat: 'text_image',
    defaultLayouts: ['text_top_image_bottom', 'image_top_text_bottom'],
    suggestedThemeColor: '#5B5FFF',
    description: 'Fact book on a topic you love — dinosaurs, space, cricket, anything.',
    samplePrompts: ['All about dinosaurs', 'Cool facts about space', 'My cricket book'],
  },
  {
    type: 'how_to',
    label: 'How To',
    emoji: '🛠',
    bucket: 'entry_list',
    defaultFormat: 'text_image',
    defaultLayouts: ['recipe_split', 'text_top_image_bottom'],
    suggestedThemeColor: '#8A5CFF',
    description: 'Step-by-step guide for things you know how to do.',
    samplePrompts: [
      'How to make a paper plane',
      'How to take care of a plant',
      'How to play hopscotch',
    ],
  },
  {
    type: 'science_log',
    label: 'Science Log',
    emoji: '🔬',
    bucket: 'entry_list',
    defaultFormat: 'text_image',
    defaultLayouts: ['recipe_split', 'text_top_image_bottom'],
    suggestedThemeColor: '#20C997',
    description: 'Experiments, observations, and what you learned.',
    samplePrompts: ['My volcano experiment', 'Watching seeds grow', 'Why does rain happen?'],
  },

  // collection bucket
  {
    type: 'poem',
    label: 'Poem Book',
    emoji: '📝',
    bucket: 'collection',
    defaultFormat: 'text',
    defaultLayouts: ['entry_centered', 'text_only'],
    suggestedThemeColor: '#8A5CFF',
    description: 'One poem per page — yours.',
    samplePrompts: ['A poem about the rain', 'My funniest poem', 'Acrostic of my name'],
  },
  {
    type: 'joke',
    label: 'Joke Book',
    emoji: '😂',
    bucket: 'collection',
    defaultFormat: 'text',
    defaultLayouts: ['entry_centered'],
    suggestedThemeColor: '#FF9F43',
    description: 'Jokes and riddles you love.',
    samplePrompts: ['Why did the chicken...', 'Riddle: I have keys but...'],
  },
  {
    type: 'diary',
    label: 'Diary',
    emoji: '📓',
    bucket: 'collection',
    defaultFormat: 'text',
    defaultLayouts: ['text_only', 'entry_centered'],
    suggestedThemeColor: '#5B5FFF',
    description: 'Daily entries — a record of you.',
    samplePrompts: [
      'Today was...',
      'The best part of my day was...',
      'Something I want to remember:',
    ],
  },
  {
    type: 'quote',
    label: 'Quote Book',
    emoji: '💬',
    bucket: 'collection',
    defaultFormat: 'text',
    defaultLayouts: ['entry_centered'],
    suggestedThemeColor: '#20C997',
    description: 'Sayings, quotes, and words you love.',
    samplePrompts: ['A quote from my favourite book', 'Something my grandma always says'],
  },
  {
    type: 'letter',
    label: 'Letter Book',
    emoji: '✉️',
    bucket: 'collection',
    defaultFormat: 'text',
    defaultLayouts: ['text_only'],
    suggestedThemeColor: '#FF9F43',
    description: 'Letters to people, places, or your future self.',
    samplePrompts: ['A letter to my future self', 'A letter to my best friend'],
  },

  // concept bucket
  {
    type: 'abc_counting',
    label: 'ABC / Counting',
    emoji: '🔤',
    bucket: 'concept',
    defaultFormat: 'text_image',
    defaultLayouts: ['concept_letter', 'image_top_text_bottom'],
    suggestedThemeColor: '#5B5FFF',
    description: 'A is for Apple… or 1 is for Sun. Big letters/numbers + pictures.',
    samplePrompts: ['A is for Aam (mango)', '1, 2, 3 — counting flowers'],
  },

  // visual bucket
  {
    type: 'sketchbook',
    label: 'Sketchbook',
    emoji: '🎨',
    bucket: 'visual',
    defaultFormat: 'image',
    defaultLayouts: ['image_full_bleed', 'gallery'],
    suggestedThemeColor: '#8A5CFF',
    description: 'Your art collection — drawings or AI illustrations.',
    samplePrompts: ['My doodles this week', 'Things I imagined'],
  },
  {
    type: 'wordless',
    label: 'Wordless Story',
    emoji: '🌅',
    bucket: 'visual',
    defaultFormat: 'image',
    defaultLayouts: ['image_full_bleed'],
    suggestedThemeColor: '#FF9F43',
    description: 'A story told in pictures only — no words needed.',
    samplePrompts: ['A day at the beach (in pictures)', 'The kite that got away'],
  },
];

/** Layouts allowed per bucket. Page-level `layout` field must be in this list for the book's bucket. */
export const BUCKET_LAYOUTS: Record<BookBucket, PageLayout[]> = {
  narrative: ['text_top_image_bottom', 'image_top_text_bottom', 'image_full_bleed', 'text_only'],
  memoir_catalog: ['text_top_image_bottom', 'image_top_text_bottom', 'text_only'],
  entry_list: ['text_top_image_bottom', 'image_top_text_bottom', 'recipe_split'],
  collection: ['entry_centered', 'text_only'],
  concept: ['concept_letter', 'image_top_text_bottom'],
  visual: ['image_full_bleed', 'gallery'],
};

interface BookSizeMeta extends BookDimensions {
  label: string;
  description: string;
}

/** Trim sizes — locked at creation. mm = print, px = canvas (300dpi for print quality). */
export const BOOK_SIZES: Record<BookSize, BookSizeMeta> = {
  square: {
    label: 'Square',
    description: '8" × 8" — picture-book classic',
    widthMm: 203,
    heightMm: 203,
    widthPx: 2400,
    heightPx: 2400,
  },
  tall: {
    label: 'Tall',
    description: '8.5" × 11" — journals, fact books',
    widthMm: 216,
    heightMm: 279,
    widthPx: 2550,
    heightPx: 3300,
  },
  pocket: {
    label: 'Pocket',
    description: '5.5" × 8.5" — poems, jokes, diary',
    widthMm: 140,
    heightMm: 216,
    widthPx: 1650,
    heightPx: 2550,
  },
  landscape: {
    label: 'Landscape',
    description: '11" × 8.5" — wordless, photo books',
    widthMm: 279,
    heightMm: 216,
    widthPx: 3300,
    heightPx: 2550,
  },
};

export interface BookFontOption {
  id: string;
  name: string;
  vibe: string;
  googleFontsUrl: string;
}

/** Curated kid-friendly fonts (all free Google Fonts) */
export const BOOK_FONTS: readonly BookFontOption[] = [
  {
    id: 'quicksand',
    name: 'Quicksand',
    vibe: 'Friendly, geometric — default',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;700&display=swap',
  },
  {
    id: 'lexend',
    name: 'Lexend',
    vibe: 'Reading-optimized, dyslexia-friendly',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;700&display=swap',
  },
  {
    id: 'lora',
    name: 'Lora',
    vibe: 'Friendly serif, real-book feel',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;700&display=swap',
  },
  {
    id: 'patrick_hand',
    name: 'Patrick Hand',
    vibe: 'Handwritten, personal',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap',
  },
  {
    id: 'fredoka',
    name: 'Fredoka',
    vibe: 'Playful display, great for covers',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;700&display=swap',
  },
  {
    id: 'comic_neue',
    name: 'Comic Neue',
    vibe: 'Kid-classic without the Comic Sans baggage',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap',
  },
] as const;

export type BookFontId = (typeof BOOK_FONTS)[number]['id'];

export interface BookKitPreset {
  label: string;
  pageLimit: number;
  tier: 'free' | 'paid';
  description?: string;
  recommended?: boolean;
}

/** Page-count kits — tier-gated. Custom up to 40 max. */
export const BOOK_KIT_PRESETS: readonly BookKitPreset[] = [
  {
    label: 'Mini (5 pages)',
    pageLimit: 5,
    tier: 'free',
    description: 'Perfect for a first book',
  },
  { label: 'Short (8 pages)', pageLimit: 8, tier: 'paid' },
  { label: 'Standard (16 pages)', pageLimit: 16, tier: 'paid' },
  {
    label: 'Picture Book (24 pages)',
    pageLimit: 24,
    tier: 'paid',
    recommended: true,
    description: 'Industry standard for picture books',
  },
  { label: 'Full Book (32 pages)', pageLimit: 32, tier: 'paid' },
] as const;

/** Free-tier hard cap on pageLimit. */
export const FREE_TIER_PAGE_LIMIT = 5;

/** Paid-tier hard cap (custom kit). Below industry "completable" threshold for kids. */
export const PAID_TIER_PAGE_MAX = 40;

/** Look up a type card by its `type`. Returns undefined for unknown types. */
export function getBookTypeCard(type: BookType): BookTypeCard | undefined {
  return BOOK_TYPE_CARDS.find((c) => c.type === type);
}

/** Validate that a (type, bucket) pair is internally consistent — bucket must
 *  match the bucket the type card declares. Format and size are independent. */
export function isValidTypeBucket(type: BookType, bucket: BookBucket): boolean {
  const card = getBookTypeCard(type);
  return card !== undefined && card.bucket === bucket;
}

/** Returns true if the layout is allowed for the given bucket. */
export function isLayoutAllowedForBucket(layout: PageLayout, bucket: BookBucket): boolean {
  return BUCKET_LAYOUTS[bucket].includes(layout);
}
