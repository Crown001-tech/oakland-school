export class AttendanceView {
  static formatClassSheet(records: any[]) {
    const counts = {
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      total: records.length,
    };

    const studentLogs = records.map((r) => {
      const status = r.status as 'present' | 'late' | 'absent' | 'excused';
      if (counts[status] !== undefined) {
        counts[status]++;
      }
      return {
        id: r.id,
        studentId: r.student_id,
        studentName: `${r.student?.first_name} ${r.student?.last_name}`,
        admissionNumber: r.student?.admission_number,
        status: r.status,
        checkInTime: r.check_in_time,
        lateReason: r.late_reason,
        notes: r.notes,
      };
    });

    return {
      summary: counts,
      students: studentLogs,
    };
  }
}
