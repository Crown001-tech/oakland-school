import { Request, Response } from 'express';
import { AdmissionsModel } from './admissions.model.js';
import { AdmissionsView } from './admissions.view.js';
import { ResponseUtil } from '../../common/utils/response.util.js';
import { AuthenticatedRequest } from '../../common/middleware/auth.middleware.js';

export class AdmissionsController {
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const schoolId = req.user?.school_id;
      const { status } = req.query;

      const raw = await AdmissionsModel.list({ schoolId, status: status as string });
      const formatted = AdmissionsView.formatList(raw);
      ResponseUtil.success(res, formatted, 'Admissions list retrieved');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to fetch admissions applications', err);
    }
  }

  static async submitPublic(req: Request, res: Response): Promise<void> {
    try {
      const app = await AdmissionsModel.create(req.body);
      ResponseUtil.created(res, app, 'Application submitted successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to submit application', err);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        ResponseUtil.error(res, 'Status is required', 400);
        return;
      }

      const updated = await AdmissionsModel.updateStatus(id, status);
      ResponseUtil.success(res, updated, `Application status updated to ${status}`);
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to update application status', err);
    }
  }
}
