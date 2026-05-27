/**
 * Dev-time bypass for the billing guard.
 *
 *   BILLING_BYPASS=true                — skip checks for every kid
 *   BILLING_BYPASS_KIDS=uid1,uid2,...  — selective allowlist
 *
 * Both are IGNORED in `NODE_ENV=production` unless the explicit escape
 * hatch `ALLOW_BILLING_BYPASS_IN_PROD=true` is also set. Production
 * bypasses are logged for audit.
 */

// Memoize the parsed allowlist so the hot path (every assertEntitled
// call) doesn't re-split the string each time. Keyed by the raw env
// value so a dev-time change still takes effect on the next request.
let cachedAllowlistRaw: string | undefined;
let cachedAllowlist: Set<string> = new Set();

function getAllowlist(): Set<string> {
  const raw = process.env.BILLING_BYPASS_KIDS;
  if (raw === cachedAllowlistRaw) return cachedAllowlist;
  cachedAllowlistRaw = raw;
  cachedAllowlist = new Set(
    (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  );
  return cachedAllowlist;
}

/** Truncate a kid ID for safe logging — never log full IDs in prod. */
function safeId(kidId: string | undefined): string {
  if (!kidId) return '<global>';
  return kidId.length <= 8 ? '***' : `${kidId.slice(0, 4)}…${kidId.slice(-2)}`;
}

/**
 * Whether billing bypass is currently enabled for `kidId`. Defaults to
 * false (fails closed). Pass `undefined` to check the global flag with
 * no specific kid.
 */
export function shouldBypass(kidId?: string): boolean {
  const inProd = process.env.NODE_ENV === 'production';
  if (inProd && process.env.ALLOW_BILLING_BYPASS_IN_PROD !== 'true') return false;

  const globalBypass = process.env.BILLING_BYPASS === 'true';
  const allowed = globalBypass || (kidId !== undefined && getAllowlist().has(kidId));

  if (allowed && inProd) {
    console.warn(`[billing] BYPASS active in production for kid=${safeId(kidId)}`);
  }
  return allowed;
}
