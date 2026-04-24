/**
 * WhatsApp Cloud API adapter — placeholder.
 *
 * Full implementation lands with Sprint 7-8 once Meta Business Solution
 * Provider (BSP) onboarding + template approval is complete. Leaving the
 * identity registered so parent-channel prefs can select `whatsapp` now
 * and the messaging service treats unsent WhatsApp messages as a soft
 * failure with a clear message until we flip the switch.
 */

import type {
  ChannelRecipient,
  DeliveryReceipt,
  MessagingProvider,
  OutboundMessage,
} from '../types';

export class WhatsAppProvider implements MessagingProvider {
  readonly channel = 'whatsapp' as const;

  async send(
    _recipient: ChannelRecipient,
    _message: OutboundMessage,
  ): Promise<DeliveryReceipt> {
    return {
      channel: this.channel,
      status: 'failed',
      error:
        'WhatsApp delivery is pending Meta BSP approval (Sprint 7-8).',
    };
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    return {
      ok: false,
      message: 'WhatsApp adapter is registered but awaiting BSP approval.',
    };
  }
}
