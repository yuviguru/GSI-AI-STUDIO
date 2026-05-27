import { auth } from '@gsi/firebase/client';

const SESSION_KEY = 'gsi-session-id';
const ACTIVE_KID_KEY = 'gsi-active-kid-id';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(SESSION_KEY) ?? '';
}

/**
 * Read the active kid ID. Written by `useKidProfile.switchKid` as a plain
 * string (not JSON). Returns null when no kid is selected.
 */
function getActiveKidId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_KID_KEY) || null;
}

/**
 * Fetch wrapper for API routes that follow the hybrid auth pattern
 * (`hybridAuth` server-side). Auto-injects three headers when relevant:
 *
 *   - `X-Session-Id`         — always when present in localStorage
 *   - `Authorization: Bearer …` — when a Firebase user is signed in
 *   - `X-Active-Kid-Id`      — when the kid-picker has set one
 *
 * Routes that ONLY accept authenticated callers (e.g. `/api/billing/*`)
 * should still use `fetchWithKidAuth` directly — it throws synchronously
 * on missing auth, which `fetchWithSession` deliberately does not.
 *
 * Async (await fetchWithSession(...)) — every existing caller already does.
 * The auth-token fetch is what makes this asynchronous; we can't read a
 * Firebase ID token synchronously.
 */
export async function fetchWithSession(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);

  // Anonymous baseline — always include if available.
  const sessionId = getSessionId();
  if (sessionId && !headers.has('X-Session-Id')) {
    headers.set('X-Session-Id', sessionId);
  }

  // Authenticated upgrade — when a Firebase user is signed in, forward
  // the bearer + active kid so the server can identify the kid and
  // debit credits (BILLING-001). For anonymous callers this whole block
  // is skipped and the request goes through as session-only.
  try {
    const user = auth.currentUser;
    if (user && !headers.has('Authorization')) {
      const token = await user.getIdToken();
      headers.set('Authorization', `Bearer ${token}`);
      const kidId = getActiveKidId();
      if (kidId && !headers.has('X-Active-Kid-Id')) {
        headers.set('X-Active-Kid-Id', kidId);
      }
    }
  } catch {
    // Firebase not configured (CI/SSR) or token refresh failed. Drop
    // through anonymously — the server will either accept the session
    // or reject as 401 if the route requires auth.
  }

  return fetch(input, { ...init, headers });
}
