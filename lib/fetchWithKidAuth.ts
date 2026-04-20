/** `fetchWithKidAuth(request, { getIdToken, kidId })` — thin wrapper that
 *  injects the two headers every Kid CEO authenticated endpoint expects:
 *
 *    - `Authorization: Bearer <firebase_id_token>` — the parent's Firebase
 *      Auth ID token, fetched fresh at call time (Firebase SDK transparently
 *      refreshes expired tokens behind the scenes)
 *    - `X-Active-Kid-Id: <kidId>` — the active kid profile the caller has
 *      selected in the kid-picker UI
 *
 *  If either is missing the fetcher throws synchronously rather than calling
 *  the server with an incomplete auth header set — that way callers get a
 *  tight error instead of the server's "Missing auth token" (401) or
 *  "Pick a kid profile first" (400). */

export interface KidAuthContext {
  getIdToken: () => Promise<string | null>;
  kidId: string | null;
}

export class KidAuthMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KidAuthMissingError';
  }
}

export async function fetchWithKidAuth(
  url: string,
  ctx: KidAuthContext,
  init: RequestInit = {},
): Promise<Response> {
  if (!ctx.kidId) {
    throw new KidAuthMissingError(
      'No active kid profile — pick one before playing Kid CEO.',
    );
  }

  const token = await ctx.getIdToken();
  if (!token) {
    throw new KidAuthMissingError(
      'Not signed in — please sign in to play Kid CEO.',
    );
  }

  const headers = new Headers(init.headers ?? {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('X-Active-Kid-Id', ctx.kidId);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, { ...init, headers });
}
