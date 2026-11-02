/**
 * A school's two brand colours (NEXT_PUBLIC_BRAND_PRIMARY, NEXT_PUBLIC_BRAND_ACCENT) become the six theme
 * variables the app uses. The lighter, softer and hover shades are derived, so a school supplies two hex
 * values, not six. A value that is not a six-digit hex colour is ignored and the default theme stays.
 */

const HEX = /^#[0-9a-f]{6}$/i;

export const isHexColor = (value: unknown): value is string => typeof value === 'string' && HEX.test(value.trim());

function mix(hex: string, withHex: string, amount: number): string {
  const channel = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const part = (i: number) => {
    const v = Math.round(channel(hex, i) * (1 - amount) + channel(withHex, i) * amount);
    return Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0');
  };
  return `#${part(0)}${part(1)}${part(2)}`;
}

export function brandCssVariables(primary?: string | null, accent?: string | null): Record<string, string> | undefined {
  const vars: Record<string, string> = {};
  if (isHexColor(primary)) {
    const p = primary.trim().toLowerCase();
    vars['--brand-primary'] = p;
    vars['--brand-primary-light'] = mix(p, '#ffffff', 0.08);
    vars['--brand-primary-soft'] = mix(p, '#ffffff', 0.92);
  }
  if (isHexColor(accent)) {
    const a = accent.trim().toLowerCase();
    vars['--brand-accent'] = a;
    vars['--brand-accent-hover'] = mix(a, '#000000', 0.15);
    vars['--brand-accent-soft'] = mix(a, '#ffffff', 0.94);
  }
  return Object.keys(vars).length > 0 ? vars : undefined;
}
