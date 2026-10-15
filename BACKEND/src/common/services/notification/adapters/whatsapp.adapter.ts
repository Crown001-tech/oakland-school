/**
 * Oakland International School - WhatsApp Channel Adapter
 * Handles WhatsApp Business API message delivery (Meta Cloud API / Twilio)
 * with robust local simulator for rich formatting and delivery status simulation.
 */

import {
  NotificationChannelAdapter,
  DeliveryResult,
  ChannelType,
} from './channel-adapter.interface.js';

export class WhatsAppAdapter implements NotificationChannelAdapter {
  public readonly channelType: ChannelType = 'whatsapp';
  private businessPhoneNumber: string = '+2348030001234';

  constructor(businessPhoneNumber?: string) {
    if (businessPhoneNumber) this.businessPhoneNumber = businessPhoneNumber;
  }

  public calculateCostUnits(_body: string): number {
    return 1; // 1 business conversation charge
  }

  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return '+234' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('+') && cleaned.startsWith('234')) {
      return '+' + cleaned;
    }
    return cleaned;
  }

  public async send(
    to: string,
    _subject: string,
    body: string,
    meta?: { isSimulated?: boolean; templateName?: string }
  ): Promise<DeliveryResult> {
    const timestamp = new Date().toISOString();
    const normalizedTo = this.normalizePhone(to);
    const messageId = `wa-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    console.log(
      `[WhatsAppAdapter] 💬 [WHATSAPP DISPATCH] From: ${this.businessPhoneNumber} | To: ${normalizedTo} | "${body.slice(0, 70)}..."`
    );

    return {
      success: true,
      messageId,
      channel: 'whatsapp',
      recipient: normalizedTo,
      status: 'delivered',
      isSimulated: true,
      costUnits: 1,
      timestamp,
    };
  }

  public async getStatus(messageId: string): Promise<'delivered' | 'sent' | 'pending' | 'failed'> {
    return messageId.includes('fail') ? 'failed' : 'delivered';
  }
}
