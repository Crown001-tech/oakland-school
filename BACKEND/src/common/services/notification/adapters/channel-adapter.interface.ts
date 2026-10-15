/**
 * Oakland International School - Notification Strategy Pattern
 * Channel Adapter Contract for Email, SMS, and WhatsApp integrations.
 */

export type ChannelType = 'email' | 'sms' | 'whatsapp';

export interface DeliveryResult {
  success: boolean;
  messageId: string;
  channel: ChannelType;
  recipient: string;
  status: 'delivered' | 'sent' | 'pending' | 'failed';
  error?: string;
  isSimulated?: boolean;
  costUnits?: number;
  timestamp: string;
}

export interface ChannelConfig {
  id?: string;
  schoolId: string;
  type: ChannelType;
  name: string;
  provider: string;
  isActive: boolean;
  isSimulated: boolean;
  senderId: string;
  credentials?: Record<string, any>;
  balanceUnits: number;
  sentToday: number;
  dailyLimit: number;
}

export interface NotificationChannelAdapter {
  readonly channelType: ChannelType;
  send(to: string, subject: string, body: string, meta?: any): Promise<DeliveryResult>;
  getStatus(messageId: string): Promise<'delivered' | 'sent' | 'pending' | 'failed'>;
  calculateCostUnits(body: string): number;
}
