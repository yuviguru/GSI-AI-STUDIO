import type { NextRequest } from 'next/server';

/**
 * Extract the client IP from a Next.js request. Tries the Netlify
 * connection-IP header first, then `x-forwarded-for`'s leftmost entry
 * (the original client, before any proxies). Returns null on miss.
 */
export function ipFromRequest(request: NextRequest): string | null {
  return (
    request.headers.get('x-nf-client-connection-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null
  );
}
