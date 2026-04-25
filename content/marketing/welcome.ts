/**
 * Welcome page copy — single source of truth.
 *
 * To change live copy:
 *   1. Add or edit a variant under heroVariants below.
 *   2. Set `activeHero` (bottom of file) to the variant key you want live.
 *
 * To preview a variant without changing the default:
 *   Add ?heroVariant=<key> to the welcome URL, e.g.
 *   /welcome?heroVariant=v2_kid_magnetic
 *
 * Adding a new variant?
 *   - Pick a memorable key like `v6_<angle>` (kid_magnetic, parent_first, etc.)
 *   - Keep `headlinePrefix` short — the highlighted span renders inline.
 *   - All fields are required (TypeScript will catch missing keys).
 */

export interface HeroCopy {
  /** Small pill above the headline (e.g. "Aligned to CBSE..."). */
  eyebrow: string;
  /** Plain text before the gradient highlight. */
  headlinePrefix: string;
  /** Gradient-highlighted text that closes the headline. */
  headlineHighlight: string;
  /** One-paragraph subheadline shown below the headline. */
  subhead: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  /** Tiny trust strip directly under the CTAs. Order = display order. */
  trustChips: string[];
}

export interface HeroStep {
  num: string;
  label: string;
}

/** Steps shown in the inline 3-step strip — factual and shared across variants. */
export const HERO_STEPS: HeroStep[] = [
  { num: '01', label: 'Pick a studio' },
  { num: '02', label: 'Describe an idea' },
  { num: '03', label: 'Share + learn' },
];

