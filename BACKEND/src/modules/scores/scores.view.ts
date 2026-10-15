export class ScoresView {
  static formatScoreSheet(scores: any[]) {
    return scores.map((s) => ({
      id: s.id,
      score: s.score,
      status: s.status,
      comments: s.comments,
      studentId: s.enrollment?.student?.id,
      studentName: `${s.enrollment?.student?.first_name} ${s.enrollment?.student?.last_name}`,
      admissionNumber: s.enrollment?.student?.admission_number,
      gradedBy: s.graded_by,
      updatedAt: s.updated_at,
    }));
  }
}
