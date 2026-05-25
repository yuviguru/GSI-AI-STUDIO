/**
 * Per-plan capability matrix. Edit ONE row to move a feature between
 * tiers (e.g. flip `canExportPdf: true` on Creator to unlock PDF export
 * for that plan).
 *
 * Booleans = yes/no gates. Numbers = quotas (`Infinity` for "no cap").
 * Convention: `canX` for booleans, `maxX` for numeric limits.
 */

import type { UserPlan } from '@gsi/types';

export interface PlanEntitlements {
  // Studio caps
  maxBookPages: number;
  maxImagesPerCreation: number;
  maxKidsPerAccount: number;

  // AI provider gates
  priorityImageGen: boolean;
  priorityLlm: boolean;

  // Export & sharing
  canExportPdf: boolean;
  canExportVideo: boolean;
  canMakePrivate: boolean;
  canCustomizeWatermark: boolean;

  // Parent & insights
  canAccessParentDashboard: boolean;
  canViewGrowthMap: boolean;

  // Studio access flags
  canAccessBetaStudios: boolean;

  // School-only
  canAccessTeacherDashboard: boolean;
  canGenerateComplianceReports: boolean;
}

const UNLIMITED = Number.POSITIVE_INFINITY;

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

/** Unknown plans fall back to `free`. */
export function getEntitlements(plan: UserPlan | string | undefined | null): PlanEntitlements {
  return (plan && ENTITLEMENTS[plan as UserPlan]) || ENTITLEMENTS.free;
}

/**
 * Check a single capability.
 *
 *   if (!hasEntitlement(kid.plan, 'canExportPdf')) showUpgradePrompt();
 *
 * Numeric quotas are truthy when > 0; read the number directly via
 * `getEntitlements(plan).maxBookPages` when you need it.
 */
export function hasEntitlement<K extends keyof PlanEntitlements>(
  plan: UserPlan | string | undefined | null,
  capability: K,
): boolean {
  const value = getEntitlements(plan)[capability];
  return typeof value === 'number' ? value > 0 : Boolean(value);
}
