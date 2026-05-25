/**
 * Dev-time bypass for the billing guard.
 *
 * Reads two env vars at every call (NOT cached) so changing the env in a
 * dev terminal takes effect immediately without a server restart in
 * watch mode. Per-call cost is just a couple of property reads — negligible.
 *
 * Env vars:
 *   BILLING_BYPASS=true                   — skip checks for every kid
 *   BILLING_BYPASS_KIDS=uid1,uid2,uid3    — selective allowlist
 *
 * Production safety:
 *   Both vars are IGNORED in NODE_ENV=production unless the explicit escape
 *   hatch `ALLOW_BILLING_BYPASS_IN_PROD=true` is also set. When a bypass
 *   fires in production, a `console.warn` is emitted for the audit log.
 *
 * Why two flags:
 *   - `BILLING_BYPASS=true` is the daily-dev unblocker — local feature work
 *     never has to think about credits.
 *   - `BILLING_BYPASS_KIDS=...` is the staging QA tool — verify tier-specific
 *     UI works for a real free user while you, the admin, can bypass.
 */

import type { UserPlan } from '@gsi/types';

/** Parse the comma-separated allowlist. Returns a Set for O(1) lookups. */
function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );
}

/**
 * Whether billing bypass is currently enabled for `kidId`. Returns false
 * by default — fails closed.
 *
 * Pass `undefined` to check the global bypass without a specific kid (e.g.
 * for capability-only checks where there's no kid wallet).
 */
export function shouldBypass(kidId?: string): boolean {
  const inProd = process.env.NODE_ENV === 'production';
  const allowProd = process.env.ALLOW_BILLING_BYPASS_IN_PROD === 'true';
  if (inProd && !allowProd) return false;

  const globalBypass = process.env.BILLING_BYPASS === 'true';
  const allowlist = parseAllowlist(process.env.BILLING_BYPASS_KIDS);
  const allowed = globalBypass || (kidId !== undefined && allowlist.has(kidId));

  if (allowed && inProd) {
    // Audit signal — every production bypass should be visible in logs.
    console.warn(
      `[billing] BYPASS active in production for kid=${kidId ?? '<global>'}. ` +
        `Set ALLOW_BILLING_BYPASS_IN_PROD=false to disable.`,
    );
  }

  return allowed;
}

/**
 * Convenience: check whether the caller (admin plan, or bypass-listed kid)
 * is fully unmetered. Used by routes that want to skip both capability and
 * credit checks.
 */
export function isUnmetered(ctx: { kidId?: string; plan?: UserPlan }): boolean {
  if (shouldBypass(ctx.kidId)) return true;
  if (ctx.plan === 'admin') return true;
  return false;
}

/**
 * One-shot startup banner — call from API route bootstrap or a global
 * `instrumentation.ts` so the log makes it obvious when bypass is on.
 *
 * Idempotent via a module-level flag; safe to call from multiple entry
 * points without spamming logs.
 */
let bannerLogged = false;
export function logBypassStatusOnce(): void {
  if (bannerLogged) return;
  bannerLogged = true;

  const globalBypass = process.env.BILLING_BYPASS === 'true';
  const allowlist = parseAllowlist(process.env.BILLING_BYPASS_KIDS);
  const inProd = process.env.NODE_ENV === 'production';
  const allowProd = process.env.ALLOW_BILLING_BYPASS_IN_PROD === 'true';

  if (!globalBypass && allowlist.size === 0) {
    // Nothing to announce — billing is fully active.
    return;
  }

  if (inProd && !allowProd) {
    console.warn(
      `[billing] Bypass env vars are SET but ignored — NODE_ENV=production. ` +
        `Use ALLOW_BILLING_BYPASS_IN_PROD=true to force on.`,
    );
    return;
  }

  const mode = globalBypass ? 'GLOBAL' : `ALLOWLIST(${allowlist.size})`;
  const banner = inProd ? '!!! PRODUCTION BYPASS ACTIVE !!!' : 'dev bypass on';
  console.warn(`[billing] ${banner} mode=${mode}`);
}
