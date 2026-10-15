import { Response } from 'express';
import { AcademicsModel } from './academics.model.js';
import { AcademicsView } from './academics.view.js';
import { ResponseUtil } from '../../common/utils/response.util.js';
import { AuthenticatedRequest } from '../../common/middleware/auth.middleware.js';

export class AcademicsController {
  static async getCalendar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const schoolId = req.user?.school_id;
      const [sessions, terms] = await Promise.all([
        AcademicsModel.getSessions(schoolId),
        AcademicsModel.getTerms(undefined, schoolId),
      ]);

      const formatted = AcademicsView.formatAcademicCalendar(sessions, terms);
      ResponseUtil.success(res, formatted, 'Academic calendar fetched successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to fetch academic calendar', err);
    }
  }

  static async getClasses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const schoolId = req.user?.school_id;
      const rawClasses = await AcademicsModel.getClasses(schoolId);
      const formatted = AcademicsView.formatClasses(rawClasses);
      ResponseUtil.success(res, formatted, 'Classes retrieved successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to fetch classes', err);
    }
  }

  static async createClass(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const schoolId = req.user?.school_id;
      const newClass = await AcademicsModel.createClass({
        ...req.body,
        school_id: schoolId || req.body.school_id,
      });
      ResponseUtil.created(res, newClass, 'Class created successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to create class', err);
    }
  }

  static async getSubjects(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const schoolId = req.user?.school_id;
      const subjects = await AcademicsModel.getSubjects(schoolId);
      ResponseUtil.success(res, subjects, 'Subjects retrieved successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to fetch subjects', err);
    }
  }

  static async syncSubjects(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const subjects = req.body?.subjects || req.body;
      const synced = await AcademicsModel.syncSubjects(subjects);
      ResponseUtil.success(res, synced, 'Official curriculum subjects synced successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to sync subjects', err);
    }
  }

  static async assignTeacher(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const schoolId = req.user?.school_id;
      const assignment = await AcademicsModel.assignTeacher({
        ...req.body,
        school_id: schoolId || req.body.school_id,
      });
      ResponseUtil.success(res, assignment, 'Teacher assigned successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to assign teacher', err);
    }
  }
}
