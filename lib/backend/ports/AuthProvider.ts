/**
 * AuthProvider port — backend-neutral auth interface.
 *
 * Wraps token verification, session cookies, and custom claims.
 * Today: Firebase Auth. Tomorrow: Supabase Auth. Or any OIDC provider.
 */

export interface AuthUser {
  id: string;
  phone?: string;
  email?: string;
  emailVerified?: boolean;
  customClaims?: Record<string, unknown>;
  createdAt?: string;
}

export interface AuthProvider {
  /** Verify a bearer ID token (e.g. from Authorization header). */
  verifyToken(token: string): Promise<AuthUser>;

  /** Look up a user by id. Returns null if not found. */
  getUser(id: string): Promise<AuthUser | null>;

  /** Set custom claims (used for role-based access — parent/teacher/admin). */
  setCustomClaims(id: string, claims: Record<string, unknown>): Promise<void>;

  /** Mint a long-lived session cookie from a short-lived ID token. */
  createSessionCookie(idToken: string, expiresInMs: number): Promise<string>;

  /** Verify a session cookie and return the user. */
  verifySessionCookie(cookie: string): Promise<AuthUser>;

  /** Revoke all refresh tokens for a user (force re-login). */
  revokeRefreshTokens(id: string): Promise<void>;
}
