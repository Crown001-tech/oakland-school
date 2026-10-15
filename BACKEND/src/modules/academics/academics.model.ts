import { prisma } from '../../config/prisma.js';

export const DEFAULT_OFFICIAL_SUBJECTS = [
  // 10 JSS Core Subjects
  { id: 'sub-jss-01', name: 'Mathematics', code: 'MTH-JSS', category: 'General', is_active: true },
  { id: 'sub-jss-02', name: 'English Language', code: 'ENG-JSS', category: 'Languages & Arts', is_active: true },
  { id: 'sub-jss-03', name: 'Basic Science', code: 'BSC-JSS', category: 'Sciences', is_active: true },
  { id: 'sub-jss-04', name: 'Basic Technology', code: 'BTE-JSS', category: 'Vocational & Tech', is_active: true },
  { id: 'sub-jss-05', name: 'Computer Studies', code: 'CMP-JSS', category: 'Vocational & Tech', is_active: true },
  { id: 'sub-jss-06', name: 'Social Studies', code: 'SST-JSS', category: 'Humanities', is_active: true },
  { id: 'sub-jss-07', name: 'Civic Education', code: 'CVE-JSS', category: 'Humanities', is_active: true },
  { id: 'sub-jss-08', name: 'Agricultural Science', code: 'AGR-JSS', category: 'Vocational & Tech', is_active: true },
  { id: 'sub-jss-09', name: 'French', code: 'FRN-JSS', category: 'Languages & Arts', is_active: true },
  { id: 'sub-jss-10', name: 'Cultural & Creative Arts (CCA)', code: 'CCA-JSS', category: 'Languages & Arts', is_active: true },

  // Senior Core
  { id: 'sub-sss-01', name: 'Mathematics', code: 'MTH-SSS', category: 'General', is_active: true },
  { id: 'sub-sss-02', name: 'English Language', code: 'ENG-SSS', category: 'Languages & Arts', is_active: true },
  { id: 'sub-sss-03', name: 'Civic Education', code: 'CVE-SSS', category: 'Humanities', is_active: true },
  { id: 'sub-sss-04', name: 'Computer Studies / Data Processing', code: 'DPR-SSS', category: 'Vocational & Tech', is_active: true },

  // Senior Science
  { id: 'sub-sss-05', name: 'Physics', code: 'PHY-SSS', category: 'Sciences', is_active: true },
  { id: 'sub-sss-06', name: 'Chemistry', code: 'CHM-SSS', category: 'Sciences', is_active: true },
  { id: 'sub-sss-07', name: 'Biology', code: 'BIO-SSS', category: 'Sciences', is_active: true },
  { id: 'sub-sss-08', name: 'Further Mathematics', code: 'FMT-SSS', category: 'Sciences', is_active: true },
  { id: 'sub-sss-09', name: 'Technical Drawing', code: 'TDR-SSS', category: 'Vocational & Tech', is_active: true },

  // Senior Commercial
  { id: 'sub-sss-10', name: 'Financial Accounting', code: 'ACC-SSS', category: 'Commercial', is_active: true },
  { id: 'sub-sss-11', name: 'Economics', code: 'ECO-SSS', category: 'Commercial', is_active: true },
  { id: 'sub-sss-12', name: 'Commerce', code: 'COM-SSS', category: 'Commercial', is_active: true },
  { id: 'sub-sss-13', name: 'Business Management', code: 'MGT-SSS', category: 'Commercial', is_active: true },

  // Senior Humanities
  { id: 'sub-sss-14', name: 'Literature in English', code: 'LIT-SSS', category: 'Languages & Arts', is_active: true },
  { id: 'sub-sss-15', name: 'Government', code: 'GOV-SSS', category: 'Humanities', is_active: true },
  { id: 'sub-sss-16', name: 'Christian Religious Studies (CRS) / Islamic Religious Studies (IRS)', code: 'CRS-SSS', category: 'Humanities', is_active: true },
  { id: 'sub-sss-17', name: 'History / Geography', code: 'HIS-SSS', category: 'Humanities', is_active: true },
];

let cachedSyncedSubjects: any[] = [];

export class AcademicsModel {
  static async getSessions(schoolId?: string) {
    const sessions = await prisma.academicSession.findMany({
      where: schoolId ? { schoolId } : undefined,
      orderBy: { startDate: 'desc' },
    });

    return sessions.map(s => ({
      id: s.id,
      school_id: s.schoolId,
      name: s.name,
      start_date: s.startDate.toISOString().split('T')[0],
      end_date: s.endDate.toISOString().split('T')[0],
      is_current: s.isCurrent,
      created_at: s.createdAt.toISOString(),
    }));
  }

