const SESSION_KEY = 'gsi-session-id';
const ACTIVE_KID_KEY = 'gsi-active-kid-id';

function getSessionId(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem(SESSION_KEY) ?? '') : '';
}

function getActiveKidId(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem(ACTIVE_KID_KEY) ?? '') : '';
}

/**
 * Fetch wrapper that auto-injects session/kid identity headers from localStorage.
 * - X-Session-Id: anonymous session identity (always sent when available)
 * - X-Kid-Id: active kid profile identity (sent when a kid profile is selected)
 *
 * API routes check X-Kid-Id first to scope data to the kid's own collection.
 * Falls back to X-Session-Id for anonymous users.
 */
export function fetchWithSession(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const sessionId = getSessionId();
  const kidId = getActiveKidId();
  const headers = new Headers(init?.headers);

  if (sessionId && !headers.has('X-Session-Id')) {
    headers.set('X-Session-Id', sessionId);
  }

  if (kidId && !headers.has('X-Kid-Id')) {
    headers.set('X-Kid-Id', kidId);
  }

  return fetch(input, { ...init, headers });
}
