/**
 * Dashboard configuration types.
 *
 * The 3-column dashboard shell (sidebar + center + right rail) is generic;
 * it accepts a DashboardConfig and renders sidebar items, hero sections, and
 * right-rail widgets per role (kid / teacher / schoolAdmin / parent).
 */

import type { ComponentType, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { StudioTileVariant } from '@/components/navigation/StudioTile';

export type DashboardRole = 'kid' | 'teacher' | 'schoolAdmin' | 'parent';

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** When pathname starts with this prefix, the item is rendered active. */
  match?: (pathname: string) => boolean;
  /** Optional badge (unread count etc). */
  badge?: number | string;
  /** Children render as nested items (single level deep). */
  children?: Omit<SidebarItem, 'children'>[];
}

export type SectionGradient = 'create' | 'play' | 'learn' | 'review' | 'manage' | 'analyze';

export interface StudioDefinition {
  name: string;
  href: string;
  illustration: string;
  illustrationAlt: string;
  bg: string;
  variant: StudioTileVariant;
  caption: string;
  isNew?: boolean;
  /** Used to look up creation counts in `useAiPoints().creationsByType`. */
  creationKey?: string;
}

export interface SectionDefinition {
  id: string;
  title: string;
  subtitle: string;
  illustration: string;
  illustrationAlt: string;
  gradient: SectionGradient;
  /** Studios revealed when the section card is expanded. */
  studios: StudioDefinition[];
  /** Optional fallback href when there is only one studio (skip expand). */
  href?: string;
}

export interface RightRailWidget {
  id: string;
  component: ComponentType;
}

export interface DashboardConfig {
  role: DashboardRole;
  brand: {
    name: string;
    href: string;
    logoSrc?: string;
  };
  sidebar: {
    primary: SidebarItem[];
    secondary?: SidebarItem[];
  };
  sections: SectionDefinition[];
  rightRailWidgets: RightRailWidget[];
  /** Optional CTA card rendered at the bottom of the sidebar. */
  ctaCard?: ComponentType;
  /** Optional element rendered above the section hub (e.g. resume strip). */
  topStrip?: ReactNode;
}
