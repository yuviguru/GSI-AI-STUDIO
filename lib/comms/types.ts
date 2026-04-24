/** Phase 4 (COMMS-001): provider-agnostic messaging contracts. */

export type CommsChannel = 'telegram' | 'whatsapp' | 'sms' | 'email';

export type DeliveryStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export interface ChannelRecipient {
  /** Parent's Firebase Auth UID. */
  parentUid: string;
  /** Channel-specific handle: phone number (+91…) for whatsapp/sms, email
   *  address for email, Telegram chat ID for telegram. */
  handle: string;
  /** Optional locale for this recipient's messages. */
  locale?: 'en' | 'hi';
}

export interface OutboundMessage {
  /** Template identifier for analytics + (WhatsApp) template approval lookups. */
  templateId: string;
  /** Rendered text body used by channels that accept freeform text
   *  (Telegram, SMS, email-plaintext-fallback). */
  text: string;
  /** Structured template parameters — future channels (WhatsApp templates)
   *  use these with the approved template. */
  params?: Record<string, string>;
  /** If set, message supports buttons (Telegram inline keyboard, etc). */
  cta?: { label: string; url: string };
}

export interface DeliveryReceipt {
  channel: CommsChannel;
  messageId?: string;
  status: DeliveryStatus;
  error?: string;
}

export interface MessagingProvider {
  readonly channel: CommsChannel;
  /** Returns a receipt; throws only on code bugs, not on delivery failure
   *  (a failed receipt still lets the orchestrator decide to retry / fall
   *  through to another channel). */
  send(
    recipient: ChannelRecipient,
    message: OutboundMessage,
  ): Promise<DeliveryReceipt>;
  /** Light health check so the settings UI can render a connection status. */
  healthCheck?(): Promise<{ ok: boolean; message?: string }>;
}

export interface ParentChannelPref {
  parentUid: string;
  channel: CommsChannel;
  handle: string;
  /** `granted` mirrors the DPDP parent_messaging consent scope for this
   *  (parentUid, kid) pair — stored here for fast reads in the hot path. */
  consentStatus: 'granted' | 'revoked';
  consentedAt: Date;
  revokedAt?: Date;
  locale?: 'en' | 'hi';
}
