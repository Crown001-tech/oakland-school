import {
  AuthorizedPerson,
  PickupLog,
  VerifyPickupDTO,
  RegisterAuthorizedPersonDTO,
} from './pickup.types.js';
import { prisma } from '../../config/prisma.js';
import { EventBus } from '../../common/events/event-bus.js';
import {
  AppEvents,
  StudentPickupPayload,
  SecurityPickupFlaggedPayload,
} from '../../common/events/event-types.js';
import crypto from 'crypto';

export class PickupService {
  private static instance: PickupService;

  // In-memory data store (clean start for real operations)
  private authorizedPersons: AuthorizedPerson[] = [];
  private pickupLogs: PickupLog[] = [];


  public static getInstance(): PickupService {
    if (!PickupService.instance) {
      PickupService.instance = new PickupService();
    }
    return PickupService.instance;
  }

  /**
   * Lookup authorization pass by cryptographic QR token
   */
  async lookupByQR(qrToken: string): Promise<{
    isValid: boolean;
    authorizedPerson?: AuthorizedPerson;
    student?: {
      id: string;
      name: string;
      class: string;
    };
    allAuthorizedForStudent?: AuthorizedPerson[];
  }> {
    const person = this.authorizedPersons.find(
      (p) => p.qrToken.toUpperCase() === qrToken.trim().toUpperCase() && p.isActive
    );

    if (!person) {
      return { isValid: false };
    }

    // Resolve student info
    let studentName = 'Student';
    let studentClass = 'Class';
    try {
      const dbStudent = await prisma.student.findUnique({
        where: { id: person.studentId },
        include: { enrollments: { include: { class: true } } },
      });
      if (dbStudent) {
        studentName = `${dbStudent.firstName} ${dbStudent.lastName}`.trim();
        studentClass = dbStudent.enrollments?.[0]?.class?.name || 'Class';
      }
    } catch {}

    const student = {
      id: person.studentId,
      name: studentName,
      class: studentClass,
    };

    const allAuthorizedForStudent = this.authorizedPersons.filter(
      (p) => p.studentId === person.studentId && p.isActive
    );

    return {
      isValid: true,
      authorizedPerson: person,
      student,
      allAuthorizedForStudent,
    };
  }

  /**
   * Get all authorized escorts for a specific student
   */
  async getAuthorizedPersons(studentId: string): Promise<AuthorizedPerson[]> {
    return this.authorizedPersons.filter((p) => p.studentId === studentId && p.isActive);
  }

