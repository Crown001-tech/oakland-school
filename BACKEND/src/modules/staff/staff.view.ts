export class StaffView {
  static formatList(staffList: any[]) {
    return staffList.map((s) => ({
      id: s.id,
      employeeId: s.employee_id,
      fullName: `${s.first_name} ${s.last_name}`.trim(),
      email: s.email,
      phone: s.phone,
      role: s.role,
      department: s.department,
      isActive: s.is_active,
      assignments: s.teacher_assignments?.map((a: any) => ({
        id: a.id,
        className: a.class?.name,
        subjectName: a.subject?.name,
        isClassTeacher: a.is_class_teacher,
      })) || [],
    }));
  }
}
