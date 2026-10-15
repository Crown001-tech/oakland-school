import { Response } from 'express';
import { StaffModel } from './staff.model.js';
import { StaffView } from './staff.view.js';
import { ResponseUtil } from '../../common/utils/response.util.js';
import { AuthenticatedRequest } from '../../common/middleware/auth.middleware.js';

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pwd = 'Oak-';
  for (let i = 0; i < 7; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export class StaffController {
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const schoolId = req.user?.school_id;
      const rawStaff = await StaffModel.list(schoolId);
      const formatted = StaffView.formatList(rawStaff);
      ResponseUtil.success(res, formatted, 'Staff directory retrieved');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to fetch staff members', err);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const staff = await StaffModel.findById(id);
      if (!staff) {
        ResponseUtil.notFound(res, 'Staff member not found');
        return;
      }
      ResponseUtil.success(res, staff, 'Staff profile fetched');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to fetch staff profile', err);
    }
  }

  static async onboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        fullName,
        firstName: reqFirst,
        lastName: reqLast,
        email,
        phone,
        role,
        isClassTeacher,
        assignedClass,
        subjects,
        qualification,
        department,
        password: reqPassword,
      } = req.body;

      if (!email) {
        ResponseUtil.badRequest(res, 'Staff email address is required');
        return;
      }

      let firstName = reqFirst || '';
      let lastName = reqLast || '';
      if (fullName && (!firstName || !lastName)) {
        const parts = fullName.trim().split(' ');
        firstName = parts[0] || 'Staff';
        lastName = parts.slice(1).join(' ') || '';
      }

      const generatedPassword = reqPassword && reqPassword.trim().length > 0 ? reqPassword.trim() : generateRandomPassword();

      const result = await StaffModel.onboardStaff({
        schoolId: req.user?.school_id,
        firstName,
        lastName,
        email,
        phone,
        role: role || 'teacher',
        isClassTeacher: Boolean(isClassTeacher),
        assignedClass,
        subjects: Array.isArray(subjects) ? subjects : subjects ? [subjects] : [],
        qualification,
        department,
        password: generatedPassword,
      });

      ResponseUtil.created(res, result, `Staff member ${firstName} ${lastName} onboarded successfully`);
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to onboard staff member', err);
    }
  }

  static async appointPrincipal(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { fullName, email, phone, password: reqPassword } = req.body;

      if (!email || !fullName) {
        ResponseUtil.badRequest(res, 'Principal full name and official email are required');
        return;
      }

      const generatedPassword = reqPassword && reqPassword.trim().length > 0
        ? reqPassword.trim()
        : generateRandomPassword();

      const result = await StaffModel.appointPrincipal({
        schoolId: req.user?.school_id,
        fullName,
        email,
        phone,
        password: generatedPassword,
      });

      ResponseUtil.created(res, result, `Principal appointment initialized for ${email}`);
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to appoint school principal', err);
    }
  }

  static async appointBursar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { fullName, email, phone, password: reqPassword } = req.body;

      if (!email || !fullName) {
        ResponseUtil.badRequest(res, 'Bursar full name and official email are required');
        return;
      }

      const generatedPassword = reqPassword && reqPassword.trim().length > 0
        ? reqPassword.trim()
        : generateRandomPassword();

      const result = await StaffModel.appointBursar({
        schoolId: req.user?.school_id,
        fullName,
        email,
        phone,
        password: generatedPassword,
      });

      ResponseUtil.created(res, result, `Bursar appointment initialized for ${email}`);
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to appoint school bursar', err);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await StaffModel.deleteStaff(id);
      ResponseUtil.success(res, deleted, 'Staff member record removed');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to remove staff member', err);
    }
  }

  static async submitLeave(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { leaveType, startDate, endDate, reason } = req.body;
      const staffId = req.user?.id || 'staff-current';

      const leave = await StaffModel.submitLeave({
        staff_id: staffId,
        leave_type: leaveType || 'Casual',
        start_date: startDate,
        end_date: endDate,
        reason: reason || '',
      });

      ResponseUtil.created(res, leave, 'Leave request submitted successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to submit leave request', err);
    }
  }
}