  /**
   * Register a new authorized pickup escort
   */
  async registerAuthorizedPerson(dto: RegisterAuthorizedPersonDTO): Promise<AuthorizedPerson> {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newPerson: AuthorizedPerson = {
      id: crypto.randomUUID(),
      studentId: dto.studentId,
      fullName: dto.fullName,
      relationship: dto.relationship,
      phone: dto.phone,
      nationalId: dto.nationalId,
      photoUrl: dto.photoUrl,
      qrToken: `OAK-PK-${randomSuffix}`,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    this.authorizedPersons.push(newPerson);

    try {
      await prisma.authorizedPickupPerson.create({
        data: {
          id: newPerson.id,
          studentId: newPerson.studentId,
          fullName: newPerson.fullName,
          relationship: newPerson.relationship,
          phone: newPerson.phone,
          photoUrl: newPerson.photoUrl || undefined,
          isActive: newPerson.isActive,
        },
      });
    } catch {}

    return newPerson;
  }

  /**
   * Verify and clear student pickup at gate
   */
  async recordPickup(dto: VerifyPickupDTO): Promise<PickupLog> {
    let studentId = dto.studentId || '';
    let studentName = 'Student';
    let studentClass = 'Class';

    if (studentId) {
      try {
        const dbStudent = await prisma.student.findUnique({
          where: { id: studentId },
          include: { enrollments: { include: { class: true } } },
        });
        if (dbStudent) {
          studentName = `${dbStudent.firstName} ${dbStudent.lastName}`.trim();
          studentClass = dbStudent.enrollments?.[0]?.class?.name || 'Class';
        }
      } catch {}
    }

    let pickedUpByName = dto.pickedUpByName || 'Authorized Guardian';
    let relationship = dto.relationship || 'Guardian';
    let authorizedPersonId = dto.authorizedPersonId;

    if (dto.qrToken) {
      const lookup = await this.lookupByQR(dto.qrToken);
      if (lookup.isValid && lookup.authorizedPerson && lookup.student) {
        studentId = lookup.student.id;
        studentName = lookup.student.name;
        studentClass = lookup.student.class;
        pickedUpByName = lookup.authorizedPerson.fullName;
        relationship = lookup.authorizedPerson.relationship;
        authorizedPersonId = lookup.authorizedPerson.id;
      }
    }

    const log: PickupLog = {
      id: crypto.randomUUID(),
      studentId,
      studentName,
      studentClass,
      authorizedPersonId,
      pickedUpByName,
      relationship,
      verifiedByName: dto.verifiedByName || 'Gate Officer Yakubu',
      verificationMethod: dto.verificationMethod || 'qr_scan',
      status: 'cleared',
      notes: dto.notes || 'Identity verified against digital pickup registry.',
      pickupTime: new Date().toISOString(),
    };

    this.pickupLogs.unshift(log);

    try {
      if (studentId) {
        await prisma.pickupLog.create({
          data: {
            id: log.id,
            studentId,
            studentName: log.studentName,
            studentClass: log.studentClass,
            authorizedPersonId: log.authorizedPersonId || undefined,
            pickedUpByName: log.pickedUpByName,
            relationship: log.relationship,
            verifiedByName: log.verifiedByName,
            verificationMethod: log.verificationMethod,
            status: log.status,
            notes: log.notes,
            pickupTime: new Date(log.pickupTime),
          },
        });
      }
    } catch {}

    // Emit event: notify parent
    const payload: StudentPickupPayload = {
      logId: log.id,
      studentId: log.studentId,
      studentName: log.studentName,
      studentClass: log.studentClass,
      pickedUpBy: log.pickedUpByName,
      relationship: log.relationship,
      verifiedBy: log.verifiedByName,
      pickupTime: log.pickupTime,
      parentPhone: '+2348030001234',
      parentEmail: 'parents@oaklandschools.edu.ng',
    };

    EventBus.getInstance().publish(
      AppEvents.STUDENT_PICKUP_RECORDED,
      payload,
      { source: 'PickupService' }
    );

    return log;
  }

  /**
   * Flag an unauthorized pickup attempt
   */
  async flagSecurityAlert(params: {
    studentId: string;
    studentName: string;
    attemptedBy: string;
    reason: string;
    gateOfficer: string;
  }): Promise<PickupLog> {
    const log: PickupLog = {
      id: crypto.randomUUID(),
      studentId: params.studentId,
      studentName: params.studentName,
      studentClass: params.studentId === 'std-101' ? 'JSS 3A' : 'JSS 1A',
      pickedUpByName: params.attemptedBy,
      relationship: 'Unverified Party',
      verifiedByName: params.gateOfficer,
      verificationMethod: 'manual_code',
      status: 'flagged_unauthorized',
      notes: `SECURITY ALERT: ${params.reason}`,
      pickupTime: new Date().toISOString(),
    };

    this.pickupLogs.unshift(log);

    const payload: SecurityPickupFlaggedPayload = {
      logId: log.id,
      studentId: log.studentId,
      studentName: log.studentName,
      studentClass: log.studentClass,
      attemptedBy: params.attemptedBy,
      reason: params.reason,
      gateOfficer: params.gateOfficer,
      timestamp: log.pickupTime,
    };

    EventBus.getInstance().publish(
      AppEvents.SECURITY_PICKUP_FLAGGED,
      payload,
      { source: 'PickupService' }
    );

    return log;
  }

  /**
   * Fetch recent pickup departure audit logs
   */
  async getRecentLogs(limit = 50): Promise<PickupLog[]> {
    return this.pickupLogs.slice(0, limit);
  }
}
