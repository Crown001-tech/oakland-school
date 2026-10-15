import { prisma } from '../../config/prisma.js';
import { StudentStatus } from '@prisma/client';

export class StudentsModel {
  /**
   * List students with filtering, search, and enrolled class relationships.
   */
  static async list(filters?: { schoolId?: string; status?: string; search?: string }) {
    const where: any = {};

    if (filters?.schoolId) {
      where.schoolId = filters.schoolId;
    }

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status as StudentStatus;
    }

    if (filters?.search) {
      const term = filters.search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { admissionNumber: { contains: term, mode: 'insensitive' } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        enrollments: {
          include: {
            class: {
              select: { id: true, name: true, gradeLevel: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to preserve exact backward-compatible contract for controllers & views
    return students.map((s) => ({
      id: s.id,
      school_id: s.schoolId,
      admission_number: s.admissionNumber,
      first_name: s.firstName,
      middle_name: s.middleName,
      last_name: s.lastName,
      gender: s.gender,
      dob: s.dob,
      blood_group: s.bloodGroup,
      address: s.address,
      photo_url: s.photoUrl,
      status: s.status,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
      class_enrollments: s.enrollments.map((e) => ({
        id: e.id,
        class_id: e.classId,
        status: e.status,
        classes: e.class ? { id: e.class.id, name: e.class.name, grade_level: e.class.gradeLevel } : null,
      })),
    }));
  }

  /**
   * Find a single student by ID with guardians and class enrollments.
   */
  static async findById(id: string) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        studentGuardians: {
          include: {
            guardian: true,
          },
        },
        enrollments: {
          include: {
            class: true,
          },
        },
      },
    });

    if (!student) return null;

    return {
      id: student.id,
      school_id: student.schoolId,
      admission_number: student.admissionNumber,
      first_name: student.firstName,
      middle_name: student.middleName,
      last_name: student.lastName,
      gender: student.gender,
      dob: student.dob,
      blood_group: student.bloodGroup,
      address: student.address,
      photo_url: student.photoUrl,
      status: student.status,
      created_at: student.createdAt,
      updated_at: student.updatedAt,
      guardians: student.studentGuardians.map((sg) => ({
        id: sg.id,
        relationship: sg.relationship,
        is_primary: sg.isPrimary,
        authorized_pickup: sg.authorizedPickup,
        pickup_pin: sg.pickupPin,
        pickup_photo_url: sg.pickupPhotoUrl,
        guardian: sg.guardian
          ? {
              id: sg.guardian.id,
              first_name: sg.guardian.firstName,
              last_name: sg.guardian.lastName,
              email: sg.guardian.email,
              phone: sg.guardian.phone,
              address: sg.guardian.address,
            }
          : null,
      })),
      class_enrollments: student.enrollments.map((e) => ({
        id: e.id,
        status: e.status,
        classes: e.class ? { id: e.class.id, name: e.class.name, grade_level: e.class.gradeLevel } : null,
      })),
    };
  }

  /**
   * Create student record.
   */
  static async create(studentData: any) {
    const schoolId = studentData.school_id || studentData.schoolId;
    const admissionNumber = studentData.admission_number || studentData.admissionNumber;

    // Check duplicate admission number if provided
    if (schoolId && admissionNumber) {
      const existing = await prisma.student.findUnique({
        where: {
          schoolId_admissionNumber: {
            schoolId,
            admissionNumber,
          },
        },
      });
      if (existing) return existing;
    }

    const created = await prisma.student.create({
      data: {
        schoolId,
        admissionNumber: admissionNumber || `OAK-${Math.floor(1000 + Math.random() * 9000)}`,
        firstName: studentData.first_name || studentData.firstName,
        middleName: studentData.middle_name || studentData.middleName || null,
        lastName: studentData.last_name || studentData.lastName,
        gender: studentData.gender || null,
        dob: studentData.dob ? new Date(studentData.dob) : null,
        bloodGroup: studentData.blood_group || studentData.bloodGroup || null,
        address: studentData.address || null,
        photoUrl: studentData.photo_url || studentData.photoUrl || null,
        status: (studentData.status as StudentStatus) || StudentStatus.active,
      },
    });

    return created;
  }

  /**
   * Update student details.
   */
  static async update(id: string, updates: any) {
    const data: any = {};
    if (updates.first_name !== undefined) data.firstName = updates.first_name;
    if (updates.last_name !== undefined) data.lastName = updates.last_name;
    if (updates.middle_name !== undefined) data.middleName = updates.middle_name;
    if (updates.admission_number !== undefined) data.admissionNumber = updates.admission_number;
    if (updates.status !== undefined) data.status = updates.status as StudentStatus;
    if (updates.gender !== undefined) data.gender = updates.gender;
    if (updates.dob !== undefined) data.dob = updates.dob ? new Date(updates.dob) : null;
    if (updates.blood_group !== undefined) data.bloodGroup = updates.blood_group;
    if (updates.address !== undefined) data.address = updates.address;
    if (updates.photo_url !== undefined) data.photoUrl = updates.photo_url;

    return prisma.student.update({
      where: { id },
      data,
    });
  }

  /**
   * Update student enrollment status.
   */
  static async updateStatus(id: string, status: string) {
    return this.update(id, { status });
  }
}
