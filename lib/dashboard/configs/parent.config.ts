import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Inbox,
  MessageSquare,
  Settings,
  HelpCircle,
} from 'lucide-react';
import type { DashboardConfig } from '@/types/dashboard.types';

export const parentDashboardConfig: DashboardConfig = {
  role: 'parent',
  brand: {
    name: 'GSI for Parents',
    href: '/parent/settings/data-rights',
    logoSrc: '/images/gsi-logo.svg',
  },
  sidebar: {
    primary: [
      {
        id: 'home',
        label: 'Dashboard',
        href: '/parent/settings/data-rights',
        icon: LayoutDashboard,
        match: (p) => p === '/parent/settings/data-rights',
      },
      {
        id: 'children',
        label: 'My Children',
        href: '/parent/settings/data-rights',
        icon: Users,
        match: (p) => p.startsWith('/parent/children') || p.startsWith('/kid/class'),
      },
      {
        id: 'comms',
        label: 'Messages & Digests',
        href: '/parent/comms',
        icon: MessageSquare,
        match: (p) => p.startsWith('/parent/comms'),
      },
      {
        id: 'data-rights',
        label: 'Data & Consent',
        href: '/parent/settings/data-rights',
        icon: ShieldCheck,
        match: (p) => p.startsWith('/parent/settings/data-rights'),
      },
      {
        id: 'notifications',
        label: 'Notifications',
        href: '/notifications',
        icon: Inbox,
        match: (p) => p === '/notifications',
      },
    ],
    secondary: [
      { id: 'help', label: 'Help', href: '/help', icon: HelpCircle },
      { id: 'settings', label: 'Settings', href: '/parent/settings/data-rights', icon: Settings },
    ],
  },
  sections: [
    {
      id: 'children',
      title: 'Children',
      subtitle: 'Activity, creations, class feed',
      illustration: '/illustrations/sections/learn.svg',
      illustrationAlt: 'Parent reviewing child progress',
      gradient: 'review',
      studios: [],
      href: '/parent/settings/data-rights',
    },
    {
      id: 'comms',
      title: 'Messages',
      subtitle: 'Parent digests and teacher messages',
      illustration: '/illustrations/sections/create.svg',
      illustrationAlt: 'Mailbox with letters',
      gradient: 'create',
      studios: [],
      href: '/parent/comms',
    },
    {
      id: 'privacy',
      title: 'Privacy & Consent',
      subtitle: 'DPDP rights, consent log, data exports',
      illustration: '/illustrations/sections/play.svg',
      illustrationAlt: 'Shield with checkmarks',
      gradient: 'manage',
      studios: [],
      href: '/parent/settings/data-rights',
    },
  ],
  rightRailWidgets: [],
};
