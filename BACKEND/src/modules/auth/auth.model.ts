import { prisma } from '../../config/prisma.js';
import { UserRole } from '@prisma/client';

export class AuthModel {
  /**
   * Find a user by their email address.
   */
  static async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: {
        email: {
          equals: email.trim().toLowerCase(),
          mode: 'insensitive',
        },
      },
      include: {
        staffProfile: true,
        school: true,
      },
    });
  }

  /**
   * Create a new user account with hashed password.
   */
  static async createUser(data: {
    email: string;
    passwordHash: string;
    role?: UserRole;
    schoolId?: string;
  }) {
    return prisma.user.create({
      data: {
        email: data.email.trim().toLowerCase(),
        passwordHash: data.passwordHash,
        role: data.role || UserRole.teacher,
        schoolId: data.schoolId || null,
      },
      include: {
        staffProfile: true,
        school: true,
      },
    });
  }

  /**
   * Fetch user's staff profile and active school membership.
   */
  static async getUserProfile(userId: string) {
    const [staff, membership] = await Promise.all([
      prisma.staffProfile.findFirst({
        where: { userId },
      }),
      prisma.schoolMembership.findFirst({
        where: { userId, isActive: true },
      }),
    ]);

    return {
      staff,
      membership,
    };
  }

  /**
   * Fetch school details by ID.
   */
  static async getSchoolDetails(schoolId: string) {
    return prisma.school.findUnique({
      where: { id: schoolId },
    });
  }
}
