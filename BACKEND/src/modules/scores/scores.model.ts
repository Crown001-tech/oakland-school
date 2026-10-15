import { prisma } from '../../config/prisma.js';
import { ScoreStatus } from '@prisma/client';

export class ScoresModel {
  static async getAssessments(schoolId?: string, termId?: string, classId?: string) {
    const assessments = await prisma.assessment.findMany({
      where: {
        ...(schoolId ? { schoolId } : {}),
        ...(termId ? { termId } : {}),
        ...(classId ? { classId } : {}),
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, weightPercentage: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assessments.map(a => ({
      id: a.id,
      school_id: a.schoolId,
      subject_id: a.subjectId,
      class_id: a.classId,
      term_id: a.termId,
      category_id: a.categoryId,
      title: a.title,
      max_score: Number(a.maxScore),
      created_at: a.createdAt.toISOString(),
      subject: a.subject ? { id: a.subject.id, name: a.subject.name, code: a.subject.code } : null,
      class: a.class ? { id: a.class.id, name: a.class.name } : null,
    }));
  }

  static async getScoresByAssessment(assessmentId: string) {
    const scores = await prisma.score.findMany({
      where: { assessmentId },
      include: {
        enrollment: {
          select: {
            id: true,
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNumber: true,
              },
            },
          },
        },
      },
    });

    return scores.map(s => ({
      id: s.id,
      assessment_id: s.assessmentId,
      enrollment_id: s.enrollmentId,
      score: Number(s.score),
      status: s.status,
      graded_by: s.gradedBy,
      approved_by: s.approvedBy,
      comments: s.comments,
      created_at: s.createdAt.toISOString(),
      enrollment: s.enrollment
        ? {
            id: s.enrollment.id,
            student: s.enrollment.student
              ? {
                  id: s.enrollment.student.id,
                  first_name: s.enrollment.student.firstName,
                  last_name: s.enrollment.student.lastName,
                  admission_number: s.enrollment.student.admissionNumber,
                }
              : null,
          }
        : null,
    }));
  }

  static async recordScores(scores: Array<{
    assessment_id: string;
    enrollment_id: string;
    score: number;
    graded_by: string;
    status?: 'draft' | 'submitted' | 'reviewed' | 'approved' | 'published';
  }>) {
    if (!scores || scores.length === 0) return [];

    const upserts = scores.map(s => {
      const statusEnum = (s.status as ScoreStatus) || ScoreStatus.draft;

      return prisma.score.upsert({
        where: {
          assessmentId_enrollmentId: {
            assessmentId: s.assessment_id,
            enrollmentId: s.enrollment_id,
          },
        },
        update: {
          score: s.score,
          gradedBy: s.graded_by,
          status: statusEnum,
        },
        create: {
          assessmentId: s.assessment_id,
          enrollmentId: s.enrollment_id,
          score: s.score,
          gradedBy: s.graded_by,
          status: statusEnum,
        },
      });
    });

    const results = await prisma.$transaction(upserts);
    return results.map(r => ({
      id: r.id,
      assessment_id: r.assessmentId,
      enrollment_id: r.enrollmentId,
      score: Number(r.score),
      status: r.status,
      graded_by: r.gradedBy,
      created_at: r.createdAt.toISOString(),
    }));
  }

  static async getStudentReport(studentId: string, termId: string) {
    const report = await prisma.reportCard.findFirst({
      where: {
        termId,
        enrollment: {
          studentId,
        },
      },
      include: {
        enrollment: {
          include: {
            student: true,
            class: true,
          },
        },
        term: true,
      },
    });

    if (!report) return null;

    return {
      id: report.id,
      enrollment_id: report.enrollmentId,
      term_id: report.termId,
      total_score: report.totalScore ? Number(report.totalScore) : null,
      average_score: report.averageScore ? Number(report.averageScore) : null,
      rank: report.rank,
      attendance_present: report.attendancePresent,
      attendance_total: report.attendanceTotal,
      principal_comment: report.principalComment,
      teacher_comment: report.teacherComment,
      pdf_url: report.pdfUrl,
      status: report.status,
      access_token: report.accessToken,
      published_at: report.publishedAt?.toISOString(),
      created_at: report.createdAt.toISOString(),
      principal_approved: report.principalApproved,
      proprietor_endorsed: report.proprietorEndorsed,
    };
  }
}
