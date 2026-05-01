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
 *   - Host: Firebase Storage, Pollinations, or curated stock providers
 *
 * If you add a new image source, update this allowlist (in one place) so all
 * three routes stay in sync.
 */

const MAX_URL_LENGTH = 2048;

const ALLOWED_HTTPS_PREFIXES = [
  'https://firebasestorage.googleapis.com/',
  'https://storage.googleapis.com/',
  'https://image.pollinations.ai/',
  'https://images.pexels.com/',
  'https://images.unsplash.com/',
] as const;

export function isPersistableAvatarUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  if (url.length === 0 || url.length > MAX_URL_LENGTH) return false;
  if (url.startsWith('data:')) return false;
  if (url.startsWith('/')) return true;
  return ALLOWED_HTTPS_PREFIXES.some((prefix) => url.startsWith(prefix));
}
