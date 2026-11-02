import { describe, expect, it } from 'vitest';
import { buildClassName, insertLevel, splitClassName } from '@/lib/class-levels';
import { normalizeClass } from '@/lib/class-utils';

describe('class names', () => {
  it('joins a level and an arm', () => {
    expect(buildClassName('JSS 1', 'Diamond')).toBe('JSS 1 Diamond');
    expect(buildClassName('Primary 3', ' B ')).toBe('Primary 3 B');
    expect(buildClassName('Nursery 2', '')).toBe('Nursery 2');
  });

  it('splits a full name into level and arm when it starts with a known level', () => {
    expect(splitClassName('JSS 1 Diamond')).toEqual({ level: 'JSS 1', arm: 'Diamond' });
    expect(splitClassName('jss1a')).toEqual({ level: 'JSS 1', arm: 'a' });
    expect(splitClassName('Primary 4 Gold')).toEqual({ level: 'Primary 4', arm: 'Gold' });
    expect(splitClassName('Nursery 2')).toEqual({ level: 'Nursery 2', arm: '' });
  });

  it('does not mistake Primary 10 or SS 12 for a shorter level', () => {
    expect(splitClassName('Primary 10')).toEqual({ level: 'Primary 10', arm: '' });
    expect(splitClassName('SS 12')).toEqual({ level: 'SS 12', arm: '' });
  });

  it('treats an unknown name as its own level', () => {
    expect(splitClassName('Year 7 Blue')).toEqual({ level: 'Year 7 Blue', arm: '' });
    expect(splitClassName('Diamond')).toEqual({ level: 'Diamond', arm: '' });
  });
});

describe('class order', () => {
  it('places a new ladder level before the first later level', () => {
    expect(insertLevel(['JSS 1', 'JSS 2', 'SS 1'], 'Primary 6')).toEqual(['Primary 6', 'JSS 1', 'JSS 2', 'SS 1']);
    expect(insertLevel(['Primary 1', 'Primary 3'], 'Primary 2')).toEqual(['Primary 1', 'Primary 2', 'Primary 3']);
  });

  it('puts a level the ladder does not know last, and ignores one already there', () => {
    expect(insertLevel(['JSS 1', 'JSS 2'], 'Year 7')).toEqual(['JSS 1', 'JSS 2', 'Year 7']);
    expect(insertLevel(['JSS 1', 'JSS 2'], 'jss 1')).toEqual(['JSS 1', 'JSS 2']);
  });
});

describe('class names from a spreadsheet', () => {
  it('tidies a bare level but keeps an arm, so JSS 1A and JSS 1B stay separate classes', () => {
    expect(normalizeClass('JSS1')).toBe('JSS 1');
    expect(normalizeClass('sss 2')).toBe('SS 2');
    expect(normalizeClass('SS 1A')).toBe('SS 1A');
    expect(normalizeClass('JSS 1 Diamond')).toBe('JSS 1 Diamond');
    expect(normalizeClass('Silver')).toBe('Silver');
  });
});
