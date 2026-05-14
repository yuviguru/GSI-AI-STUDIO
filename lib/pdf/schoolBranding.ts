/**
 * Phase 4 (ADMIN-009): shared helper for PDF exports (HPC narratives,
 * question papers, compliance reports, progress reports). Fetches school
 * branding with a small in-memory TTL cache and provides a `jsPDF` header
 * renderer that downstream generators call uniformly.
 */

import { getSchool } from '@gsi/firebase/schoolService';
import type { SchoolBranding, SchoolDoc } from '@gsi/types';

export interface ResolvedBranding {
  schoolName: string;
  logoUrl?: string;
  letterheadUrl?: string;
  primaryColor: string;
  secondaryColor: string;
}

const DEFAULT_PRIMARY = '#4F46E5';
const DEFAULT_SECONDARY = '#EC4899';

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: ResolvedBranding }>();

function resolve(doc: SchoolDoc): ResolvedBranding {
  const b: SchoolBranding = doc.branding ?? {};
  return {
    schoolName: doc.name,
    logoUrl: b.logoUrl,
    letterheadUrl: b.letterheadUrl,
    primaryColor: b.primaryColor ?? DEFAULT_PRIMARY,
    secondaryColor: b.secondaryColor ?? DEFAULT_SECONDARY,
  };
}

/** Read branding for a school with a 60s TTL cache. */
export async function getSchoolBranding(schoolId: string): Promise<ResolvedBranding> {
  const hit = cache.get(schoolId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const school = await getSchool(schoolId);
  if (!school) {
    return {
      schoolName: 'GSI AI Studio',
      primaryColor: DEFAULT_PRIMARY,
      secondaryColor: DEFAULT_SECONDARY,
    };
  }
  const value = resolve(school);
  cache.set(schoolId, { at: Date.now(), value });
  return value;
}

/** Invalidate a school's cached branding after an update. */
export function invalidateSchoolBranding(schoolId: string): void {
  cache.delete(schoolId);
}

/**
 * Type-only interface for the jsPDF shape we rely on. Keeps this file free
 * of a runtime `jspdf` dependency so it can be imported anywhere.
 */
interface BrandingPdfSurface {
  setFontSize(n: number): unknown;
  setTextColor(color: string): unknown;
  text(text: string, x: number, y: number): unknown;
  addImage?(
    data: string,
    format: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ): unknown;
}

/**
 * Only URLs whose host is the public GCS bucket qualify as branding assets.
 * Prevents SSRF in case a branding URL is tampered with directly in
 * Firestore (bypassing the upload API which already scopes paths under
 * `schools/{schoolId}/branding/`).
 */
const SAFE_ASSET_URL_PREFIX = /^https:\/\/storage\.googleapis\.com\/[^\/]+\/schools\/[^\/]+\/branding\//;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function safeAssetUrl(url: string | undefined): string | null {
  if (!url) return null;
  return SAFE_ASSET_URL_PREFIX.test(url) ? url : null;
}

function safeHexColor(value: string | undefined, fallback: string): string {
  if (value && HEX_COLOR_RE.test(value)) return value;
  return fallback;
}

/**
 * Renders a branded header (logo + school name strip) at the top of a jsPDF
 * document. Safe to call even if branding is unconfigured — falls back to
 * text-only school-name header with default colors.
 *
 * Defence-in-depth: logoUrl is matched against the GCS bucket prefix so a
 * tampered Firestore branding doc can't turn this into an SSRF vector via
 * jsPDF's remote `addImage`. Color strings are re-validated against the
 * hex pattern to avoid jsPDF DoS from malformed input.
 */
export function renderBrandedHeader(
  doc: BrandingPdfSurface,
  branding: ResolvedBranding,
): void {
  const logoUrl = safeAssetUrl(branding.logoUrl);
  if (logoUrl && doc.addImage) {
    try {
      doc.addImage(logoUrl, 'PNG', 14, 10, 20, 20);
    } catch {
      // Remote image addition can fail in server contexts; fall through.
    }
  }
  doc.setFontSize(16);
  doc.setTextColor(safeHexColor(branding.primaryColor, DEFAULT_PRIMARY));
  doc.text(branding.schoolName, 40, 22);
}
