/**
 * Mascot Roster — Diverse AI buddies for kids ages 8-17
 *
 * 8 mascots covering different temperaments and likings (not just animals).
 * Each mascot is tied to a kid's profile and serves as their personal AI
 * companion throughout the GSI AI Studio experience.
 *
 * Pilot phase: Pixie is the only unlocked mascot and the brand default.
 * Other mascots are flagged `comingSoon` — visible in the picker but locked
 * with a "Coming soon" badge — so we ship the system end-to-end before all
 * Lottie art is finalised.
 *
 * Animation channel: when `lottie` is set, MascotAvatar renders the Lottie
 * file instead of the emoji placeholder. Path is relative to /public.
 */

export type MascotVibe =
  | 'playful'
  | 'techy'
  | 'mystical'
  | 'bold'
  | 'curious'
  | 'calm'
  | 'creative'
  | 'heroic';

export type MascotKind = 'animal' | 'fantasy' | 'sci-fi' | 'cosmic';

export interface Mascot {
  id: string;
  name: string;
  /** Short kid-facing tagline (≤6 words). */
  tagline: string;
  /** First-person greeting line for onboarding ("Hi, I'm…"). */
  greeting: string;
  /** Short description of the mascot's personality. */
  personality: string;
  vibe: MascotVibe;
  kind: MascotKind;
  /** Emoji used as placeholder art (always available, used as Lottie fallback). */
  art: string;
  /** Public path to a self-contained Lottie JSON. When set, takes precedence
   *  over `art` in MascotAvatar. Add new poses by extending this to a record
   *  later (e.g. `lottie: { default: '...', happy: '...' }`). */
  lottie?: string;
  /** Tailwind gradient classes for the mascot's signature card background. */
  gradient: string;
  /** Bolder Supercell-style gradient used by the picker card (saturated,
   *  full-bleed). Falls back to `gradient` if not set. */
  cardGradient?: string;
  /** Tailwind ring color used when the mascot card is selected. */
  ringColor: string;
  /** Tailwind background for the soft tile. */
  softBg: string;
  /** Public path to a hero character render (PNG/WEBP, transparent bg).
   *  Used by the Supercell-style picker card. Drop generated art into
   *  /public/mascots/<id>.png (or .webp) and set this field. Falls back to
   *  the emoji `art` until the asset ships. */
  heroImage?: string;
  /** When true, the picker shows a "Coming soon" badge and disables selection.
   *  All non-Pixie mascots are flagged this way until their Lottie art ships. */
  comingSoon?: boolean;
}

