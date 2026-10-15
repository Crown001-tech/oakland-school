import { Request, Response } from 'express';
import { TimetableSolverService } from './timetable-solver.service.js';

export class TimetableController {
  private solverService = TimetableSolverService.getInstance();

  /**
   * POST /api/v1/timetable/solve
   * Trigger the CSP Solver algorithm
   */
  solveTimetable = async (req: Request, res: Response) => {
    try {
      const { academicYear, term, specs } = req.body;
      const result = await this.solverService.solveTimetable({
        academicYear,
        term,
        specs,
      });

      res.status(200).json({
        success: true,
        message: `CSP Solver completed in ${result.executionTimeMs}ms with ${result.hardConflictsCount} hard conflicts.`,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/timetable/master
   * Get active published master timetable
   */
  getMasterTimetable = async (_req: Request, res: Response) => {
    try {
      const data = await this.solverService.getMasterTimetable();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/timetable/publish
   * Publish a solved version
   */
  publishVersion = async (req: Request, res: Response) => {
    try {
      const { versionId } = req.body;
      if (!versionId) {
        return res.status(400).json({ success: false, message: 'versionId is required.' });
      }

      const published = await this.solverService.publishVersion(versionId, (req as any).user?.fullName || 'Principal');
      res.status(200).json({
        success: true,
        message: 'Master timetable version published and synced school-wide.',
        data: published,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/timetable/versions
   */
  getVersions = async (_req: Request, res: Response) => {
    try {
      const versions = await this.solverService.getVersions();
      res.status(200).json({
        success: true,
        data: versions,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/timetable/constraints
   */
  getConstraints = async (_req: Request, res: Response) => {
    try {
      const constraints = await this.solverService.getConstraints();
      res.status(200).json({
        success: true,
        data: constraints,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
