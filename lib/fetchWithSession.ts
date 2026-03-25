const SESSION_KEY = 'gsi-session-id';

function getSessionId(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem(SESSION_KEY) ?? '') : '';
}

/**
 * Fetch wrapper that auto-injects the X-Session-Id header from localStorage.
 * Drop-in replacement for fetch() in client-side code that needs session identity.
 */
export function fetchWithSession(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const sessionId = getSessionId();
  const headers = new Headers(init?.headers);

  if (sessionId && !headers.has('X-Session-Id')) {
    headers.set('X-Session-Id', sessionId);
  }

  return fetch(input, { ...init, headers });
}
