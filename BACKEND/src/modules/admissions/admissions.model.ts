import { prisma } from '../../config/prisma.js';
import { AdmissionStatus, Gender } from '@prisma/client';

const DEFAULT_SCHOOL_ID = 'a0000000-0000-0000-0000-000000000001';

export class AdmissionsModel {
  static async list(filters?: { schoolId?: string; status?: string }) {
    try {
      const apps = await prisma.admissionApplication.findMany({
        where: {
          ...(filters?.schoolId ? { schoolId: filters.schoolId } : {}),
          ...(filters?.status && filters.status !== 'all' ? { status: filters.status as AdmissionStatus } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });

      return apps.map(a => ({
        id: a.id,
        school_id: a.schoolId,
        reference_number: a.referenceNumber,
        applicant_first_name: a.applicantFirstName,
        applicant_last_name: a.applicantLastName,
        first_name: a.applicantFirstName,
        last_name: a.applicantLastName,
        dob: a.dob.toISOString().split('T')[0],
        gender: a.gender,
        applying_for_class: a.applyingForClass,
        guardian_name: a.guardianName,
        guardian_email: a.guardianEmail,
        guardian_phone: a.guardianPhone,
        status: a.status,
        documents: a.documents,
        notes: a.notes,
        created_at: a.createdAt?.toISOString(),
        updated_at: a.updatedAt?.toISOString(),
      }));
    } catch (e: any) {
      console.warn('Admissions listing warning:', e.message);
      return [];
    }
  }

  static async create(application: any) {
    const reference = `ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const schoolId = application.school_id || DEFAULT_SCHOOL_ID;
    const firstName = application.applicant_first_name || application.first_name || 'Applicant';
    const lastName = application.applicant_last_name || application.last_name || 'Student';
    const dob = application.dob ? new Date(application.dob) : new Date('2015-01-01');
    const gender = (application.gender || 'male').toLowerCase() === 'female' ? Gender.female : Gender.male;

    const created = await prisma.admissionApplication.create({
      data: {
        schoolId,
        referenceNumber: reference,
        applicantFirstName: firstName,
        applicantLastName: lastName,
        dob,
        gender,
        applyingForClass: application.applying_for_class || application.class || 'JSS 1',
        guardianName: application.guardian_name || application.parent_name || 'Guardian',
        guardianEmail: application.guardian_email || application.parent_email || '',
        guardianPhone: application.guardian_phone || application.parent_phone || '',
        status: (application.status as AdmissionStatus) || AdmissionStatus.submitted,
        documents: application.documents || [],
        notes: application.notes || null,
      },
    });

    return {
      id: created.id,
      school_id: created.schoolId,
      reference_number: created.referenceNumber,
      applicant_first_name: created.applicantFirstName,
      applicant_last_name: created.applicantLastName,
      first_name: created.applicantFirstName,
      last_name: created.applicantLastName,
      dob: created.dob.toISOString().split('T')[0],
      gender: created.gender,
      applying_for_class: created.applyingForClass,
      guardian_name: created.guardianName,
      guardian_email: created.guardianEmail,
      guardian_phone: created.guardianPhone,
      status: created.status,
      created_at: created.createdAt?.toISOString(),
    };
  }

  static async updateStatus(id: string, status: string) {
    const updated = await prisma.admissionApplication.update({
      where: { id },
      data: {
        status: status as AdmissionStatus,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      updated_at: updated.updatedAt?.toISOString(),
    };
  }
}
