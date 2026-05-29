import {
  BookMarked,
  BookOpen,
  Music,
  Gamepad2,
  Palette,
  HelpCircle,
  Swords,
  Brain,
  Crown,
  GraduationCap,
  Compass,
  Pencil,
  type LucideIcon,
} from 'lucide-react';

/** Hub mode groups — the Create / Play / Learn tabs. */
export type ModeGroup = 'create' | 'play' | 'learn';

export interface GameMode {
  key: string;
  label: string;
  shortLabel: string;
  /** Short one-liner — shown on mobile / icon fallback. */
  tagline: string;
  /** Longer 2-3 line copy — shown on desktop tiles when present, falls back to tagline. */
  description?: string;
  /** Which hub tab this mode belongs to. */
  group: ModeGroup;
  icon: LucideIcon;
  emoji: string;
  /** Optional full-bleed illustration. Falls back to icon treatment if absent. */
  image?: string;
  /** Which side the illustration anchors to on wide / single tiles. Defaults to 'right'. */
  imagePosition?: 'left' | 'right';
  /** When true (wide tile only), the image spans the full card via object-cover
   *  instead of anchoring to a corner. Use when the artwork is composed to read
   *  as a full-bleed band (e.g. the Story cinema strip). */
  imageFullWidth?: boolean;
  href: string;
  /** Gradient background CSS for the tile */
  bg: string;
  /** Icon wrapper background */
  iconBg: string;
  /** Icon wrapper ring */
  iconRing: string;
  /** Text color for label */
  textColor: string;
  /** Tagline color */
  taglineColor: string;
  /** Tailwind text-color class for the Lucide icon glyph on the mobile
   *  PortalCard (e.g. `text-violet-500`). Lets each tile carry a vivid,
   *  on-brand icon tint instead of a flat monochrome. Falls back to
   *  `textColor` when absent. */
  iconColor?: string;
  /** Special icon style: solid colored bg (for Beat AI, MindX, Kid CEO, Learn, Explore) */
  solidIcon?: boolean;
  badge?: 'NEW' | 'LIVE';
  badgeBg?: string;
  /** RGBA colour used for the per-tile hover glow shadow. Defaults to a neutral brand glow. */
  glowColor?: string;
}

