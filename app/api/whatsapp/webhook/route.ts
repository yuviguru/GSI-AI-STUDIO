/**
 * WhatsApp webhook — receives messages from Meta's WhatsApp Cloud API.
 *
 * GET = Meta verification handshake (one-time, when configuring the webhook).
 * POST = incoming message events.
 *
 * Configure in Meta Business Manager:
 *   Callback URL: https://<your-domain>/api/whatsapp/webhook
 *   Verify token: same value as WHATSAPP_VERIFY_TOKEN in your .env
 *
 * Security:
 *   - GET handshake checks WHATSAPP_VERIFY_TOKEN
 *   - POST handler verifies X-Hub-Signature-256 against WHATSAPP_APP_SECRET
 *     using constant-time HMAC-SHA256 comparison. Without this any attacker
 *     who finds the URL could forge messages and burn AI budget.
 *
 * Architecture:
 *   - Webhook returns 200 in <100ms (Meta requires sub-5s ack)
 *   - Actual creation work runs in a Netlify Background Function
 *     (lib/channels/whatsapp/background.ts via /netlify/functions/...)
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface WhatsAppWebhookEntry {
  changes: Array<{
    value: {
      messages?: Array<{
        from: string;
        id: string;
        type: 'text' | 'audio' | 'image' | string;
        text?: { body: string };
      }>;
      contacts?: Array<{ wa_id: string; profile?: { name?: string } }>;
    };
  }>;
}

interface WhatsAppWebhookBody {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

/** GET — Meta verification handshake. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === expectedToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

/** POST — incoming message event. */
export async function POST(request: NextRequest) {
  // 1. Read RAW body for signature verification.
  //    request.json() would re-stringify (changing whitespace/key order) and
  //    invalidate the HMAC. We must hash the exact bytes Meta sent.
  const rawBody = await request.text();

  // 2. Verify HMAC-SHA256 signature.
  if (!verifyMetaSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 403 });
  }

  // 3. Parse + dispatch.
  let body: WhatsAppWebhookBody;
  try {
    body = JSON.parse(rawBody) as WhatsAppWebhookBody;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  // 4. For each text message, enqueue a background job.
  //    Meta's webhook spec requires a 200 response within 5s. Story creation
  //    takes 20-40s, so we cannot do it in this lambda — Netlify will tear
  //    down the function as soon as we return, killing the in-flight work.
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const msg of change.value.messages ?? []) {
        if (msg.type === 'text' && msg.text?.body) {
          await enqueueWhatsAppJob({
            fromPhone: msg.from,
            text: msg.text.body,
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}

/**
 * Constant-time signature verification.
 * Meta sends "sha256=<hex>" in `X-Hub-Signature-256`.
 * Returns false (not throws) for missing config / missing header / mismatch.
 */
function verifyMetaSignature(body: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) {
    console.warn('[whatsapp/webhook] WHATSAPP_APP_SECRET not set — refusing all requests');
    return false;
  }
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

  const provided = signatureHeader.slice('sha256='.length);
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');

  // Both buffers must be equal length for timingSafeEqual.
  const providedBuf = Buffer.from(provided, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (providedBuf.length !== expectedBuf.length) return false;

  try {
    return crypto.timingSafeEqual(providedBuf, expectedBuf);
  } catch {
    return false;
  }
}

/**
 * Hand the message off to a background function for async processing.
 *
 * Local dev: invoke the orchestrator inline (no Netlify infrastructure).
 * Production: POST to the Netlify Background Function endpoint, which
 * Netlify will execute in a separate 15-minute lambda.
 */
async function enqueueWhatsAppJob(job: { fromPhone: string; text: string }): Promise<void> {
  const backgroundUrl = process.env.WHATSAPP_BACKGROUND_URL;
  if (!backgroundUrl) {
    // Local / single-process mode. Kick off the orchestrator without awaiting
    // (the dev server is long-lived so the work will complete).
    const { handleIncomingMessage } = await import('@/lib/channels/whatsapp/orchestrator');
    void handleIncomingMessage(job).catch((err) => {
      console.warn('[whatsapp/webhook] inline handler error:', err);
    });
    return;
  }

  // Production: enqueue to background function.
  // Background functions return 202 immediately; actual work runs separately.
  await fetch(backgroundUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': process.env.INTERNAL_FUNCTION_TOKEN ?? '',
    },
    body: JSON.stringify(job),
    signal: AbortSignal.timeout(5000),
  }).catch((err) => {
    console.warn('[whatsapp/webhook] enqueue error:', err);
  });
}
