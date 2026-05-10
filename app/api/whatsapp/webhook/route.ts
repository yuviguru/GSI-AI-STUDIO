/**
 * WhatsApp webhook — receives messages from Meta's WhatsApp Cloud API.
 *
 * GET = Meta verification handshake (one-time, when configuring the webhook).
 * POST = incoming message events.
 *
 * Configure in Meta Business Manager:
 *   Callback URL: https://<your-domain>/api/whatsapp/webhook
 *   Verify token: same value as WHATSAPP_VERIFY_TOKEN in your .env
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/channels/whatsapp/orchestrator';

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
  let body: WhatsAppWebhookBody;
  try {
    body = (await request.json()) as WhatsAppWebhookBody;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  // Process each message — fire and forget so we ack Meta within their
  // 5-second window. The actual creation can take 10-30s and runs async.
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const msg of change.value.messages ?? []) {
        if (msg.type === 'text' && msg.text?.body) {
          // Don't await — Meta needs a fast 200 response.
          void handleIncomingMessage({
            fromPhone: msg.from,
            text: msg.text.body,
          }).catch((err) => {
            console.warn('[whatsapp/webhook] handler error:', err);
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