export const MASCOTS: readonly Mascot[] = [
  {
    id: 'pixie',
    name: 'Pixie',
    tagline: 'The helper bot',
    greeting: "Beep! I'm Pixie. I'll show you the wires inside every AI.",
    personality: 'Curious tinkerer. Loves taking things apart and explaining how they work.',
    vibe: 'techy',
    kind: 'sci-fi',
    art: '🤖',
    lottie: '/lottie/pixie-default.json',
    gradient: 'from-cyan-200 via-sky-100 to-blue-100',
    cardGradient: 'from-cyan-400 via-sky-500 to-blue-600',
    ringColor: 'ring-cyan-400',
    softBg: 'bg-cyan-50',
    heroImage: '/mascots/pixie.png',
  },
  {
    id: 'koko',
    name: 'Koko',
    tagline: 'The cosmic fox',
    greeting: "Hi, I'm Koko! Ready to explore some wild ideas with me?",
    personality: 'Playful and full of wonder. Loves silly stories and surprise plot twists.',
    vibe: 'playful',
    kind: 'animal',
    art: '🦊',
    gradient: 'from-orange-200 via-amber-100 to-rose-100',
    cardGradient: 'from-orange-400 via-amber-500 to-rose-500',
    ringColor: 'ring-orange-400',
    softBg: 'bg-orange-50',
    heroImage: '/mascots/koko.png',
    comingSoon: true,
  },
  {
    id: 'aria',
    name: 'Aria',
    tagline: 'The starlit owl',
    greeting: "Hello there, I'm Aria. I see what others miss in the dark.",
    personality: 'Calm and wise. Notices small details and asks good questions.',
    vibe: 'mystical',
    kind: 'fantasy',
    art: '🦉',
    gradient: 'from-violet-200 via-indigo-100 to-purple-100',
    cardGradient: 'from-violet-500 via-indigo-600 to-purple-700',
    ringColor: 'ring-violet-400',
    softBg: 'bg-violet-50',
    heroImage: '/mascots/aria.png',
    comingSoon: true,
  },
  {
    id: 'bolt',
    name: 'Bolt',
    tagline: 'The lightning dragon',
    greeting: "I'm Bolt — let's make something LOUD and fast!",
    personality: 'Bold, fearless, and a little dramatic. Cheers you on through every challenge.',
    vibe: 'bold',
    kind: 'fantasy',
    art: '🐉',
    gradient: 'from-rose-200 via-red-100 to-orange-100',
    cardGradient: 'from-rose-500 via-red-600 to-orange-600',
    ringColor: 'ring-rose-400',
    softBg: 'bg-rose-50',
    heroImage: '/mascots/bolt.png',
    comingSoon: true,
  },
  {
    id: 'luma',
    name: 'Luma',
    tagline: 'The space explorer',
    greeting: "I'm Luma. Earth is fascinating — what should we discover today?",
    personality: 'Endlessly curious. Asks "but why?" and finds wonder in tiny things.',
    vibe: 'curious',
    kind: 'cosmic',
    art: '👽',
    gradient: 'from-emerald-200 via-teal-100 to-cyan-100',
    cardGradient: 'from-emerald-500 via-teal-600 to-cyan-700',
    ringColor: 'ring-emerald-400',
    softBg: 'bg-emerald-50',
    heroImage: '/mascots/luma.png',
    comingSoon: true,
  },
  {
    id: 'pebble',
    name: 'Pebble',
    tagline: 'The crystal turtle',
    greeting: "Take a deep breath. I'm Pebble. Slow and steady wins.",
    personality: 'Calm and thoughtful. Reminds you that good ideas take time.',
    vibe: 'calm',
    kind: 'animal',
    art: '🐢',
    gradient: 'from-teal-200 via-emerald-100 to-lime-100',
    cardGradient: 'from-teal-500 via-emerald-600 to-lime-600',
    ringColor: 'ring-teal-400',
    softBg: 'bg-teal-50',
    heroImage: '/mascots/pebble.png',
    comingSoon: true,
  },
  {
    id: 'rio',
    name: 'Rio',
    tagline: 'The music panda',
    greeting: "Yo, I'm Rio. Let's drop a beat on this idea!",
    personality: 'Creative and rhythmic. Hums while thinking and turns prompts into songs.',
    vibe: 'creative',
    kind: 'animal',
    art: '🐼',
    gradient: 'from-pink-200 via-fuchsia-100 to-purple-100',
    cardGradient: 'from-pink-500 via-fuchsia-600 to-purple-700',
    ringColor: 'ring-pink-400',
    softBg: 'bg-pink-50',
    heroImage: '/mascots/rio.png',
    comingSoon: true,
  },
  {
    id: 'nova',
    name: 'Nova',
    tagline: 'The astronaut kid',
    greeting: "Suit up — I'm Nova. We're going on an adventure today.",
    personality: 'Heroic and adventurous. Treats every creation like a moon mission.',
    vibe: 'heroic',
    kind: 'cosmic',
    art: '🧑‍🚀',
    gradient: 'from-blue-200 via-indigo-100 to-violet-100',
    cardGradient: 'from-blue-500 via-indigo-600 to-violet-700',
    ringColor: 'ring-blue-400',
    softBg: 'bg-blue-50',
    heroImage: '/mascots/nova.png',
    comingSoon: true,
  },
] as const;

export type MascotId = (typeof MASCOTS)[number]['id'];

/** Default mascot used before the kid picks one — also the brand mascot. */
export const DEFAULT_MASCOT_ID: MascotId = 'pixie';

/** Find a mascot by ID; returns the default when not found. */
export function getMascot(id: string | undefined | null): Mascot {
  if (!id) return MASCOTS.find((m) => m.id === DEFAULT_MASCOT_ID) ?? MASCOTS[0]!;
  return (
    MASCOTS.find((m) => m.id === id) ??
    MASCOTS.find((m) => m.id === DEFAULT_MASCOT_ID) ??
    MASCOTS[0]!
  );
}

/** True if the kid is allowed to choose this mascot right now. */
export function isMascotSelectable(m: Mascot): boolean {
  return !m.comingSoon;
}
