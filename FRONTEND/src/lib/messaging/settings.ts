import type { SchoolMessaging } from '@/lib/messaging/drain';
import { CATEGORY_OF } from '@/lib/messaging/templates';

/** Checks the messaging settings a proprietor sends, and returns the clean version or why it was refused. */
export function cleanMessagingSettings(input: unknown): { settings?: SchoolMessaging; error?: string } {
  const i = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out: SchoolMessaging = {};

  if (i.enabled !== undefined) {
    if (typeof i.enabled !== 'boolean') return { error: 'Choose on or off for messaging.' };
    out.enabled = i.enabled;
  }
  if (i.senderId !== undefined) {
    const s = typeof i.senderId === 'string' ? i.senderId.trim() : '';
    if (s && !/^[A-Za-z0-9 ]{3,11}$/.test(s)) return { error: 'The sender name must be 3 to 11 letters or digits.' };
    out.senderId = s || undefined;
  }
  if (i.whatsappDeviceId !== undefined) {
    const d = typeof i.whatsappDeviceId === 'string' ? i.whatsappDeviceId.trim() : '';
    if (d.length > 100) return { error: 'The WhatsApp device name is too long.' };
    out.whatsappDeviceId = d || undefined;
  }
  if (i.smsUnitCost !== undefined && i.smsUnitCost !== null && i.smsUnitCost !== '') {
    const c = Number(i.smsUnitCost);
    if (!Number.isFinite(c) || c < 0 || c > 1000) return { error: 'The cost of an SMS part must be a number from 0 to 1,000 naira.' };
    out.smsUnitCost = c;
  }
  if (i.useDndRoute !== undefined) {
    if (typeof i.useDndRoute !== 'boolean') return { error: 'Choose on or off for the DND route.' };
    out.useDndRoute = i.useDndRoute;
  }
  if (i.whatsappTemplates !== undefined) {
    if (!i.whatsappTemplates || typeof i.whatsappTemplates !== 'object' || Array.isArray(i.whatsappTemplates)) return { error: 'WhatsApp templates must be a list.' };
    const templates: NonNullable<SchoolMessaging['whatsappTemplates']> = {};
    for (const [event, raw] of Object.entries(i.whatsappTemplates as Record<string, unknown>)) {
      if (!(event in CATEGORY_OF)) return { error: `"${event}" is not a message this system sends.` };
      const t = (raw || {}) as { templateId?: unknown; fields?: unknown };
      const templateId = typeof t.templateId === 'string' ? t.templateId.trim() : '';
      if (!templateId) continue; // an empty template id means none
      if (templateId.length > 100) return { error: `The template id for ${event} is too long.` };
      const fields = Array.isArray(t.fields) ? t.fields.filter((f): f is string => typeof f === 'string' && /^[A-Za-z_][A-Za-z0-9_]{0,40}$/.test(f)) : undefined;
      templates[event] = { templateId, ...(fields && fields.length ? { fields } : {}) };
    }
    out.whatsappTemplates = templates;
  }
  return { settings: out };
}
