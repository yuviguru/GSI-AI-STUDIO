/**
 * Per-plan capability matrix.
 *
 * Edit ONE row to move a feature between tiers. e.g. to make PDF export
 * available on Creator instead of Pro, just flip `canExportPdf: true` in
 * the `creator` block. No other file needs to change.
 *
 * Boolean fields are simple yes/no gates. Numeric fields are quotas.
 * Use `Number.POSITIVE_INFINITY` for "no cap".
 *
 * Server enforcement: `lib/billing/guard.ts` calls `hasEntitlement(plan, cap)`
 * before invoking any model. Routes pass the capability they need, e.g.
 *   await assertEntitled(authCtx, { capability: 'canExportPdf' });
 *
 * UI: client code can read entitlements too, to hide/disable upgrade-only
 * actions before the user clicks (e.g. greying out the "Export PDF" button
 * on Creator). Never trust the client — the server check is the gate.
 */

import type { UserPlan } from '@gsi/types';

/**
 * All capability keys. Adding one is a 3-step diff:
 *   1. add it to this interface (with the type),
 *   2. add a value for every plan in `ENTITLEMENTS` below,
 *   3. call `assertEntitled(ctx, { capability: 'newKey' })` in the route(s).
 *
 * Capability names: prefer `canX` for booleans (canExportPdf) and `maxX`
 * for numeric limits (maxBookPages). This keeps grep-ability high.
 */
export interface PlanEntitlements {
  // ─── Studio caps ─────────────────────────────────────────────────────
  /** Max pages in a Book Studio book. Used by bookService. */
  maxBookPages: number;
  /** Max images per generation request (multi-image stories etc.). */
  maxImagesPerCreation: number;
  /** Max kids a single parent account can manage. */
  maxKidsPerAccount: number;

  // ─── AI provider gates ───────────────────────────────────────────────
  /** Use premium image models (SDXL) vs. free tier (Flux Schnell, Pollinations). */
  priorityImageGen: boolean;
  /** Use the premium LLM (Claude) vs. fast/free (Groq). */
  priorityLlm: boolean;

  // ─── Export & sharing ────────────────────────────────────────────────
  /** PDF export of books and stories. */
  canExportPdf: boolean;
  /** MP4 export of music creations. */
  canExportVideo: boolean;
  /** Mark a creation private (default behavior is public/remix-able). */
  canMakePrivate: boolean;
  /** Add a custom watermark (Pro+ only). */
  canCustomizeWatermark: boolean;

  // ─── Parent & insights ───────────────────────────────────────────────
  /** Weekly parent progress reports via email/PDF. */
  canAccessParentDashboard: boolean;
  /** GrowthMap deep insight reports. */
  canViewGrowthMap: boolean;

  // ─── Studio access flags ─────────────────────────────────────────────
  /** Early access to beta studios (e.g. new release locked to Pro for 30d). */
  canAccessBetaStudios: boolean;

  // ─── School-only ─────────────────────────────────────────────────────
  /** Teacher dashboard with class management. */
  canAccessTeacherDashboard: boolean;
  /** Auto-generated CBSE compliance report. */
  canGenerateComplianceReports: boolean;
}

const UNLIMITED = Number.POSITIVE_INFINITY;

/**
 * THE matrix. To re-tier a feature, change ONE value here.
 *
 * Recommendation: keep boolean rows roughly in order of progression
 * (free → creator → pro) so it's easy to read at a glance which plans
 * unlock what. School and admin can break the progression where it
 * makes sense (e.g. school gets teacher dashboard that pro doesn't).
 */
export const ENTITLEMENTS: Record<UserPlan, PlanEntitlements> = {
  free: {
    maxBookPages: 5,
    maxImagesPerCreation: 1,
    maxKidsPerAccount: 2,
    priorityImageGen: false,
    priorityLlm: false,
    canExportPdf: false,
    canExportVideo: false,
    canMakePrivate: false,
    canCustomizeWatermark: false,
    canAccessParentDashboard: false,
    canViewGrowthMap: false,
    canAccessBetaStudios: false,
    canAccessTeacherDashboard: false,
    canGenerateComplianceReports: false,
  },
  creator: {
    maxBookPages: 16,
    maxImagesPerCreation: 3,
    maxKidsPerAccount: 4,
    priorityImageGen: false,
    priorityLlm: false,
    canExportPdf: false,
    canExportVideo: false,
    canMakePrivate: false,
    canCustomizeWatermark: false,
    canAccessParentDashboard: true,
    canViewGrowthMap: false,
    canAccessBetaStudios: false,
    canAccessTeacherDashboard: false,
    canGenerateComplianceReports: false,
  },
  pro: {
    maxBookPages: 40,
    maxImagesPerCreation: 10,
    maxKidsPerAccount: 6,
    priorityImageGen: true,
    priorityLlm: true,
    canExportPdf: true,
    canExportVideo: true,
    canMakePrivate: true,
    canCustomizeWatermark: false,
    canAccessParentDashboard: true,
    canViewGrowthMap: true,
    canAccessBetaStudios: true,
    canAccessTeacherDashboard: false,
    canGenerateComplianceReports: false,
  },
  school: {
    maxBookPages: 40,
    maxImagesPerCreation: 5,
    maxKidsPerAccount: UNLIMITED,
    priorityImageGen: true,
    priorityLlm: false,
    canExportPdf: true,
    canExportVideo: false,
    canMakePrivate: true,
    canCustomizeWatermark: true,
    canAccessParentDashboard: false,
    canViewGrowthMap: true,
    canAccessBetaStudios: false,
    canAccessTeacherDashboard: true,
    canGenerateComplianceReports: true,
  },
  admin: {
    maxBookPages: UNLIMITED,
    maxImagesPerCreation: UNLIMITED,
    maxKidsPerAccount: UNLIMITED,
    priorityImageGen: true,
    priorityLlm: true,
    canExportPdf: true,
    canExportVideo: true,
    canMakePrivate: true,
    canCustomizeWatermark: true,
    canAccessParentDashboard: true,
    canViewGrowthMap: true,
    canAccessBetaStudios: true,
    canAccessTeacherDashboard: true,
    canGenerateComplianceReports: true,
  },
};

/**
 * Resolve entitlements for a plan. Unknown plans fall back to `free` (same
 * defensive policy as `getPlan` — never throw on a stale doc value).
 */
export function getEntitlements(plan: UserPlan | string | undefined | null): PlanEntitlements {
  if (!plan) return ENTITLEMENTS.free;
  const known = ENTITLEMENTS[plan as UserPlan];
  return known ?? ENTITLEMENTS.free;
}

/**
 * Check a single capability. The guard uses this; UI code can too.
 *
 *   if (!hasEntitlement(kid.plan, 'canExportPdf')) showUpgradePrompt();
 *
 * Numeric quotas are truthy when > 0 — for limit checks, read the number
 * directly via `getEntitlements(plan).maxBookPages`.
 */
export function hasEntitlement<K extends keyof PlanEntitlements>(
  plan: UserPlan | string | undefined | null,
  capability: K,
): boolean {
  const value = getEntitlements(plan)[capability];
  if (typeof value === 'number') return value > 0;
  return Boolean(value);
}
