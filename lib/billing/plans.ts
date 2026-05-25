/**
 * Plan catalog — single source of truth for tier configuration.
 *
 * Read by:
 * - `components/marketing/Pricing.tsx` (welcome-page pricing table)
 * - `lib/billing/guard.ts` (server-side entitlement + credit enforcement)
 * - `lib/billing/credits.ts` (monthly grant amounts)
 * - `lib/rateLimits.ts` (legacy adapter — `creationsPerDay` derived from creditsPerMonth)
 *
 * To change pricing, monthly credit grants, or marketing copy for a tier,
 * edit ONE row in `PLANS` below. No code changes anywhere else.
 *
 * Env overrides let ops tune a single tier without a deploy:
 *   PLAN_PRO_CREDITS=3000          # bump pro from 2000 -> 3000 credits/mo
 *   PLAN_CREATOR_PRICE_INR=149     # bump creator price from 99 -> 149
 *   PLAN_FREE_CREDITS=100          # double free-tier credits for a promo
 */

import type { UserPlan } from '@gsi/types';

/** Plan IDs in display order. Free first, school last (custom-priced). */
export const PLAN_IDS: readonly UserPlan[] = [
  'free',
  'creator',
  'pro',
  'school',
  'admin',
] as const;

export interface PlanPrice {
  /** Indian Rupees, monthly. `null` for custom-quoted plans (school). */
  inr: number | null;
  /** Optional annual price (billed once). Display-only for now. */
  annualInr?: number;
  /** UI label after the price, e.g. "/ month", "/ student / month". */
  period: string;
  /** Subline shown under the price, e.g. "Or ₹899/year". */
  subline?: string;
}

export interface PlanMarketing {
  /** Short pitch shown under the plan name. */
  tagline: string;
  /** Bullet points — order matters; read left-to-right top-to-bottom on cards. */
  features: string[];
  /** CTA shown on the pricing card. */
  cta: { label: string; href: string };
  /** Highlight this tier as the recommended one on the pricing page. */
  featured?: boolean;
}

export interface Plan {
  id: UserPlan;
  displayName: string;
  /** Marketing-only fields. Server enforcement ignores these. */
  marketing: PlanMarketing;
  price: PlanPrice;
  /**
   * Credits granted at the start of each monthly cycle. Unspent grant
   * credits expire at cycle end; paid topups never expire (see
   * `lib/billing/credits.ts`).
   *
   * `Infinity` means "no metered cap" — used for `admin` accounts and could
   * be used for a future "unlimited" tier. The guard short-circuits the
   * debit when this is Infinity so the ledger doesn't grow unbounded.
   */
  creditsPerMonth: number;
}

/**
 * Resolve an env override to a number, falling back to the default. Returns
 * the default for invalid/empty values rather than NaN.
 */
function envNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envString(key: string, fallback: string): string {
  const raw = process.env[key];
  return raw && raw.length > 0 ? raw : fallback;
}

/**
 * THE config. Edit values here to change tier behavior.
 *
 * Keep `marketing.features` short (≤6 bullets) and consistent in voice
 * across tiers — the Pricing component renders them as-is and they're the
 * thing parents skim fastest.
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
        'CBSE AI &amp; CT lesson plans (Class 3–12)',
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
    // Infinity = "don't meter" — the guard short-circuits and never debits.
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
 * Look up a plan by ID. Unknown IDs fall back to `free` (defensive — every
 * server path that touches billing must produce *some* answer, never throw
 * on an unrecognized plan string from a stale doc).
 */
export function getPlan(planId: UserPlan | string | undefined | null): Plan {
  if (!planId) return PLANS.free;
  const known = PLANS[planId as UserPlan];
  return known ?? PLANS.free;
}

/** Default plan assigned to brand-new accounts. */
export const DEFAULT_PLAN: UserPlan = 'free';
