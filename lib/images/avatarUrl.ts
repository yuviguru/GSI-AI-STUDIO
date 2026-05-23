/**
 * Shared predicate: is this URL safe to persist as a kid avatar?
 *
 * The same allowlist is used everywhere a URL crosses a trust boundary:
 *   - /api/avatar/generate    — sets `persisted: true` on the response
 *   - /api/auth/claim-session — accepts `onboarding.avatarUrl` from the client
 *   - /api/users/kids         — accepts `avatarUrl` on direct kid creation
 *
 * Keeping a single source of truth prevents a URL being marked `persisted`
 * by the generator and then silently rejected by the migration path, which
 * blocked the authenticated onboarding flow before this fix.
 *
 * Rules:
 *   - Length ≤ 2048 (defends against data-URI smuggling and storage bloat)
 *   - Scheme: https or relative root path
 *   - Host: in the curated provider list below
 *
 * Provider hosts are matched in two flavors:
 *   - EXACT hostnames (e.g. 'image.pollinations.ai')
 *   - SUFFIX hostnames (e.g. '.r2.dev' matches any bucket under r2.dev) —
 *     used for multi-bucket CDNs where every deployment gets its own
 *     subdomain. This mirrors how we already trust *any* bucket under
 *     storage.googleapis.com.
 *
 * If you add a new image source, update one of the two lists below so all
 * three routes stay in sync.
 */

const MAX_URL_LENGTH = 2048;

/** Hostnames matched verbatim. */
const EXACT_ALLOWED_HOSTS: ReadonlySet<string> = new Set([
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'image.pollinations.ai',
  'images.pexels.com',
  'images.unsplash.com',
]);

/**
 * Hostname suffixes matched as `host === suffix.slice(1) || host.endsWith(suffix)`.
 * Each entry MUST start with '.' so we never match a bare suffix string
 * (e.g. '.r2.dev' must not match 'evil-r2.dev').
 */
const ALLOWED_HOST_SUFFIXES: readonly string[] = [
  // Cloudflare R2 public dev domain — used by pixazo-flux-schnell. Every
  // bucket gets a 'pub-{hash}.r2.dev' subdomain; we trust all of them
  // (same posture as `*.storage.googleapis.com`).
  '.r2.dev',
] as const;

export function isPersistableAvatarUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  if (url.length === 0 || url.length > MAX_URL_LENGTH) return false;
  if (url.startsWith('data:')) return false;
  if (url.startsWith('/')) return true;
  if (!url.startsWith('https://')) return false;

  // Parse to extract the host robustly. URL constructor handles edge cases
  // (userinfo, ports, trailing dots) that prefix matching would miss.
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }

  if (EXACT_ALLOWED_HOSTS.has(host)) return true;
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}
