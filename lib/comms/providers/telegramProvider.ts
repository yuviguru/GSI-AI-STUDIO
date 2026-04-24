/**
 * Telegram adapter for the Phase 4 MessagingService.
 *
 * Wraps the existing `TelegramAdapter` (lib/bot/adapters/telegram.ts)
 * rather than rebuilding Telegram plumbing. Uses
 * `TELEGRAM_BOT_TOKEN_STUDIO` — the same bot identity the homework digest
 * stream already sends from, so parents see one coherent source.
 */

import { TelegramAdapter } from '@/lib/bot/adapters/telegram';
import type {
  ChannelRecipient,
  DeliveryReceipt,
  MessagingProvider,
  OutboundMessage,
} from '../types';

export class TelegramProvider implements MessagingProvider {
  readonly channel = 'telegram' as const;
  private adapter: TelegramAdapter | null = null;

  private getAdapter(): TelegramAdapter | null {
    if (this.adapter) return this.adapter;
    const token = process.env.TELEGRAM_BOT_TOKEN_STUDIO;
    if (!token) return null;
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? undefined;
    this.adapter = new TelegramAdapter(token, secret ? { secretToken: secret } : undefined);
    return this.adapter;
  }

  async send(
    recipient: ChannelRecipient,
    message: OutboundMessage,
  ): Promise<DeliveryReceipt> {
    const adapter = this.getAdapter();
    if (!adapter) {
      return {
        channel: this.channel,
        status: 'failed',
        error:
          'TELEGRAM_BOT_TOKEN_STUDIO is not configured — skipping Telegram delivery.',
      };
    }

    const chatId = recipient.handle.trim();
    if (!chatId) {
      return {
        channel: this.channel,
        status: 'failed',
        error: 'Empty Telegram chat ID.',
      };
    }

    try {
      const text = message.cta
        ? `${message.text}\n\n${message.cta.label}: ${message.cta.url}`
        : message.text;
      const messageId = await adapter.send({
        chatId,
        text,
        parseMode: 'markdown',
      });
      return { channel: this.channel, status: 'sent', messageId };
    } catch (err) {
      return {
        channel: this.channel,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown Telegram error',
      };
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    const adapter = this.getAdapter();
    if (!adapter) {
      return {
        ok: false,
        message: 'TELEGRAM_BOT_TOKEN_STUDIO is not set.',
      };
    }
    return { ok: true };
  }
}
