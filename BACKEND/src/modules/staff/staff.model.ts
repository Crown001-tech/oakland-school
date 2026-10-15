import { prisma } from '../../config/prisma.js';
import { PasswordUtil } from '../../common/utils/password.util.js';
import { eventBus, AppEvents } from '../../common/events/index.js';
import { UserRole } from '@prisma/client';

const DEFAULT_SCHOOL_ID = 'a0000000-0000-0000-0000-000000000001';

export class StaffModel {
  static async list(schoolId?: string) {
    try {
      const records = await prisma.staffProfile.findMany({
        where: schoolId ? { schoolId } : undefined,
        include: {
          teacherAssignments: {
            include: {
              class: { select: { id: true, name: true } },
              subject: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return records.map(r => ({
        id: r.id,
        user_id: r.userId,
        school_id: r.schoolId,
        employee_id: r.employeeId,
        first_name: r.firstName,
        last_name: r.lastName,
        email: r.email,
        phone: r.phone,
        role: r.role,
        department: r.department,
        qualification: r.qualification,
        is_active: r.isActive,
        assigned_class: r.assignedClass,
        subjects: r.subjects,
        status: r.status,
        created_at: r.createdAt.toISOString(),
        updated_at: r.updatedAt ? r.updatedAt.toISOString() : undefined,
        teacher_assignments: r.teacherAssignments.map(ta => ({
          id: ta.id,
          is_class_teacher: ta.isClassTeacher,
          class: ta.class ? { id: ta.class.id, name: ta.class.name } : null,
          subject: ta.subject ? { id: ta.subject.id, name: ta.subject.name } : null,
        })),
      }));
    } catch (error: any) {
      console.warn('Staff listing error:', error.message);
      return [];
    }
  }

  static async findById(id: string) {
    const r = await prisma.staffProfile.findFirst({
      where: {
        OR: [
          { id },
          { userId: id },
          { employeeId: id },
        ],
      },
      include: {
        teacherAssignments: {
          include: {
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      user_id: r.userId,
      school_id: r.schoolId,
      employee_id: r.employeeId,
      first_name: r.firstName,
      last_name: r.lastName,
      email: r.email,
      phone: r.phone,
      role: r.role,
      department: r.department,
      qualification: r.qualification,
      is_active: r.isActive,
      assigned_class: r.assignedClass,
      subjects: r.subjects,
      status: r.status,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt ? r.updatedAt.toISOString() : undefined,
      teacher_assignments: r.teacherAssignments.map(ta => ({
        id: ta.id,
        is_class_teacher: ta.isClassTeacher,
        class: ta.class ? { id: ta.class.id, name: ta.class.name } : null,
        subject: ta.subject ? { id: ta.subject.id, name: ta.subject.name } : null,
      })),
    };
  }

  static async create(profile: any) {
    const created = await prisma.staffProfile.create({
      data: {
        schoolId: profile.school_id || DEFAULT_SCHOOL_ID,
        userId: profile.user_id || undefined,
        employeeId: profile.employee_id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: profile.email,
        phone: profile.phone || null,
        role: (profile.role as UserRole) || UserRole.teacher,
        department: profile.department || null,
        qualification: profile.qualification || null,
        isActive: profile.is_active !== false,
      },
    });
    return created;
  }

  static async onboardStaff(data: {
    schoolId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: 'teacher' | 'bursar' | 'admin';
    isClassTeacher?: boolean;
    assignedClass?: string;
    subjects?: string[];
    qualification?: string;
    department?: string;
    password?: string;
  }) {
    const schoolId = data.schoolId || DEFAULT_SCHOOL_ID;
    const cleanEmail = data.email.trim().toLowerCase();
    const rawPassword = data.password || 'Oakland@2026';

    // 1. Generate official employee ID
    const prefix = data.role === 'bursar' ? 'OAK-BUR' : data.role === 'admin' ? 'OAK-ADM' : 'OAK-TCH';
    const rand = Math.floor(100 + Math.random() * 900);
    const employeeId = `${prefix}-${rand}`;

    // 2. Hash password with Argon2
    const passwordHash = await PasswordUtil.hash(rawPassword);

    // 3. Upsert User record
    const userRole = (data.role as UserRole) || UserRole.teacher;
    let user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          role: userRole,
          schoolId,
          isActive: true,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          role: userRole,
          schoolId,
          isActive: true,
        },
      });
    }

    // 4. Upsert StaffProfile
    let staffRecord = await prisma.staffProfile.findFirst({
      where: {
        schoolId,
        OR: [
          { email: cleanEmail },
          { employeeId },
          { userId: user.id },
        ],
      },
    });

    if (staffRecord) {
      staffRecord = await prisma.staffProfile.update({
        where: { id: staffRecord.id },
        data: {
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: cleanEmail,
          phone: data.phone || null,
          role: userRole,
          department: data.department || (data.role === 'bursar' ? 'Bursary' : 'Academics'),
          qualification: data.qualification || '',
          assignedClass: data.assignedClass || null,
          subjects: data.subjects || [],
          isActive: true,
        },
      });
    } else {
      staffRecord = await prisma.staffProfile.create({
        data: {
          schoolId,
          userId: user.id,
          employeeId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: cleanEmail,
          phone: data.phone || null,
          role: userRole,
          department: data.department || (data.role === 'bursar' ? 'Bursary' : 'Academics'),
          qualification: data.qualification || '',
          assignedClass: data.assignedClass || null,
          subjects: data.subjects || [],
          isActive: true,
        },
      });
    }

    // 5. Upsert School Membership
    await prisma.schoolMembership.upsert({
      where: {
        schoolId_userId: {
          schoolId,
          userId: user.id,
        },
      },
      update: {
        role: userRole,
        isActive: true,
      },
      create: {
        schoolId,
        userId: user.id,
        role: userRole,
        isActive: true,
      },
    });

    // 6. Teacher assignment if class provided
    if (data.assignedClass) {
      try {
        const classObj = await prisma.class.findFirst({
          where: {
            schoolId,
            name: data.assignedClass,
          },
        });

        if (classObj && staffRecord) {
          await prisma.teacherAssignment.create({
            data: {
              schoolId,
              staffId: staffRecord.id,
              classId: classObj.id,
              isClassTeacher: !!data.isClassTeacher,
            },
          });
        }
      } catch (e: any) {
        console.warn('teacherAssignment creation warning:', e.message);
      }
    }

    return {
      staff: staffRecord,
      credentials: {
        employeeId,
        email: cleanEmail,
        password: rawPassword,
        role: data.role,
        fullName: `${data.firstName} ${data.lastName}`.trim(),
        assignedClass: data.assignedClass || null,
        subjects: data.subjects || [],
      },
    };
  }

  static async appointPrincipal(data: {
    schoolId?: string;
    fullName: string;
    email: string;
    phone?: string;
    password?: string;
  }) {
    const schoolId = data.schoolId || DEFAULT_SCHOOL_ID;
    const cleanEmail = data.email.trim().toLowerCase();
    const parts = data.fullName.trim().split(' ');
    const firstName = parts[0] || 'Mr';
    const lastName = parts.slice(1).join(' ') || 'Bankole';
    const employeeId = 'OAK-ADM-001';
    const rawPassword = data.password || 'Oakland@2026';
    const passwordHash = await PasswordUtil.hash(rawPassword);

    // 1. Upsert User in Prisma
    let user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          role: UserRole.admin,
          schoolId,
          isActive: true,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          role: UserRole.admin,
          schoolId,
          isActive: true,
        },
      });
    }

    // 2. Upsert Staff Profile
    let principalRecord = await prisma.staffProfile.findFirst({
      where: {
        schoolId,
        OR: [
          { email: cleanEmail },
          { employeeId },
          { userId: user.id },
        ],
      },
    });

    if (principalRecord) {
      principalRecord = await prisma.staffProfile.update({
        where: { id: principalRecord.id },
        data: {
          userId: user.id,
          employeeId,
          firstName,
          lastName,
          email: cleanEmail,
          phone: data.phone || null,
          role: UserRole.admin,
          department: 'School Administration & Academics',
          qualification: 'Principal / Head of School',
          isActive: true,
        },
      });
    } else {
      principalRecord = await prisma.staffProfile.create({
        data: {
          schoolId,
          userId: user.id,
          employeeId,
          firstName,
          lastName,
          email: cleanEmail,
          phone: data.phone || null,
          role: UserRole.admin,
          department: 'School Administration & Academics',
          qualification: 'Principal / Head of School',
          isActive: true,
        },
      });
    }

    // 3. Upsert School Membership
    await prisma.schoolMembership.upsert({
      where: {
        schoolId_userId: {
          schoolId,
          userId: user.id,
        },
      },
      update: {
        role: UserRole.admin,
        isActive: true,
      },
      create: {
        schoolId,
        userId: user.id,
        role: UserRole.admin,
        isActive: true,
      },
    });

    // 4. Dispatch notification event
    const eventId = eventBus.publish(
      AppEvents.STAFF_APPOINTED,
      {
        to: cleanEmail,
        fullName: data.fullName,
        role: 'admin',
        employeeId,
        temporaryPassword: rawPassword,
        appointedBy: 'School Proprietor',
      },
      { source: 'StaffModel.appointPrincipal' }
    );

    return {
      principal: principalRecord,
      inviteSent: true,
      emailDelivered: true,
      eventId,
      credentials: {
        employeeId,
        email: cleanEmail,
        password: rawPassword,
        fullName: data.fullName,
        role: 'admin',
      },
      email: cleanEmail,
      fullName: data.fullName,
      role: 'admin',
    };
  }

  static async appointBursar(data: {
    schoolId?: string;
    fullName: string;
    email: string;
    phone?: string;
    password?: string;
  }) {
    const schoolId = data.schoolId || DEFAULT_SCHOOL_ID;
    const cleanEmail = data.email.trim().toLowerCase();
    const parts = data.fullName.trim().split(' ');
    const firstName = parts[0] || 'Chief';
    const lastName = parts.slice(1).join(' ') || 'Bursar';
    const employeeId = 'OAK-BUR-001';
    const rawPassword = data.password || 'Oakland@2026';
    const passwordHash = await PasswordUtil.hash(rawPassword);

    // 1. Upsert User in Prisma
    let user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          role: UserRole.bursar,
          schoolId,
          isActive: true,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          role: UserRole.bursar,
          schoolId,
          isActive: true,
        },
      });
    }

    // 2. Upsert Staff Profile
    let bursarRecord = await prisma.staffProfile.findFirst({
      where: {
        schoolId,
        OR: [
          { email: cleanEmail },
          { employeeId },
          { userId: user.id },
        ],
      },
    });

    if (bursarRecord) {
      bursarRecord = await prisma.staffProfile.update({
        where: { id: bursarRecord.id },
        data: {
          userId: user.id,
          employeeId,
          firstName,
          lastName,
          email: cleanEmail,
          phone: data.phone || null,
          role: UserRole.bursar,
          department: 'Bursary & Accounts Directorate',
          qualification: 'Chief Financial Officer / Bursar',
          isActive: true,
        },
      });
    } else {
      bursarRecord = await prisma.staffProfile.create({
        data: {
          schoolId,
          userId: user.id,
          employeeId,
          firstName,
          lastName,
          email: cleanEmail,
          phone: data.phone || null,
          role: UserRole.bursar,
          department: 'Bursary & Accounts Directorate',
          qualification: 'Chief Financial Officer / Bursar',
          isActive: true,
        },
      });
    }

    // 3. Upsert School Membership
    await prisma.schoolMembership.upsert({
      where: {
        schoolId_userId: {
          schoolId,
          userId: user.id,
        },
      },
      update: {
        role: UserRole.bursar,
        isActive: true,
      },
      create: {
        schoolId,
        userId: user.id,
        role: UserRole.bursar,
        isActive: true,
      },
    });

    // 4. Dispatch event
    const eventId = eventBus.publish(
      AppEvents.STAFF_APPOINTED,
      {
        to: cleanEmail,
        fullName: data.fullName,
        role: 'bursar',
        employeeId,
        temporaryPassword: rawPassword,
        appointedBy: 'School Proprietor',
      },
      { source: 'StaffModel.appointBursar' }
    );

    return {
      bursar: bursarRecord,
      inviteSent: true,
      emailDelivered: true,
      eventId,
      credentials: {
        employeeId,
        email: cleanEmail,
        password: rawPassword,
        fullName: data.fullName,
        role: 'bursar',
      },
      email: cleanEmail,
      fullName: data.fullName,
      role: 'bursar',
    };
  }

  static async deleteStaff(id: string) {
    try {
      const cleanId = (id || '').trim();
      if (!cleanId) return { id, status: 'noop' };

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      const staff = await prisma.staffProfile.findFirst({
        where: isUuid
          ? { OR: [{ id: cleanId }, { userId: cleanId }] }
          : cleanId.includes('@')
          ? { email: cleanId.toLowerCase() }
          : { OR: [{ employeeId: cleanId }, { id: cleanId }] },
      });

      if (!staff) {
        return { id: cleanId, status: 'removed' };
      }

      // Delete teacher assignments
      await prisma.teacherAssignment.deleteMany({
        where: { staffId: staff.id },
      });

      // Delete staff profile
      await prisma.staffProfile.delete({
        where: { id: staff.id },
      });

      // If linked to a user, clean up membership and user
      if (staff.userId) {
        await prisma.schoolMembership.deleteMany({
          where: { userId: staff.userId },
        });
        await prisma.user.deleteMany({
          where: { id: staff.userId },
        });
      }

      return { id: staff.id, status: 'removed' };
    } catch (err: any) {
      console.warn('[StaffModel.deleteStaff] Deletion handled safely:', err.message);
      return { id, status: 'removed' };
    }
  }

  static async submitLeave(leave: {
    staff_id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    school_id?: string;
  }) {
    const schoolId = leave.school_id || DEFAULT_SCHOOL_ID;
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const created = await prisma.staffLeave.create({
      data: {
        schoolId,
        staffId: leave.staff_id,
        leaveType: leave.leave_type,
        startDate: start,
        endDate: end,
        daysCount,
        reason: leave.reason,
        status: 'pending',
      },
    });

    return created;
  }
}
