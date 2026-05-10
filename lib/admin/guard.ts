/**
 * Admin route guard — server-side only.
 *
 * For the pilot: bearer token in `Authorization: Bearer <token>` matched
 * constant-time against `ADMIN_API_TOKEN`. The /admin pages render server-side
 * and read the token from a cookie set by the operator manually.
 *
 * Post-pilot upgrade: switch to Firebase custom-claim ('role: admin') via
 * `backend.auth.verifyToken` — code path already exists in the MCP route.
 */

import crypto from 'crypto';
import { cookies, headers } from 'next/headers';

const COOKIE_NAME = 'gsi_admin_token';

export class AdminAuthRequired extends Error {
  constructor() {
    super('Admin authentication required');
    this.name = 'AdminAuthRequired';
  }
}

export function adminTokenFromHeaders(): string | null {
  // 1. Authorization header (API requests)
  const auth = headers().get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length);
  // 2. Cookie (server-rendered admin pages)
  const c = cookies().get(COOKIE_NAME);
  return c?.value ?? null;
}

export function isAdmin(): boolean {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected || expected.length < 16) return false;
  const provided = adminTokenFromHeaders();
  if (!provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function requireAdmin(): void {
  if (!isAdmin()) throw new AdminAuthRequired();
}
