import { formatNaira } from '@/lib/money';

/**
 * The wording of every message the system sends. Pure, so it is tested without sending anything.
 * A message states only what the system holds: a missing value is an error, never a guess, and no message
 * carries a score, a fee figure or a name that was not passed in.
 */

export type MessageEvent =
  | 'payment_received'
  | 'absent'
  | 'late'
  | 'gate_release'
  | 'results_released'
  | 'broadcast'
  | 'fee_reminder_upcoming'
  | 'fee_reminder_overdue'
  | 'parent_invite';

export type MessageCategory = 'payment' | 'attendance' | 'gate' | 'results' | 'broadcast' | 'reminder' | 'invite';

export const CATEGORY_OF: Record<MessageEvent, MessageCategory> = {
  payment_received: 'payment',
  absent: 'attendance',
  late: 'attendance',
  gate_release: 'gate',
  results_released: 'results',
  broadcast: 'broadcast',
  fee_reminder_upcoming: 'reminder',
  fee_reminder_overdue: 'reminder',
  parent_invite: 'invite',
};

export interface MessageParams {
  school: string;
  student?: string;
  amount?: number;
  balance?: number;
  receipt?: string;
  date?: string;
  time?: string;
  term?: string;
  collectedBy?: string;
  dueDate?: string;
  link?: string;
  subject?: string;
  text?: string;
}

export interface BuiltMessage {
  subject: string;
  body: string;
  /** The values a WhatsApp template is filled from, by name */
  fields: Record<string, string>;
}

function need(params: MessageParams, keys: (keyof MessageParams)[], event: MessageEvent) {
  for (const k of keys) {
    const v = params[k];
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
      throw new Error(`The ${event} message needs ${k}.`);
    }
  }
}

const str = (v: unknown) => String(v ?? '');

export function buildMessage(event: MessageEvent, p: MessageParams): BuiltMessage {
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== null) fields[k] = k === 'amount' || k === 'balance' ? formatNaira(Number(v)) : str(v);

  switch (event) {
    case 'payment_received': {
      need(p, ['school', 'student', 'amount', 'receipt', 'balance'], event);
      const balance = p.balance! > 0 ? `Balance: ${formatNaira(p.balance!)}.` : 'Fees for this term are fully paid.';
      return {
        subject: `Payment received for ${p.student}`,
        body: `${p.school}: We received ${formatNaira(p.amount!)} for ${p.student}. Receipt ${p.receipt}. ${balance}`,
        fields,
      };
    }
    case 'absent':
      need(p, ['school', 'student', 'date'], event);
      return { subject: `${p.student} was absent`, body: `${p.school}: ${p.student} was marked absent on ${p.date}. Please contact the school if this is unexpected.`, fields };
    case 'late':
      need(p, ['school', 'student', 'date'], event);
      return { subject: `${p.student} arrived late`, body: `${p.school}: ${p.student} arrived late on ${p.date}.`, fields };
    case 'gate_release':
      need(p, ['school', 'student', 'time', 'collectedBy'], event);
      return { subject: `${p.student} left school`, body: `${p.school}: ${p.student} was released at the gate at ${p.time} to ${p.collectedBy}.`, fields };
    case 'results_released':
      need(p, ['school', 'student', 'term'], event);
      return { subject: `${p.student}'s results`, body: `${p.school}: ${p.student}'s ${p.term} results are now available in the parent portal.`, fields };
    case 'broadcast':
      need(p, ['school', 'text'], event);
      return { subject: p.subject?.trim() || `Notice from ${p.school}`, body: `${p.school}: ${p.subject?.trim() ? `${p.subject.trim()}. ` : ''}${p.text!.trim()}`, fields };
    case 'fee_reminder_upcoming':
      need(p, ['school', 'student', 'amount', 'dueDate'], event);
      return { subject: `Fee reminder for ${p.student}`, body: `${p.school}: Reminder: ${formatNaira(p.amount!)} for ${p.student} is due on ${p.dueDate}.`, fields };
    case 'fee_reminder_overdue':
      need(p, ['school', 'student', 'amount', 'dueDate'], event);
      return { subject: `Overdue fees for ${p.student}`, body: `${p.school}: ${formatNaira(p.amount!)} for ${p.student} was due on ${p.dueDate} and is still unpaid. Please pay or contact the bursar.`, fields };
    case 'parent_invite':
      need(p, ['school', 'link'], event);
      return { subject: `Set up your ${p.school} parent account`, body: `${p.school}: Set up your parent account here: ${p.link} The link works for 7 days.`, fields };
  }
}
