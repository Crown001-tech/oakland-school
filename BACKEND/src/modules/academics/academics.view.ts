export class AcademicsView {
  static formatClasses(classes: any[]) {
    return classes.map((c) => ({
      id: c.id,
      name: c.name,
      gradeLevel: c.grade_level,
      capacity: c.capacity || 40,
      enrolledCount: c.class_enrollments?.filter((e: any) => e.status === 'active')?.length || 0,
      classTeacher: c.class_teacher
        ? {
            id: c.class_teacher.id,
            name: `${c.class_teacher.first_name} ${c.class_teacher.last_name}`.trim(),
            email: c.class_teacher.email,
          }
        : null,
    }));
  }

  static formatAcademicCalendar(sessions: any[], terms: any[]) {
    const currentSession = sessions.find((s) => s.is_current) || sessions[0];
    const currentTerm = terms.find((t) => t.is_current) || terms[0];

    return {
      currentSession: currentSession ? { id: currentSession.id, name: currentSession.name, isCurrent: true } : null,
      currentTerm: currentTerm ? { id: currentTerm.id, name: currentTerm.name, termNumber: currentTerm.term_number } : null,
      sessions,
      terms,
    };
  }
}
