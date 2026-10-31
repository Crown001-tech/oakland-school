import { describe, it, expect } from 'vitest';
import { calculateGrade, computeSubjectGrade, computeClassRankings } from '@/lib/grading';

describe('M0 Academic Integrity & BroadSheet Evaluation Gates', () => {
  // ----------------------------------------------------------------------------
  // 1. Grade Scale & Score Derivations
  // ----------------------------------------------------------------------------
  describe('Standard WAEC / Nigerian Secondary Grade Scale', () => {
    it('accurately derives letter grades and honor points from percentage marks', () => {
      expect(calculateGrade(95)).toEqual({
        grade: 'A+',
        points: 4.0,
        remark: 'Distinction',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      });

      expect(calculateGrade(82)).toEqual({
        grade: 'A',
        points: 4.0,
        remark: 'Excellent',
        color: 'text-teal-700 bg-teal-50 border-teal-200',
      });

      expect(calculateGrade(74)).toEqual({
        grade: 'B',
        points: 3.0,
        remark: 'Very Good',
        color: 'text-blue-700 bg-blue-50 border-blue-200',
      });

      expect(calculateGrade(65)).toEqual({
        grade: 'C',
        points: 2.0,
        remark: 'Good Credit',
        color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      });

      expect(calculateGrade(52)).toEqual({
        grade: 'D',
        points: 1.0,
        remark: 'Pass',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
      });

      expect(calculateGrade(35)).toEqual({
        grade: 'F',
        points: 0.0,
        remark: 'Fail',
        color: 'text-rose-700 bg-rose-50 border-rose-200',
      });
    });
  });

  // ----------------------------------------------------------------------------
  // 2. Strict Empty State / Scores Pending Invariant (Rule 1.4)
  // ----------------------------------------------------------------------------
  describe('Zero-Placeholder Empty States (Rule 1.4)', () => {
    it('returns Scores Pending and null total when scores are not yet recorded', () => {
      const result = computeSubjectGrade({ ca1: null, ca2: null, exam: null });
      expect(result.hasScores).toBe(false);
      expect(result.total).toBeNull();
      expect(result.grade).toBe('—');
      expect(result.remark).toBe('Scores Pending');
    });

    it('accurately sums continuous assessment (40%) and terminal exam (60%)', () => {
      const result = computeSubjectGrade({ ca1: 18, ca2: 17, exam: 52 });
      expect(result.hasScores).toBe(true);
      expect(result.total).toBe(87);
      expect(result.grade).toBe('A');
      expect(result.remark).toBe('Excellent');
    });

    it('caps continuous assessment at 20 marks and terminal exam at 60 marks', () => {
      // Over-maximum edge case should be clamped to 20 + 20 + 60 = 100
      const result = computeSubjectGrade({ ca1: 25, ca2: 30, exam: 75 });
      expect(result.total).toBe(100);
      expect(result.grade).toBe('A+');
    });
  });

  // ----------------------------------------------------------------------------
  // 3. Class Rankings & Cumulative Averages
  // ----------------------------------------------------------------------------
  describe('Class Broadsheet Ranking Computations', () => {
    it('ranks students strictly by true averages without dummy tie-breakers', () => {
      const studentScores = [
        {
          id: 'student-amina',
          scores: [
            { ca1: 18, ca2: 18, exam: 55 }, // 91
            { ca1: 17, ca2: 19, exam: 54 }, // 90
          ],
        },
        {
          id: 'student-chinedu',
          scores: [
            { ca1: 15, ca2: 15, exam: 45 }, // 75
            { ca1: 16, ca2: 16, exam: 48 }, // 80
          ],
        },
        {
          id: 'student-unscored',
          scores: [{ ca1: null, ca2: null, exam: null }],
        },
      ];

      const rankings = computeClassRankings(studentScores);

      // Amina: average 90.5 -> Rank 1
      expect(rankings.get('student-amina')).toEqual({ rank: 1, average: 90.5 });

      // Chinedu: average 77.5 -> Rank 2
      expect(rankings.get('student-chinedu')).toEqual({ rank: 2, average: 77.5 });

      // Unscored student: average null -> Rank 0 (unranked pending assessment)
      expect(rankings.get('student-unscored')).toEqual({ rank: 0, average: null });
    });
  });
});
