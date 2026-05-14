import {
  LayoutDashboard,
  Bot,
  Briefcase,
  Compass,
  FolderOpen,
  GraduationCap,
  HelpCircle,
  Settings,
  Palette,
} from 'lucide-react';
import type { DashboardConfig } from '@gsi/types';
import {
  KidProfileChip,
  KidTodaysActivity,
  KidDailyChallenge,
  KidStatsGrid,
} from '@/components/navigation/RightRail';
import { KidSidebarUserChip } from '@/components/navigation/KidSidebarUserChip';
import { LeaderboardPanel } from '@/components/dashboard/LeaderboardPanel';
import { ChallengesWidget } from '@/components/dashboard/ChallengesWidget';
import { BadgesWidget } from '@/components/dashboard/BadgesWidget';

const CREATE_STUDIOS = [
  {
    name: 'Story',
    href: '/create/story',
    illustration: '/illustrations/studios/story.svg',
    illustrationAlt: 'Open storybook with characters jumping out',
    bg: 'bg-gradient-to-br from-violet-100 to-purple-200',
    variant: 'small' as const,
    caption: 'AI-illustrated short stories',
    creationKey: 'story',
  },
  {
    name: 'Book',
    href: '/create/book',
    illustration: '/illustrations/studios/books.svg',
    illustrationAlt: 'Stack of glowing books',
    bg: 'bg-gradient-to-br from-indigo-100 to-blue-200',
    variant: 'small' as const,
    caption: 'Write your own book',
    isNew: true,
    creationKey: 'book',
  },
  {
    name: 'Music',
    href: '/create/music',
    illustration: '/illustrations/studios/music.svg',
    illustrationAlt: 'Headphones with floating music notes',
    bg: 'bg-gradient-to-br from-orange-100 to-amber-200',
    variant: 'small' as const,
    caption: 'Compose tracks',
    creationKey: 'music',
  },
  {
    name: 'Comic',
    href: '/create/comic',
    illustration: '/illustrations/studios/comic.svg',
    illustrationAlt: 'Comic panels with speech bubbles',
    bg: 'bg-gradient-to-br from-amber-100 to-yellow-200',
    variant: 'small' as const,
    caption: 'Multi-panel art',
    creationKey: 'comic',
  },
  {
    name: 'Game',
    href: '/create/game',
    illustration: '/illustrations/studios/game.svg',
    illustrationAlt: 'Joystick and a pixel-art creature',
    bg: 'bg-gradient-to-br from-cyan-100 to-teal-200',
    variant: 'small' as const,
    caption: 'Choose-your-adventure',
    creationKey: 'game',
  },
  {
    name: 'Quiz',
    href: '/create/quiz',
    illustration: '/illustrations/studios/quiz.svg',
    illustrationAlt: 'Game-show buzzer with question marks',
    bg: 'bg-gradient-to-br from-emerald-100 to-green-200',
    variant: 'small' as const,
    caption: 'Build a quiz game',
    creationKey: 'quiz',
  },
];

const PLAY_STUDIOS = [
  {
    name: 'Beat the AI',
    href: '/beat-the-ai',
    illustration: '/illustrations/sections/play.svg',
    illustrationAlt: 'Kid versus a friendly AI robot at a console',
    bg: 'bg-gradient-to-br from-cyan-100 to-teal-200',
    variant: 'small' as const,
    caption: 'Creative duel rounds',
  },
  {
    name: 'Kid CEO',
    href: '/ceo',
    illustration: '/illustrations/studios/game.svg',
    illustrationAlt: 'Kid in a tiny suit with charts',
    bg: 'bg-gradient-to-br from-emerald-100 to-teal-200',
    variant: 'small' as const,
    caption: 'Run your own business',
  },
];

const LEARN_STUDIOS = [
  {
    name: 'Skill Arena',
    href: '/skill-arena',
    illustration: '/illustrations/sections/learn.svg',
    illustrationAlt: 'Kid climbing a wall of letters',
    bg: 'bg-gradient-to-br from-orange-100 to-rose-200',
    variant: 'small' as const,
    caption: 'IELTS-style assessment',
  },
  {
    name: 'AI Lab',
    href: '/learn',
    illustration: '/illustrations/studios/quiz.svg',
    illustrationAlt: 'Kid with magnifying glass',
    bg: 'bg-gradient-to-br from-amber-100 to-orange-200',
    variant: 'small' as const,
    caption: 'How AI works, kid-sized',
  },
];

export const kidDashboardConfig: DashboardConfig = {
  role: 'kid',
  brand: {
    name: 'AI Studio',
    href: '/',
    logoSrc: '/images/gsi-logo.svg',
  },
  sidebar: {
    primary: [
      {
        id: 'home',
        label: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
        match: (p) => p === '/',
      },
      {
        id: 'create',
        label: 'Create',
        href: '/create/story',
        icon: Palette,
        match: (p) => p.startsWith('/create/'),
        children: CREATE_STUDIOS.map((s) => ({
          id: s.name.toLowerCase(),
          label: s.name,
          href: s.href,
          icon: Palette,
        })),
      },
      {
        id: 'beat-ai',
        label: 'Beat AI',
        href: '/beat-the-ai',
        icon: Bot,
        match: (p) => p === '/beat-the-ai',
      },
      {
        id: 'ceo',
        label: 'Kid CEO',
        href: '/ceo',
        icon: Briefcase,
        match: (p) => p.startsWith('/ceo'),
      },
      {
        id: 'explore',
        label: 'Explore',
        href: '/explore',
        icon: Compass,
        match: (p) => p === '/explore',
      },
      {
        id: 'learn',
        label: 'Learn',
        href: '/learn',
        icon: GraduationCap,
        match: (p) => p.startsWith('/learn') || p === '/skill-arena',
      },
      {
        id: 'creations',
        label: 'My Stuff',
        href: '/creations',
        icon: FolderOpen,
        match: (p) => p === '/creations',
      },
    ],
    secondary: [
      { id: 'help', label: 'Help', href: '/help', icon: HelpCircle },
      { id: 'settings', label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  sections: [
    {
      id: 'create',
      title: 'Create',
      subtitle: 'Tell stories, write books, make music & more',
      illustration: '/illustrations/sections/create.svg',
      illustrationAlt: 'Kid painting on a glowing tablet',
      gradient: 'create',
      studios: CREATE_STUDIOS,
    },
    {
      id: 'play',
      title: 'Play',
      subtitle: 'Beat the AI or run your own kid business',
      illustration: '/illustrations/sections/play.svg',
      illustrationAlt: 'Kid versus a friendly AI robot at a console',
      gradient: 'play',
      studios: PLAY_STUDIOS,
    },
    {
      id: 'learn',
      title: 'Learn',
      subtitle: 'Skill arena, AI Lab, and homework',
      illustration: '/illustrations/sections/learn.svg',
      illustrationAlt: 'Kid with a glowing book and an AI brain mascot',
      gradient: 'learn',
      studios: LEARN_STUDIOS,
    },
  ],
  ctaCard: KidSidebarUserChip,
  rightRailWidgets: [
    { id: 'kid-profile-chip', component: KidProfileChip },
    { id: 'kid-stats-grid', component: KidStatsGrid },
    { id: 'kid-todays-activity', component: KidTodaysActivity },
    { id: 'kid-challenges', component: ChallengesWidget },
    { id: 'kid-badges', component: BadgesWidget },
    { id: 'kid-leaderboard', component: LeaderboardPanel },
    { id: 'kid-daily-challenge', component: KidDailyChallenge },
  ],
};
