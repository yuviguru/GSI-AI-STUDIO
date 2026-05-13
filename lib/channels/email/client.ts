/**
 * Email channel — multi-provider abstraction (Resend primary, AWS SES fallback).
 *
 * Configure with EMAIL_PROVIDER=resend|ses and the matching credentials:
 *   Resend: RESEND_API_KEY + EMAIL_FROM_ADDRESS
 *   SES:    AWS_SES_REGION + AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + EMAIL_FROM_ADDRESS
 *
 * For pilot: pick Resend (simplest signup, best DX, generous free tier).
 */

export interface EmailMessage {
  to: string | string[];
  subject: string;
  /** HTML body — required. */
  html: string;
  /** Plain text fallback — recommended for deliverability. */
  text?: string;
  attachments?: Array<{
    filename: string;
    /** Buffer or base64 string. */
    content: Buffer | string;
    contentType: string;
  }>;
  replyTo?: string;
}

export interface SendEmailResult {
  messageId: string;
  provider: string;
}

export async function sendEmail(msg: EmailMessage): Promise<SendEmailResult> {
  const provider = (process.env.EMAIL_PROVIDER ?? 'resend').toLowerCase();
  switch (provider) {
    case 'resend':
      return sendViaResend(msg);
    // SES adapter would slot in here when needed.
    default:
      throw new Error(`Unknown EMAIL_PROVIDER: ${provider}`);
  }
}

async function sendViaResend(msg: EmailMessage): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM_ADDRESS;
  if (!apiKey || !from) {
    throw new Error(
      'Resend not configured. Set RESEND_API_KEY and EMAIL_FROM_ADDRESS.',
    );
  }

  const attachments = msg.attachments?.map((a) => ({
    filename: a.filename,
    content: typeof a.content === 'string' ? a.content : a.content.toString('base64'),
    type: a.contentType,
  }));

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(msg.to) ? msg.to : [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      reply_to: msg.replyTo,
      attachments,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend send failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as { id: string };
  return { messageId: data.id, provider: 'resend' };
}
