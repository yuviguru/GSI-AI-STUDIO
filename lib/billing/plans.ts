/**
 * Plan catalog — the single source of truth for tier configuration. Read
 * by the marketing Pricing page, the server-side guard, and the rate-limit
 * adapter. To change pricing, monthly credits, or marketing copy: edit
 * ONE row in `PLANS` below.
 *
 * Env overrides (e.g. `PLAN_PRO_CREDITS=3000`) let ops tune a single tier
 * without a deploy. See `envNumber` for the full key pattern.
 */

import type { UserPlan } from '@gsi/types';

/** Plan IDs in display order. */
export const PLAN_IDS: readonly UserPlan[] = ['free', 'creator', 'pro', 'school', 'admin'] as const;
export const DEFAULT_PLAN: UserPlan = 'free';

export interface PlanPrice {
  /** INR/month. `null` for custom-quoted plans (school, admin). */
  inr: number | null;
  /** Annual price, billed once. Display-only. */
  annualInr?: number;
  /** UI suffix, e.g. "/ month". */
  period: string;
  /** Subline shown under the price. */
  subline?: string;
}

export interface PlanMarketing {
  tagline: string;
  features: string[];
  cta: { label: string; href: string };
  /** Highlight this tier on the pricing page. */
  featured?: boolean;
}

export interface Plan {
  id: UserPlan;
  displayName: string;
  /**
   * Credits granted at the start of each monthly cycle. `Infinity` means
   * "no metering" — the guard short-circuits and never debits.
   */
  creditsPerMonth: number;
  price: PlanPrice;
  marketing: PlanMarketing;
}

function envNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envString(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

/**
 * The catalog. Marketing copy stays here on purpose — it's tied 1:1 to
 * the tier config, and keeping them in one file means `Pricing.tsx` and
 * `guard.ts` can never drift.
 */
export const PLANS: Record<UserPlan, Plan> = {
  free: {
    id: 'free',
    displayName: 'Free',
    creditsPerMonth: envNumber('PLAN_FREE_CREDITS', 50),
    price: {
      inr: 0,
      period: '/ forever',
      subline: envString('PLAN_FREE_SUBLINE', 'No card. No trial. No time limit.'),
    },
    marketing: {
      tagline: 'For any kid who wants to try AI.',
      features: [
        '50 credits per month — try every studio',
        'All 10 studios (Story, Music, Game, Comic…)',
        'AI X-Ray on every creation (always free)',
        'WhatsApp share + public remix feed',
        'Unlock 6 beginner badges',
      ],
      cta: { label: 'Start creating', href: '/create/story' },
    },
  },
  creator: {
    id: 'creator',
    displayName: 'Creator',
    creditsPerMonth: envNumber('PLAN_CREATOR_CREDITS', 500),
    price: {
      inr: envNumber('PLAN_CREATOR_PRICE_INR', 99),
      annualInr: envNumber('PLAN_CREATOR_ANNUAL_INR', 899),
      period: '/ month',
      subline: 'Or ₹899/year · Cancel anytime',
    },
    marketing: {
      tagline: 'For kids who like making a few things every day.',
      features: [
        '500 credits per month',
        'All 10 studios + AI X-Ray on every creation',
        '6 badges + creation streaks',
        'Faster image generation',
        'Cancel anytime, keep all your creations',
      ],
      cta: { label: 'Try Creator', href: '/create/story?upgrade=creator' },
    },
  },
  pro: {
    id: 'pro',
    displayName: 'Pro',
    creditsPerMonth: envNumber('PLAN_PRO_CREDITS', 2000),
    price: {
      inr: envNumber('PLAN_PRO_PRICE_INR', 299),
      annualInr: envNumber('PLAN_PRO_ANNUAL_INR', 2499),
      period: '/ month',
      subline: 'Or ₹2,499/year · Cancel anytime',
    },
    marketing: {
      tagline: 'For kids who create every day.',
      features: [
        '2,000 credits per month',
        'Full 12-badge collection + streaks',
        'Parent dashboard with weekly reports',
        'Priority AI (fastest image models)',
        'Private creations + export to PDF/MP4',
        'Early access to new studios',
      ],
      cta: { label: 'Go Pro', href: '/create/story?upgrade=pro' },
      featured: true,
    },
  },
  school: {
    id: 'school',
    displayName: 'Schools',
    creditsPerMonth: envNumber('PLAN_SCHOOL_CREDITS', 1000),
    price: {
      inr: null,
      period: '',
      subline: 'From ₹149/student/month · 50-student minimum',
    },
    marketing: {
      tagline: 'For principals solving the 2026-27 mandate.',
      features: [
        'Everything in Pro — for every student',
        'Teacher dashboard: classes, assignments, reports',
        'CBSE AI & CT lesson plans (Class 3–12)',
        'Auto-generated compliance reports',
        'Inter-school competitions + leaderboards',
        'Onboarding + teacher training included',
      ],
      cta: { label: 'Book a pilot', href: '/school' },
    },
  },
  admin: {
    id: 'admin',
    displayName: 'Admin',
    creditsPerMonth: Number.POSITIVE_INFINITY,
    price: { inr: null, period: '' },
    marketing: {
      tagline: 'Internal team accounts.',
      features: ['Unlimited credits', 'All entitlements'],
      cta: { label: 'Internal', href: '/' },
    },
  },
};

/**
 * Resolve a plan by ID. Unknown IDs fall back to `free` — defensive so a
 * stale doc value never throws.
 */
export function getPlan(planId: UserPlan | string | undefined | null): Plan {
  return (planId && PLANS[planId as UserPlan]) || PLANS.free;
}
