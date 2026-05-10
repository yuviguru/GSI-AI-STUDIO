import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock next/headers BEFORE importing the module under test.
const headerStore = new Map<string, string>();
const cookieStore = new Map<string, string>();

vi.mock('next/headers', () => ({
  headers: () => ({
    get: (key: string) => headerStore.get(key) ?? null,
  }),
  cookies: () => ({
    get: (key: string) => {
      const v = cookieStore.get(key);
      return v ? { value: v } : undefined;
    },
  }),
}));

import { isAdmin, requireAdmin, AdminAuthRequired } from './guard';

describe('admin guard', () => {
  const originalEnv = process.env.ADMIN_API_TOKEN;

  beforeEach(() => {
    headerStore.clear();
    cookieStore.clear();
    process.env.ADMIN_API_TOKEN = 'a-very-long-and-stable-test-token-1234';
  });
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.ADMIN_API_TOKEN;
    else process.env.ADMIN_API_TOKEN = originalEnv;
  });

  it('returns false when ADMIN_API_TOKEN is short / not configured', () => {
    process.env.ADMIN_API_TOKEN = 'short';
    expect(isAdmin()).toBe(false);
  });

  it('returns false when no token is provided', () => {
    expect(isAdmin()).toBe(false);
  });

  it('accepts the correct token via Authorization header', () => {
    headerStore.set('authorization', 'Bearer a-very-long-and-stable-test-token-1234');
    expect(isAdmin()).toBe(true);
  });

  it('accepts the correct token via cookie', () => {
    cookieStore.set('gsi_admin_token', 'a-very-long-and-stable-test-token-1234');
    expect(isAdmin()).toBe(true);
  });

  it('rejects a wrong token (constant-time)', () => {
    headerStore.set('authorization', 'Bearer wrong-token-of-similar-length-here');
    expect(isAdmin()).toBe(false);
  });

  it('requireAdmin throws AdminAuthRequired when not admin', () => {
    expect(() => requireAdmin()).toThrow(AdminAuthRequired);
  });

  it('requireAdmin does not throw when admin', () => {
    headerStore.set('authorization', 'Bearer a-very-long-and-stable-test-token-1234');
    expect(() => requireAdmin()).not.toThrow();
  });
});
