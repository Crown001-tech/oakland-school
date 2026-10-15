export interface StudentListItemView {
  id: string;
  admissionNumber: string;
  name: string;
  gender: string;
  status: string;
  currentClass?: string;
  dob: string;
  createdAt: string;
}

export class StudentsView {
  static formatList(students: any[]): StudentListItemView[] {
    return students.map((s) => {
      const activeEnrollment = s.class_enrollments?.find((e: any) => e.status === 'active') || s.class_enrollments?.[0];
      const className = activeEnrollment?.classes?.name || 'Unassigned';

      return {
        id: s.id,
        admissionNumber: s.admission_number,
        name: `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.replace(/\s+/g, ' ').trim(),
        gender: s.gender,
        status: s.status,
        currentClass: className,
        dob: s.dob,
        createdAt: s.created_at,
      };
    });
  }

  static formatDetail(student: any) {
    if (!student) return null;
    return {
      id: student.id,
      admissionNumber: student.admission_number,
      firstName: student.first_name,
      middleName: student.middle_name,
      lastName: student.last_name,
      fullName: `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.replace(/\s+/g, ' ').trim(),
      gender: student.gender,
      dob: student.dob,
      bloodGroup: student.blood_group,
      address: student.address,
      status: student.status,
      photoUrl: student.photo_url,
      guardians: student.guardians?.map((g: any) => ({
        id: g.id,
        relationship: g.relationship,
        isPrimary: g.is_primary,
        name: `${g.guardian?.first_name} ${g.guardian?.last_name}`,
        phone: g.guardian?.phone,
        email: g.guardian?.email,
      })) || [],
      enrollments: student.class_enrollments || [],
    };
  }
}