export const GAME_MODES: GameMode[] = [
  // ─── CREATE ──────────────────────────────────────────────────────────────
  {
    key: 'book',
    label: 'Book Studio',
    shortLabel: 'Books',
    tagline: 'Write your own books',
    description: 'Write and publish your own real book. You bring the ideas; the AI just helps with grammar.',
    group: 'create',
    icon: BookMarked,
    emoji: '📚',
    iconColor: 'text-indigo-500',
    image: '/images/modes/book.png',
    glowColor: 'rgba(99, 102, 241, 0.45)',
    href: '/create/book',
    bg: 'linear-gradient(160deg, #EEF2FF 0%, #DBEAFE 100%)',
    iconBg: 'bg-white/80',
    iconRing: 'ring-indigo-200/50',
    textColor: 'text-brand-text',
    taglineColor: 'text-brand-text-secondary',
    // Book Studio is the first LIVE creation studio (LAUNCH-001). The
    // legacy `badge: 'NEW'` is dropped — `PortalCard` now renders the
    // launch-state pill via `<StudioLaunchPill>` for any StudioId mode,
    // and the LIVE state defaults to no visible pill (clean baseline).
  },
  {
    key: 'story',
    label: 'Story Studio',
    shortLabel: 'Stories',
    tagline: 'Magical tales',
    description: 'Spark magical tales in minutes — worlds, characters, and adventures from your imagination.',
    group: 'create',
    icon: BookOpen,
    emoji: '📖',
    iconColor: 'text-violet-500',
    image: '/images/modes/story.png',
    imageFullWidth: true,
    glowColor: 'rgba(139, 92, 246, 0.45)',
    href: '/create/story',
    bg: 'linear-gradient(160deg, #F5F3FF 0%, #E9D5FF 100%)',
    iconBg: 'bg-white/80',
    iconRing: 'ring-violet-200/50',
    textColor: 'text-brand-text',
    taglineColor: 'text-brand-text-secondary',
  },
  {
    key: 'game',
    label: 'Game Studio',
    shortLabel: 'Games',
    tagline: 'Build games',
    description: 'Stop just playing — start building your own games.',
    group: 'create',
    icon: Gamepad2,
    emoji: '🎮',
    iconColor: 'text-emerald-500',
    image: '/images/modes/game.png',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    href: '/create/game',
    bg: 'linear-gradient(160deg, #ECFDF5 0%, #A7F3D0 100%)',
    iconBg: 'bg-white/80',
    iconRing: 'ring-emerald-200/50',
    textColor: 'text-brand-text',
    taglineColor: 'text-brand-text-secondary',
  },
  {
    key: 'music',
    label: 'Music Lab',
    shortLabel: 'Music',
    tagline: 'Compose tracks',
    description: 'Compose your own tracks with AI — no notation, just vibes.',
    group: 'create',
    icon: Music,
    emoji: '🎵',
    iconColor: 'text-orange-500',
    image: '/images/modes/music.png',
    glowColor: 'rgba(249, 115, 22, 0.45)',
    href: '/create/music',
    bg: 'linear-gradient(160deg, #FFF7ED 0%, #FED7AA 100%)',
    iconBg: 'bg-white/80',
    iconRing: 'ring-orange-200/50',
    textColor: 'text-brand-text',
    taglineColor: 'text-brand-text-secondary',
  },
  {
    key: 'comic',
    label: 'Comic Studio',
    shortLabel: 'Comics',
    tagline: 'Draw heroes',
    description: 'Draw your own heroes and villains. Visual storytelling where art meets adventure on every page.',
    group: 'create',
    icon: Palette,
    emoji: '🎨',
    iconColor: 'text-amber-500',
    image: '/images/modes/comic.png',
    imagePosition: 'left',
    imageFullWidth: true,
    glowColor: 'rgba(245, 158, 11, 0.45)',
    href: '/create/comic',
    bg: 'linear-gradient(160deg, #FEFCE8 0%, #FDE68A 100%)',
    iconBg: 'bg-white/80',
    iconRing: 'ring-amber-200/50',
    textColor: 'text-brand-text',
    taglineColor: 'text-brand-text-secondary',
  },
  {
    key: 'quiz',
    label: 'Quiz Maker',
    shortLabel: 'Quiz',
    tagline: 'Test friends',
    description: 'Make quizzes that challenge your friends and family.',
    group: 'create',
    icon: HelpCircle,
    emoji: '🧠',
    iconColor: 'text-cyan-500',
    image: '/images/modes/quiz.png',
    glowColor: 'rgba(6, 182, 212, 0.45)',
    href: '/create/quiz',
    bg: 'linear-gradient(160deg, #ECFEFF 0%, #A5F3FC 100%)',
    iconBg: 'bg-white/80',
    iconRing: 'ring-cyan-200/50',
    textColor: 'text-brand-text',
    taglineColor: 'text-brand-text-secondary',
  },

  // ─── PLAY ────────────────────────────────────────────────────────────────
  // Order matches the bento layout: Kid CEO is the wide hero on top (Story-
  // style cinema strip), MindX and Beat AI sit as singles below (Game/Music-
  // style corner-anchored). See bento.ts for the grid geometry.
  {
    key: 'ceo',
    label: 'Kid CEO',
    shortLabel: 'Kid CEO',
    tagline: 'Run your company',
    description: 'Run your own company. Lead, decide, and watch your choices shape the future of your business.',
    group: 'play',
    icon: Crown,
    emoji: '👑',
    iconColor: 'text-purple-500',
    image: '/images/modes/ceo.png',
    // Story-style full-bleed treatment so the illustration reads as a
    // hero band rather than a corner-anchored object.
    imageFullWidth: true,
    glowColor: 'rgba(168, 85, 247, 0.45)',
    href: '/ceo',
    bg: 'linear-gradient(160deg, #FAF5FF 0%, #D8B4FE 100%)',
    iconBg: 'bg-gradient-to-br from-purple-500 to-fuchsia-600',
    iconRing: 'ring-purple-300/50',
    textColor: 'text-brand-text',
    taglineColor: 'text-brand-text-secondary',
    solidIcon: true,
  },
  {
    key: 'mindx',
    label: 'MindX Arena',
    shortLabel: 'MindX',
    tagline: 'Skill challenges',
    description: "Sharpen your mind with skill challenges that grow your thinking and prove how far you've come.",
    group: 'play',
    icon: Brain,
    emoji: '🧩',
    iconColor: 'text-teal-500',
    // mindX.png already exists in /public/images/modes — wire it up so this
    // tile renders with the shared corner-anchored illustration treatment.
    image: '/images/modes/mindX.png',
    glowColor: 'rgba(20, 184, 166, 0.45)',
    href: '/skill-arena',
    bg: 'linear-gradient(160deg, #F0FDFA 0%, #99F6E4 100%)',
    iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-600',
    iconRing: 'ring-teal-300/50',
    textColor: 'text-brand-text',
    taglineColor: 'text-brand-text-secondary',
    solidIcon: true,
  },
  {
    key: 'beat-ai',
    label: 'Beat the AI',
    shortLabel: 'Beat AI',
    tagline: 'Challenge mode',
    description: 'Take on the AI in creative duels. Discover your imagination can match — and beat — the machine.',
    group: 'play',
    icon: Swords,
    emoji: '⚔️',
    iconColor: 'text-rose-500',
    image: '/images/modes/beat-ai.png',
    glowColor: 'rgba(244, 63, 94, 0.5)',
    href: '/beat-the-ai',
    bg: 'linear-gradient(160deg, #FEF2F2 0%, #FECACA 100%)',
    iconBg: 'bg-gradient-to-br from-rose-500 to-red-500',
    iconRing: 'ring-rose-300/50',
    textColor: 'text-brand-text',
    taglineColor: 'text-brand-text-secondary',
    solidIcon: true,
    badge: 'LIVE',
    badgeBg: 'bg-rose-500',
  },

  // ─── LEARN ───────────────────────────────────────────────────────────────
  {
    key: 'ai-lab',
    label: 'AI Lab',
    shortLabel: 'AI Lab',
    tagline: 'Learn how AI works',
    description: 'Learn how the AI actually works. Plain-English lessons behind every studio — see the magic explained.',
    group: 'learn',
    icon: GraduationCap,
    emoji: '🔬',
    iconColor: 'text-indigo-500',
    glowColor: 'rgba(99, 102, 241, 0.45)',
    href: '/learn',
    bg: 'linear-gradient(160deg, #EEF2FF 0%, #C7D2FE 100%)',
    iconBg: 'bg-gradient-to-br from-indigo-500 to-violet-600',
    iconRing: 'ring-indigo-300/50',
    textColor: 'text-brand-text',
    taglineColor: 'text-brand-text-secondary',
    solidIcon: true,
  },
  {
    key: 'explore',
    label: 'Explore',
    shortLabel: 'Explore',
    tagline: 'Discover creations',
    description: 'Discover what other kids have made. Get inspired, remix ideas, and find your creative community.',
    group: 'learn',
    icon: Compass,
    emoji: '🧭',
    iconColor: 'text-sky-500',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    href: '/explore',
    bg: 'linear-gradient(160deg, #EFF6FF 0%, #BFDBFE 100%)',
    iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600',
    iconRing: 'ring-sky-300/50',
    textColor: 'text-brand-text',
    taglineColor: 'text-brand-text-secondary',
    solidIcon: true,
  },
];

/** Ordered tab metadata for the Create / Play / Learn switcher. The
 *  `icon` is a Lucide glyph (rendered by `ModeGroupTabs`); `emoji` is kept
 *  as an accessible fallback / legacy field. */
export const MODE_GROUP_TABS: { key: ModeGroup; label: string; emoji: string; icon: LucideIcon }[] = [
  { key: 'create', label: 'Create', emoji: '✏️', icon: Pencil },
  { key: 'play', label: 'Play', emoji: '🎮', icon: Gamepad2 },
  { key: 'learn', label: 'Learn', emoji: '🎓', icon: GraduationCap },
];

export function getModesByGroup(group: ModeGroup): GameMode[] {
  return GAME_MODES.filter((m) => m.group === group);
}