  static async getTerms(sessionId?: string, schoolId?: string) {
    const terms = await prisma.academicTerm.findMany({
      where: {
        ...(sessionId ? { sessionId } : {}),
        ...(schoolId ? { schoolId } : {}),
      },
      orderBy: { termNumber: 'asc' },
    });

    return terms.map(t => ({
      id: t.id,
      session_id: t.sessionId,
      school_id: t.schoolId,
      name: t.name,
      term_number: t.termNumber,
      start_date: t.startDate.toISOString().split('T')[0],
      end_date: t.endDate.toISOString().split('T')[0],
      is_current: t.isCurrent,
      created_at: t.createdAt.toISOString(),
    }));
  }

  static async getClasses(schoolId?: string) {
    const classes = await prisma.class.findMany({
      where: schoolId ? { schoolId } : undefined,
      include: {
        teacherAssignments: {
          where: { isClassTeacher: true },
          include: {
            staffProfile: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        enrollments: {
          select: { id: true, studentId: true, status: true },
        },
      },
      orderBy: { gradeLevel: 'asc' },
    });

    return classes.map(c => {
      const classTeacherAssign = c.teacherAssignments[0];
      const classTeacher = classTeacherAssign?.staffProfile
        ? {
            id: classTeacherAssign.staffProfile.id,
            first_name: classTeacherAssign.staffProfile.firstName,
            last_name: classTeacherAssign.staffProfile.lastName,
            email: classTeacherAssign.staffProfile.email,
          }
        : null;

      return {
        id: c.id,
        school_id: c.schoolId,
        name: c.name,
        grade_level: c.gradeLevel,
        arm: c.arm,
        capacity: c.capacity,
        created_at: c.createdAt.toISOString(),
        class_teacher: classTeacher,
        class_enrollments: c.enrollments.map(e => ({
          id: e.id,
          student_id: e.studentId,
          status: e.status,
        })),
      };
    });
  }

  static async getSubjects(schoolId?: string) {
    if (cachedSyncedSubjects.length > 0) {
      return cachedSyncedSubjects;
    }
    try {
      const subjects = await prisma.subject.findMany({
        where: schoolId ? { schoolId } : undefined,
        orderBy: { name: 'asc' },
      });
      if (subjects && subjects.length > 0) {
        return subjects.map(s => ({
          id: s.id,
          school_id: s.schoolId,
          name: s.name,
          code: s.code,
          category: s.category,
          is_active: s.isActive,
          created_at: s.createdAt.toISOString(),
        }));
      }
    } catch (e: any) {
      console.warn('getSubjects warning:', e.message);
    }
    return DEFAULT_OFFICIAL_SUBJECTS;
  }

  static async syncSubjects(subjects: any[]) {
    if (Array.isArray(subjects) && subjects.length > 0) {
      cachedSyncedSubjects = subjects;
    }
    return cachedSyncedSubjects.length > 0 ? cachedSyncedSubjects : DEFAULT_OFFICIAL_SUBJECTS;
  }

  static async createClass(classData: {
    school_id: string;
    name: string;
    grade_level: number;
    arm?: string;
    capacity?: number;
    class_teacher_id?: string;
  }) {
    const created = await prisma.class.create({
      data: {
        schoolId: classData.school_id,
        name: classData.name,
        gradeLevel: classData.grade_level,
        arm: classData.arm || 'A',
        capacity: classData.capacity ?? 40,
      },
    });

    if (classData.class_teacher_id) {
      try {
        await prisma.teacherAssignment.create({
          data: {
            schoolId: classData.school_id,
            staffId: classData.class_teacher_id,
            classId: created.id,
            isClassTeacher: true,
          },
        });
      } catch (e: any) {
        console.warn('Teacher assignment warning on createClass:', e.message);
      }
    }

    return {
      id: created.id,
      school_id: created.schoolId,
      name: created.name,
      grade_level: created.gradeLevel,
      arm: created.arm,
      capacity: created.capacity,
      created_at: created.createdAt.toISOString(),
    };
  }

  static async assignTeacher(assignment: {
    school_id: string;
    staff_id: string;
    class_id: string;
    subject_id?: string;
    session_id?: string;
    is_class_teacher?: boolean;
  }) {
    const created = await prisma.teacherAssignment.create({
      data: {
        schoolId: assignment.school_id,
        staffId: assignment.staff_id,
        classId: assignment.class_id,
        subjectId: assignment.subject_id || undefined,
        sessionId: assignment.session_id || undefined,
        isClassTeacher: !!assignment.is_class_teacher,
      },
    });

    return {
      id: created.id,
      school_id: created.schoolId,
      staff_id: created.staffId,
      class_id: created.classId,
      subject_id: created.subjectId,
      session_id: created.sessionId,
      is_class_teacher: created.isClassTeacher,
      created_at: created.createdAt.toISOString(),
    };
  }
}
