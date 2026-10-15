import { Response } from 'express';
import { ScoresModel } from './scores.model.js';
import { ScoresView } from './scores.view.js';
import { ResponseUtil } from '../../common/utils/response.util.js';
import { AuthenticatedRequest } from '../../common/middleware/auth.middleware.js';

export class ScoresController {
  static async getAssessments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const schoolId = req.user?.school_id;
      const { termId, classId } = req.query;

      const assessments = await ScoresModel.getAssessments(schoolId, termId as string, classId as string);
      ResponseUtil.success(res, assessments, 'Assessments retrieved successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to fetch assessments', err);
    }
  }

  static async getScoresByAssessment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { assessmentId } = req.params;
      const scores = await ScoresModel.getScoresByAssessment(assessmentId);
      const formatted = ScoresView.formatScoreSheet(scores);
      ResponseUtil.success(res, formatted, 'Scores retrieved successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to fetch scores', err);
    }
  }

  static async recordScores(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { scores } = req.body;
      if (!scores || !Array.isArray(scores)) {
        ResponseUtil.error(res, 'Scores array is required', 400);
        return;
      }

      const gradedBy = req.user?.id || 'system';
      const records = scores.map((s) => ({
        ...s,
        graded_by: gradedBy,
      }));

      const saved = await ScoresModel.recordScores(records);
      ResponseUtil.success(res, saved, 'Scores recorded successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to save scores', err);
    }
  }

  static async getReportCard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const { termId } = req.query;

      if (!termId) {
        ResponseUtil.error(res, 'termId is required', 400);
        return;
      }

      const report = await ScoresModel.getStudentReport(studentId, termId as string);
      ResponseUtil.success(res, report, 'Report card retrieved');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to retrieve report card', err);
    }
  }
}
