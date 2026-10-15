export class AdmissionsView {
  static formatList(applications: any[]) {
    return applications.map((a) => ({
      id: a.id,
      referenceNumber: a.reference_number || a.referenceNumber,
      applicantName: `${a.applicant_first_name || a.firstName} ${a.applicant_last_name || a.lastName}`,
      applyingForClass: a.applying_for_class || a.applyingForClass,
      guardianName: a.guardian_name || a.guardianName,
      guardianPhone: a.guardian_phone || a.guardianPhone,
      status: a.status,
      appliedAt: a.created_at || a.createdAt,
    }));
  }
}
