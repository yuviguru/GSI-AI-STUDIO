/**
 * deliverCreation — emails a creation share link to a recipient.
 *
 * Used by the voice/WhatsApp channels (async creation → email backup) and
 * by the parent weekly digest. Channel-neutral: callable from any caller.
 */

import { getCreation } from '@/lib/repositories/creationRepository';
import { sendEmail } from './client';

export interface DeliverCreationOptions {
  creationId: string;
  to: string;
  /** Optional personalization. */
  recipientName?: string;
  /** Pre-baked share base URL (e.g. https://gsi.ai). */
  baseUrl?: string;
}

export async function deliverCreation(
  opts: DeliverCreationOptions,
): Promise<{ messageId: string }> {
  // Validate `to` upfront — if a future LLM-driven channel calls this with
  // attacker-controlled input (prompt injection), bad addresses must be
  // rejected before they reach the email provider.
  if (!isValidEmail(opts.to)) {
    throw new Error(`Invalid email address: ${opts.to.slice(0, 80)}`);
  }

  const creation = await getCreation(opts.creationId);
  const baseUrl = opts.baseUrl ?? process.env.PUBLIC_BASE_URL ?? 'https://gsi.ai';
  const shareLink = `${baseUrl}${creation.shareUrl ?? `/view/${creation.id}`}`;

  const greeting = opts.recipientName ? `Hi ${opts.recipientName},` : 'Hi,';
  const subject = `Your ${creation.type} is ready: ${creation.title}`;

  const html = renderEmail({
    greeting,
    title: creation.title,
    type: creation.type,
    shareLink,
    thumbnail: creation.thumbnail,
  });

  const text = `${greeting}\n\nYour ${creation.type} "${creation.title}" is ready!\n\nView it here: ${shareLink}\n\n— GSI AI Studio`;

  const result = await sendEmail({
    to: opts.to,
    subject,
    html,
    text,
  });

  return { messageId: result.messageId };
}

function renderEmail(params: {
  greeting: string;
  title: string;
  type: string;
  shareLink: string;
  thumbnail?: string;
}): string {
  const escapedTitle = escapeHtml(params.title);
  const escapedType = escapeHtml(params.type);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
  <p>${escapeHtml(params.greeting)}</p>
  <p>Your ${escapedType} <strong>${escapedTitle}</strong> is ready!</p>
  ${params.thumbnail ? `<p><img src="${escapeHtml(params.thumbnail)}" alt="${escapedTitle}" style="max-width: 100%; border-radius: 12px;" /></p>` : ''}
  <p style="margin-top: 24px;">
    <a href="${escapeHtml(params.shareLink)}" style="background: #6366F1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">View ${escapedType}</a>
  </p>
  <p style="color: #888; font-size: 13px; margin-top: 32px;">— GSI AI Studio</p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Conservative email validator. RFC 5321 / 5322 are wider than this on
 * purpose; we reject patterns that don't match a typical user-facing address
 * to keep the surface tight. Length cap defends against DoS.
 */
function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  if (email.length === 0 || email.length > 254) return false;
  // Single @, no whitespace, basic local + domain shape, TLD ≥ 2 chars.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
