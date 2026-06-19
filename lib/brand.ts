/**
 * Brand constants — single source of truth for the product name and the
 * public site URL printed on books (BOOK-011).
 *
 * The production domain isn't final yet, so every surface that shows it
 * (back-cover CTA in the editor, the reader, and the printed PDF) reads from
 * here. To change the domain later, set NEXT_PUBLIC_SITE_URL in the deploy
 * env — no code change needed. Falls back to NEXT_PUBLIC_APP_URL (already
 * used for share links) and finally the current Netlify domain.
 *
 * NOTE: published PDFs bake the domain in at export time — books exported
 * before a domain change keep the old link until re-exported.
 */

export const BRAND_NAME = 'GSI AI Studio';

const DEFAULT_SITE_URL = 'https://gsi-ai-studio.netlify.app';

/** True for URLs that must never be printed on a book (dev servers). */
function isLocalUrl(url: string): boolean {
  return /\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(url);
}

function resolveSiteUrl(): string {
  const candidate = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    DEFAULT_SITE_URL
  ).replace(/\/+$/, '');
  // A dev box's localhost APP_URL would otherwise end up printed on exported
  // PDFs ("Create yours at localhost:3000") — fall back to the public default.
  return isLocalUrl(candidate) ? DEFAULT_SITE_URL : candidate;
}

export const SITE_URL = resolveSiteUrl();

/** Display form for print/captions — no protocol. */
export const SITE_DOMAIN = SITE_URL.replace(/^https?:\/\//, '');
