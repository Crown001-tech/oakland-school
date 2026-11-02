import { describe, expect, it } from 'vitest';
import { brandCssVariables, isHexColor } from '@/lib/brand-colors';

describe('brandCssVariables', () => {
  it('turns two hex colours into the six theme variables', () => {
    const vars = brandCssVariables('#0b5d3b', '#f59e0b')!;
    expect(Object.keys(vars).sort()).toEqual([
      '--brand-accent',
      '--brand-accent-hover',
      '--brand-accent-soft',
      '--brand-primary',
      '--brand-primary-light',
      '--brand-primary-soft',
    ]);
    expect(vars['--brand-primary']).toBe('#0b5d3b');
    expect(vars['--brand-accent']).toBe('#f59e0b');
  });

  it('derives a lighter primary, a near-white soft shade and a darker accent hover', () => {
    const vars = brandCssVariables('#000000', '#ffffff')!;
    expect(vars['--brand-primary-light']).toBe('#141414');
    expect(vars['--brand-primary-soft']).toBe('#ebebeb');
    expect(vars['--brand-accent-hover']).toBe('#d9d9d9');
    expect(vars['--brand-accent-soft']).toBe('#ffffff');
  });

  it('changes only the colour that was given', () => {
    expect(Object.keys(brandCssVariables('#112233', undefined)!).every((k) => k.startsWith('--brand-primary'))).toBe(true);
    expect(Object.keys(brandCssVariables(undefined, '#112233')!).every((k) => k.startsWith('--brand-accent'))).toBe(true);
  });

  it('ignores anything that is not a six-digit hex colour, keeping the default theme', () => {
    for (const bad of ['red', '#fff', '#12345', '#1234567', '0b5d3b', 'url(x)', '#12345g', '', null, undefined]) {
      expect(brandCssVariables(bad as string, bad as string)).toBeUndefined();
    }
  });

  it('accepts upper-case hex and trims spaces', () => {
    expect(brandCssVariables(' #0B5D3B ', null)!['--brand-primary']).toBe('#0b5d3b');
    expect(isHexColor('#ABCDEF')).toBe(true);
  });
});
