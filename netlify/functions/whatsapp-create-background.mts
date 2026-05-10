/**
 * WhatsApp creation background function.
 *
 * Netlify background functions have a 15-minute timeout (vs 10s for
 * synchronous functions). The webhook lambda enqueues here so it can
 * return 200 to Meta within the 5s ack window while the actual
 * AI creation runs separately.
 *
 * Naming: any function with the `-background` suffix is treated as a
 * background function by Netlify and returns 202 to the caller immediately.
 */

import type { Context } from '@netlify/functions';

interface JobPayload {
  fromPhone: string;
  text: string;
}

export default async function handler(req: Request, _context: Context): Promise<Response> {
  // Internal-only — verify the shared token to prevent third-party invocation.
  const expectedToken = process.env.INTERNAL_FUNCTION_TOKEN;
  if (!expectedToken) {
    return new Response('Internal function token not configured', { status: 500 });
  }
  if (req.headers.get('x-internal-token') !== expectedToken) {
    return new Response('Forbidden', { status: 403 });
  }

  let job: JobPayload;
  try {
    job = (await req.json()) as JobPayload;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!job.fromPhone || !job.text) {
    return new Response('Missing fromPhone or text', { status: 400 });
  }

  // Lazy import — avoids paying for Firebase/AI module init in the webhook lambda.
  const { handleIncomingMessage } = await import(
    '../../lib/channels/whatsapp/orchestrator'
  );

  try {
    await handleIncomingMessage(job);
    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('[whatsapp-create-background] handler error:', err);
    return new Response('Handler error', { status: 500 });
  }
}
