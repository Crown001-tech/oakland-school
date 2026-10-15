import { prisma } from '../../config/prisma.js';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceModel {
  static async getByClassAndDate(classId: string, date: string) {
    const targetDate = new Date(date);
    const records = await prisma.attendanceRecord.findMany({
      where: {
        classId,
        date: targetDate,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
    });

    return records.map(r => ({
      id: r.id,
      school_id: r.schoolId,
      class_id: r.classId,
      student_id: r.studentId,
      session_id: r.sessionId,
      term_id: r.termId,
      date: r.date.toISOString().split('T')[0],
      status: r.status,
      check_in_time: r.checkInTime?.toISOString(),
      check_out_time: r.checkOutTime?.toISOString(),
      late_reason: r.lateReason,
      marked_by: r.markedBy,
      notes: r.notes,
      created_at: r.createdAt.toISOString(),
      student: r.student
        ? {
            id: r.student.id,
            first_name: r.student.firstName,
            last_name: r.student.lastName,
            admission_number: r.student.admissionNumber,
          }
        : null,
    }));
  }

  static async markBatch(records: Array<{
    school_id: string;
    class_id: string;
    student_id: string;
    session_id?: string;
    term_id?: string;
    date: string;
    status: 'present' | 'late' | 'absent' | 'excused';
    marked_by: string;
    notes?: string;
  }>) {
    if (!records || records.length === 0) return [];

    const upserts = records.map(rec => {
      const recordDate = new Date(rec.date);
      const statusEnum = rec.status as AttendanceStatus;

      return prisma.attendanceRecord.upsert({
        where: {
          studentId_date: {
            studentId: rec.student_id,
            date: recordDate,
          },
        },
        update: {
          status: statusEnum,
          markedBy: rec.marked_by,
          notes: rec.notes || null,
        },
        create: {
          schoolId: rec.school_id,
          classId: rec.class_id,
          studentId: rec.student_id,
          sessionId: rec.session_id || undefined,
          termId: rec.term_id || undefined,
          date: recordDate,
          status: statusEnum,
          markedBy: rec.marked_by,
          notes: rec.notes || null,
        },
      });
    });

    const results = await prisma.$transaction(upserts);
    return results.map(r => ({
      id: r.id,
      school_id: r.schoolId,
      class_id: r.classId,
      student_id: r.studentId,
      session_id: r.sessionId,
      term_id: r.termId,
      date: r.date.toISOString().split('T')[0],
      status: r.status,
      marked_by: r.markedBy,
      notes: r.notes,
      created_at: r.createdAt.toISOString(),
    }));
  }

  static async getStudentSummary(studentId: string, termId?: string) {
    const records = await prisma.attendanceRecord.findMany({
      where: {
        studentId,
        ...(termId ? { termId } : {}),
      },
      select: {
        status: true,
        date: true,
      },
    });

    return records.map(r => ({
      status: r.status,
      date: r.date.toISOString().split('T')[0],
    }));
  }
}
