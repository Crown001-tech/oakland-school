import { describe, expect, it } from 'vitest';
import { buildDescriptiveCards, cleanTraits, TRAIT_SCALE, type ClassStudent } from '@/lib/report-cards';

const students: ClassStudent[] = [
  { id: 's1', enrollmentId: 'e1', admissionNo: 'A-1', name: 'Ada One' },
  { id: 's2', enrollmentId: 'e2', admissionNo: 'A-2', name: 'Ben Two' },
];
const subjects = ['Number Work', 'Letter Work', 'Social Habits'];

describe('Skill and behaviour ratings', () => {
  it("accepts whole-number ratings on the scale and keeps the teacher's words", () => {
    const r = cleanTraits([
      { name: ' Punctuality ', group: 'behaviour', rating: 5 },
      { name: 'Handwriting', group: 'skill', rating: TRAIT_SCALE.min },
    ]);
    expect(r.error).toBeUndefined();
    expect(r.traits).toEqual([
      { name: 'Punctuality', group: 'behaviour', rating: 5 },
      { name: 'Handwriting', group: 'skill', rating: 1 },
    ]);
  });

  it('treats no ratings as none, never as a default rating', () => {
    expect(cleanTraits(undefined)).toEqual({ traits: [] });
    expect(cleanTraits([])).toEqual({ traits: [] });
  });

  it.each([
    ['a rating above the scale', [{ name: 'Neatness', group: 'skill', rating: 6 }]],
    ['a rating below the scale', [{ name: 'Neatness', group: 'skill', rating: 0 }]],
    ['a fraction', [{ name: 'Neatness', group: 'skill', rating: 3.5 }]],
    ['a rating that is text', [{ name: 'Neatness', group: 'skill', rating: '4' }]],
    ['an unknown group', [{ name: 'Neatness', group: 'mood', rating: 3 }]],
    ['a missing name', [{ name: ' ', group: 'skill', rating: 3 }]],
    ['the same rating twice', [{ name: 'Neatness', group: 'skill', rating: 3 }, { name: 'neatness', group: 'skill', rating: 4 }]],
  ])('refuses %s', (_label, input) => {
    expect(cleanTraits(input).error).toBeTruthy();
  });

  it('refuses a list that is not a list, or is too long', () => {
    expect(cleanTraits('good').error).toBeTruthy();
    expect(cleanTraits(Array.from({ length: 31 }, (_, i) => ({ name: `T${i}`, group: 'skill', rating: 3 }))).error).toBeTruthy();
  });
});

describe('Descriptive report cards', () => {
  it('builds a card from the remarks and ratings the teacher wrote, with no marks', () => {
    const { cards, errors } = buildDescriptiveCards(
      students,
      {
        s1: {
          subjects: [{ name: 'number work', remark: 'Counts to 100 with confidence.' }, { name: 'Letter Work', remark: '  ' }],
          traits: [{ name: 'Punctuality', group: 'behaviour', rating: 4 }],
          comment: 'A joy to teach.',
        },
      },
      subjects
    );
    expect(errors).toEqual([]);
    expect(cards).toEqual([
      {
        studentId: 's1',
        enrollmentId: 'e1',
        subjects: [{ name: 'Number Work', remark: 'Counts to 100 with confidence.' }],
        traits: [{ name: 'Punctuality', group: 'behaviour', rating: 4 }],
        comment: 'A joy to teach.',
      },
    ]);
  });

  it('gives no card to a student the teacher wrote nothing for', () => {
    const { cards } = buildDescriptiveCards(students, { s1: {}, s2: { subjects: [{ name: 'Number Work', remark: '' }] } }, subjects);
    expect(cards).toEqual([]);
  });

  it('leaves out a card with a subject that is not registered, a student not in the class, or a bad rating, and says why', () => {
    const { cards, errors } = buildDescriptiveCards(
      students,
      {
        s1: { subjects: [{ name: 'Basket Weaving', remark: 'Nice.' }] },
        s2: { traits: [{ name: 'Neatness', group: 'skill', rating: 9 }] },
        stranger: { comment: 'Hello' },
      },
      subjects
    );
    expect(cards).toEqual([]);
    expect(errors).toHaveLength(3);
    expect(errors[0]).toContain('Ada One');
    expect(errors[1]).toContain('Ben Two');
  });

  it('refuses a remark that is far too long', () => {
    const { cards, errors } = buildDescriptiveCards(students, { s1: { subjects: [{ name: 'Number Work', remark: 'x'.repeat(501) }] } }, subjects);
    expect(cards).toEqual([]);
    expect(errors[0]).toContain('longer than');
  });
});
