/**
 * Book generation background function (BOOK-008).
 *
 * Netlify background functions get a 15-minute budget (vs 26s sync), which the
 * reference-conditioned image pipeline needs. The `book-generate` route writes a
 * pending shell + enqueues here so it can return instantly; the actual draft +
 * images run separately and stream progress into `generation.*`.
 *
 * Naming: the `-background` suffix makes Netlify return 202 to the caller and
 * run this with the long timeout.
 */

import type { Context } from '@netlify/functions';
import crypto from 'crypto';

/** Constant-time token comparison — the function URL is publicly routable. */
function tokensMatch(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export default async function handler(req: Request, _context: Context): Promise<Response> {
  const expectedToken = process.env.INTERNAL_FUNCTION_TOKEN;
  if (!expectedToken || expectedToken.length < 16) {
    return new Response('Internal function token not configured', { status: 500 });
  }
  if (!tokensMatch(req.headers.get('x-internal-token'), expectedToken)) {
    return new Response('Forbidden', { status: 403 });
  }

  let job: { bookId?: string } & Record<string, unknown>;
  try {
    job = (await req.json()) as { bookId?: string } & Record<string, unknown>;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  if (!job.bookId) {
    return new Response('Missing bookId', { status: 400 });
  }

  // Lazy import — avoids paying for Firebase/AI module init outside the handler.
  const { generateBookJob } = await import('../../../../lib/books/generateBookJob');

  try {
    // generateBookJob never throws (records failure on generation.status); the
    // cast is safe because the route is the only producer of this payload.
    await generateBookJob(job as unknown as Parameters<typeof generateBookJob>[0]);
    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('[book-generate-background] handler error:', err);
    return new Response('Handler error', { status: 500 });
  }
}
