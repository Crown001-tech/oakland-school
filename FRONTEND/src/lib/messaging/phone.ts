/**
 * Nigerian mobile numbers, in the form messaging providers take: digits only, with the country code
 * (2348031234567). People write them many ways: 0803 123 4567, +234 803 123 4567, 803-123-4567.
 * Anything that is not a Nigerian mobile number gives null; a number is never guessed or padded.
 */
export function normalizeNgPhone(raw: unknown): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  let d = String(raw).replace(/[\s\-().]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (!/^\d+$/.test(d)) return null;

  if (d.startsWith('234') && d.length === 13) d = d.slice(3);
  else if (d.startsWith('0') && d.length === 11) d = d.slice(1);
  else if (d.length !== 10) return null;

  // A Nigerian mobile number is ten digits after the country code, starting 7, 8 or 9
  if (!/^[789]\d{9}$/.test(d)) return null;
  return `234${d}`;
}

/** The number shown to people: +234 803 123 4567, with the middle hidden when asked. */
export function formatNgPhone(phone: string, hideMiddle = false): string {
  const local = phone.startsWith('234') ? phone.slice(3) : phone;
  if (local.length !== 10) return phone;
  return hideMiddle ? `+234 ${local.slice(0, 3)} *** ${local.slice(6)}` : `+234 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