export const heroVariants = {
  /* ─── v1: parent-careerist (current default) ────────────────────────── */
  v1_career: {
    eyebrow: 'Aligned to CBSE AI & Computational Thinking · 2026-27',
    headlinePrefix: 'From first story to',
    headlineHighlight: 'first AI engineer.',
    subhead:
      'Indian kids build stories, music, quizzes and games with AI — and discover how AI actually works while they create. Safe by default. Shareable in one tap. Built for ages 8–17.',
    primaryCta: { label: 'Start creating — free', href: '/create/story' },
    secondaryCta: { label: 'For schools', href: '#schools' },
    trustChips: [
      '100% child-safe outputs',
      'No credit card · Free forever tier',
      '10 studios · 12 badges · WhatsApp-ready',
    ],
  },

  /* ─── v2: kid-magnetic (kids feel social pull, parents read "creative") */
  v2_kid_magnetic: {
    eyebrow: 'CBSE AI & CT-aligned · Ages 8–17',
    headlinePrefix: 'Make stuff other kids',
    headlineHighlight: 'actually want to see.',
    subhead:
      'Stories, songs, comics and games — made with AI, built by you. Real learning. Real fun. Safe by default. Shareable in one tap.',
    primaryCta: { label: 'Start creating — free', href: '/create/story' },
    secondaryCta: { label: 'For schools', href: '#schools' },
    trustChips: [
      '100% child-safe outputs',
      'CBSE AI & CT-aligned',
      'Free forever tier',
    ],
  },

  /* ─── v3: kid-question (open invitation, low pressure) ──────────────── */
  v3_kid_question: {
    eyebrow: 'AI creation for Indian kids · ages 8–17',
    headlinePrefix: 'What will you',
    headlineHighlight: 'make today?',
    subhead:
      'Indian kids spin up stories, songs, comics, quizzes and games with AI — and learn how AI actually works while they create. CBSE-aligned. Safe. Shareable.',
    primaryCta: { label: 'Make something — free', href: '/create/story' },
    secondaryCta: { label: 'For schools', href: '#schools' },
    trustChips: [
      '10 studios · 12 badges',
      '100% child-safe outputs',
      'No credit card needed',
    ],
  },

  /* ─── v4: sidekick (kid-empowerment, agency-first) ──────────────────── */
  v4_sidekick: {
    eyebrow: 'CBSE AI & CT curriculum · 2026-27',
    headlinePrefix: 'AI is your sidekick.',
    headlineHighlight: "You're the boss.",
    subhead:
      'Direct AI to make stories, songs, games and comics — and see exactly how each one was made. Built for Indian kids, ages 8–17. Free forever tier.',
    primaryCta: { label: 'Start creating — free', href: '/create/story' },
    secondaryCta: { label: 'For schools', href: '#schools' },
    trustChips: [
      'Safe by default',
      'No credit card needed',
      'WhatsApp-ready creations',
    ],
  },

  /* ─── v5: parent-first ("screen time worth keeping") ────────────────── */
  v5_parent_first: {
    eyebrow: 'CBSE AI & CT curriculum · India',
    headlinePrefix: 'Where Indian kids learn AI by',
    headlineHighlight: 'making — not watching.',
    subhead:
      'A safe, CBSE-aligned creation studio for ages 8–17. Kids build real things — stories, music, games — and learn how AI works in the process. Screen time worth keeping.',
    primaryCta: { label: 'Start free trial', href: '/create/story' },
    secondaryCta: { label: 'See how it works', href: '#schools' },
    trustChips: [
      '100% child-safe outputs',
      'CBSE 2026-27 AI & CT-aligned',
      'Free forever tier',
    ],
  },

  /* ─── v6: screen-time permission ────────────────────────────────────── */
  v6_screen_time: {
    eyebrow: 'CBSE AI & CT curriculum · India',
    headlinePrefix: "The screen time you'll be",
    headlineHighlight: 'glad they had.',
    subhead:
      'An AI creation studio for Indian kids ages 8–17. They make stories, music and games — and walk away knowing how AI actually works. CBSE AI & CT-aligned. Safe by default.',
    primaryCta: { label: 'Start free trial', href: '/create/story' },
    secondaryCta: { label: 'See how it works', href: '#schools' },
    trustChips: [
      '100% child-safe outputs',
      'CBSE 2026-27 AI & CT-aligned',
      'Free forever tier',
    ],
  },

  /* ─── v7: realist urgency (kids will use AI — direct it) ─────────────── */
  v7_realist: {
    eyebrow: 'CBSE AI & CT-aligned · ages 8–17',
    headlinePrefix: 'Indian kids are using AI anyway.',
    headlineHighlight: 'Teach them to use it well.',
    subhead:
      'A safe, CBSE-aligned creation studio for ages 8–17. Kids learn what AI can do, where it gets things wrong, and how to direct it — by making real things. Free forever tier.',
    primaryCta: { label: 'Get started — free', href: '/create/story' },
    secondaryCta: { label: 'See how it works', href: '#schools' },
    trustChips: [
      '100% child-safe outputs',
      'CBSE AI & CT-aligned',
      'Free forever tier',
    ],
  },

  /* ─── v9: use → understand (build literacy, not just usage) ──────────── */
  v9_understand: {
    eyebrow: 'CBSE AI & CT curriculum · 2026-27',
    headlinePrefix: "Your kid won't just use AI.",
    headlineHighlight: "They'll learn how it works.",
    subhead:
      'A creation studio for Indian kids ages 8–17. Aligned to the CBSE AI & Computational Thinking curriculum. Every output is safe, shareable, and built by them — not for them.',
    primaryCta: { label: 'Start free trial', href: '/create/story' },
    secondaryCta: { label: 'See how it works', href: '#schools' },
    trustChips: [
      '100% child-safe outputs',
      'CBSE 2026-27 AI & CT-aligned',
      'Free forever tier',
    ],
  },
} satisfies Record<string, HeroCopy>;

export type HeroVariantKey = keyof typeof heroVariants;

/* ─── Active variant — change THIS line to swap the live hero copy. ──── */
export const activeHero: HeroCopy = heroVariants.v1_career;

/** Resolve a variant key from a URL search param, falling back to the active default. */
export function resolveHeroCopy(variantParam: string | null | undefined): HeroCopy {
  if (variantParam && variantParam in heroVariants) {
    return heroVariants[variantParam as HeroVariantKey];
  }
  return activeHero;
}
