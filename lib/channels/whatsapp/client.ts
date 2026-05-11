/**
 * WhatsApp Business API client — sends text messages.
 *
 * Uses Meta's WhatsApp Cloud API (via Graph). Configure with:
 *   WHATSAPP_PHONE_NUMBER_ID — your business phone number ID
 *   WHATSAPP_ACCESS_TOKEN    — long-lived access token from Meta
 *   WHATSAPP_VERIFY_TOKEN    — webhook verification token (your choice)
 */

const GRAPH_VERSION = 'v22.0';

export interface WhatsAppTextMessage {
  to: string; // E.164 phone, no '+'
  body: string;
  /** Optional preview URL — if true, links in body get unfurled. */
  previewUrl?: boolean;
}

export interface WhatsAppMediaMessage {
  to: string;
  mediaUrl: string;
  caption?: string;
  type: 'image' | 'audio' | 'video' | 'document';
}

interface SendResult {
  messageId: string;
  contacts: Array<{ wa_id: string }>;
}

function getConfig(): { phoneNumberId: string; accessToken: string } {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    throw new Error(
      'WhatsApp not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.',
    );
  }
  return { phoneNumberId, accessToken };
}

export async function sendWhatsAppText(
  msg: WhatsAppTextMessage,
): Promise<SendResult> {
  const { phoneNumberId, accessToken } = getConfig();
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: msg.to,
        type: 'text',
        text: { body: msg.body, preview_url: msg.previewUrl ?? true },
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp send failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    messages: Array<{ id: string }>;
    contacts: Array<{ wa_id: string }>;
  };
  return {
    messageId: data.messages[0]!.id,
    contacts: data.contacts,
  };
}

export async function sendWhatsAppMedia(
  msg: WhatsAppMediaMessage,
): Promise<SendResult> {
  const { phoneNumberId, accessToken } = getConfig();
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: msg.to,
        type: msg.type,
        [msg.type]: { link: msg.mediaUrl, caption: msg.caption },
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp media send failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    messages: Array<{ id: string }>;
    contacts: Array<{ wa_id: string }>;
  };
  return {
    messageId: data.messages[0]!.id,
    contacts: data.contacts,
  };
}
