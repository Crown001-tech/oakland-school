import { Response } from 'express';
import { AttendanceModel } from './attendance.model.js';
import { AttendanceView } from './attendance.view.js';
import { ResponseUtil } from '../../common/utils/response.util.js';
import { AuthenticatedRequest } from '../../common/middleware/auth.middleware.js';

export class AttendanceController {
  static async getClassAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { classId } = req.params;
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

      const records = await AttendanceModel.getByClassAndDate(classId, date);
      const formatted = AttendanceView.formatClassSheet(records);
      ResponseUtil.success(res, formatted, 'Attendance records fetched successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to fetch class attendance', err);
    }
  }

  static async markBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { records } = req.body;
      if (!records || !Array.isArray(records)) {
        ResponseUtil.error(res, 'Records array is required', 400);
        return;
      }

      const userId = req.user?.id || 'system';
      const preparedRecords = records.map((r) => ({
        ...r,
        marked_by: userId,
        school_id: req.user?.school_id || r.school_id,
      }));

      const saved = await AttendanceModel.markBatch(preparedRecords);
      ResponseUtil.success(res, saved, 'Attendance marked successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to record attendance', err);
    }
  }

  static async getStudentSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const { termId } = req.query;

      const records = await AttendanceModel.getStudentSummary(studentId, termId as string | undefined);
      ResponseUtil.success(res, records, 'Student attendance summary retrieved');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to fetch student attendance', err);
    }
  }
}
