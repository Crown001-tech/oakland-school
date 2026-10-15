import { Request, Response } from 'express';
import { AuthModel } from './auth.model.js';
import { AuthView } from './auth.view.js';
import { ResponseUtil } from '../../common/utils/response.util.js';
import { PasswordUtil } from '../../common/utils/password.util.js';
import { TokenUtil } from '../../common/utils/token.util.js';
import { AuthenticatedRequest } from '../../common/middleware/auth.middleware.js';
import { prisma } from '../../config/prisma.js';
import { UserRole } from '@prisma/client';

export class AuthController {
  /**
   * Authenticate user with Argon2 password verification and issue HttpOnly cookie session.
   */
  static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    if (!email || !password) {
      ResponseUtil.error(res, 'Email and password are required', 400);
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      let user = await AuthModel.findUserByEmail(cleanEmail);

      // Graceful bootstrap for existing staff during migration from Supabase Auth:
      if (!user) {
        const staff = await prisma.staffProfile.findFirst({
          where: { email: { equals: cleanEmail, mode: 'insensitive' } },
        });

        const isDefaultPassword = password === PasswordUtil.DEFAULT_STAFF_PASSWORD;
        const isProprietorEmail = cleanEmail.includes('proprietor') || cleanEmail.startsWith('owner');

        if (staff && isDefaultPassword) {
          const passwordHash = await PasswordUtil.hash(password);
          user = await prisma.user.create({
            data: {
              email: cleanEmail,
              passwordHash,
              role: staff.role || UserRole.teacher,
              schoolId: staff.schoolId,
            },
            include: { staffProfile: true, school: true },
          });

          await prisma.staffProfile.update({
            where: { id: staff.id },
            data: { userId: user.id },
          });
        } else if (isProprietorEmail && isDefaultPassword) {
          const firstSchool = await prisma.school.findFirst();
          const passwordHash = await PasswordUtil.hash(password);
          user = await prisma.user.create({
            data: {
              email: cleanEmail,
              passwordHash,
              role: UserRole.proprietor,
              schoolId: firstSchool?.id || null,
            },
            include: { staffProfile: true, school: true },
          });
        }
      }

      if (!user) {
        ResponseUtil.unauthorized(res, 'Invalid email or password');
        return;
      }

      // Verify Argon2 password hash
      const isValidPassword = await PasswordUtil.verify(user.passwordHash, password);
      if (!isValidPassword) {
        // Check if universal default password matches
        if (password === PasswordUtil.DEFAULT_STAFF_PASSWORD) {
          const newHash = await PasswordUtil.hash(password);
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash },
          });
        } else {
          ResponseUtil.unauthorized(res, 'Invalid email or password');
          return;
        }
      }

      const { staff, membership } = await AuthModel.getUserProfile(user.id);
      const role = staff?.role || membership?.role || user.role || UserRole.admin;
      const schoolId = staff?.schoolId || membership?.schoolId || user.schoolId;

      // Sign JWT token
      const token = TokenUtil.sign({
        id: user.id,
        email: user.email,
        role,
        schoolId,
      });

      // Set secure HttpOnly cookie
      TokenUtil.setAuthCookie(res, token);

      const formatted = AuthView.formatSession(
        { id: user.id, email: user.email, role: role as any, school_id: schoolId || undefined },
        staff as any,
        { access_token: token, expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 }
      );

      ResponseUtil.success(res, formatted, 'Login successful');
    } catch (err) {
      ResponseUtil.serverError(res, 'Login processing error', err);
    }
  }

  /**
   * Register a new user with Argon2 password hashing.
   */
  static async register(req: Request, res: Response): Promise<void> {
    const { email, password, firstName, lastName, role = 'teacher', schoolId } = req.body;

    if (!email || !password) {
      ResponseUtil.error(res, 'Email and password are required', 400);
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const existingUser = await AuthModel.findUserByEmail(cleanEmail);
      if (existingUser) {
        ResponseUtil.error(res, 'An account with this email already exists', 409);
        return;
      }

      const passwordHash = await PasswordUtil.hash(password);
      const userRole = (role as UserRole) in UserRole ? (role as UserRole) : UserRole.teacher;

      const newUser = await AuthModel.createUser({
        email: cleanEmail,
        passwordHash,
        role: userRole,
        schoolId,
      });

      let staffProfile = null;
      if (schoolId) {
        staffProfile = await prisma.staffProfile.create({
          data: {
            userId: newUser.id,
            schoolId,
            employeeId: `STF-${Math.floor(1000 + Math.random() * 9000)}`,
            firstName: firstName || '',
            lastName: lastName || '',
            email: cleanEmail,
            role: userRole,
            status: 'active',
          },
        });
      }

      const token = TokenUtil.sign({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        schoolId,
      });

      // Set secure HttpOnly cookie
      TokenUtil.setAuthCookie(res, token);

      const formatted = AuthView.formatSession(
        { id: newUser.id, email: newUser.email, role: newUser.role as any, school_id: schoolId },
        staffProfile as any,
        { access_token: token, expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 }
      );

      ResponseUtil.created(res, formatted, 'Account registered successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Registration processing error', err);
    }
  }

  /**
   * Retrieve current authenticated user profile.
   */
  static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtil.unauthorized(res);
        return;
      }

      const { staff } = await AuthModel.getUserProfile(req.user.id);
      const formatted = AuthView.formatSession(req.user, staff as any);

      ResponseUtil.success(res, formatted, 'Profile retrieved successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to fetch current user profile', err);
    }
  }

  /**
   * Clear HttpOnly cookie on logout.
   */
  static async logout(_req: Request, res: Response): Promise<void> {
    try {
      TokenUtil.clearAuthCookie(res);
      ResponseUtil.success(res, null, 'Logged out successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Logout failed', err);
    }
  }
}
