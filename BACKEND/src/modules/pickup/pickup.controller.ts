import { Request, Response } from 'express';
import { PickupService } from './pickup.service.js';

export class PickupController {
  private pickupService = PickupService.getInstance();

  /**
   * GET /api/v1/pickup/lookup?qr=OAK-PK-8812
   */
  lookupQR = async (req: Request, res: Response) => {
    try {
      const qr = req.query.qr as string;
      if (!qr) {
        return res.status(400).json({ success: false, message: 'QR token is required.' });
      }

      const result = await this.pickupService.lookupByQR(qr);
      if (!result.isValid) {
        return res.status(404).json({
          success: false,
          message: 'Invalid or expired pickup token. Please verify identity at the school security post.',
        });
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/pickup/student/:studentId
   */
  getAuthorizedPersons = async (req: Request, res: Response) => {
    try {
      const persons = await this.pickupService.getAuthorizedPersons(req.params.studentId);
      res.status(200).json({
        success: true,
        data: persons,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/pickup/register-authorized
   */
  registerAuthorized = async (req: Request, res: Response) => {
    try {
      const { studentId, fullName, relationship, phone } = req.body;
      if (!studentId || !fullName || !relationship || !phone) {
        return res.status(400).json({
          success: false,
          message: 'studentId, fullName, relationship, and phone are required.',
        });
      }

      const created = await this.pickupService.registerAuthorizedPerson(req.body);
      res.status(201).json({
        success: true,
        message: 'Authorized escort registered and QR pass issued.',
        data: created,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/pickup/verify-and-clear
   */
  recordPickup = async (req: Request, res: Response) => {
    try {
      const log = await this.pickupService.recordPickup({
        ...req.body,
        verifiedByName: (req as any).user?.fullName || req.body.verifiedByName || 'Gate Officer Yakubu',
      });

      res.status(200).json({
        success: true,
        message: 'Student departure cleared. Parent notification dispatched.',
        data: log,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/pickup/flag-alert
   */
  flagAlert = async (req: Request, res: Response) => {
    try {
      const { studentId, studentName, attemptedBy, reason } = req.body;
      const log = await this.pickupService.flagSecurityAlert({
        studentId: studentId || '',
        studentName: studentName || 'Student',
        attemptedBy: attemptedBy || 'Unverified Party',
        reason: reason || 'Individual not on authorized escort registry',
        gateOfficer: (req as any).user?.fullName || 'Gate Officer Yakubu',
      });

      res.status(200).json({
        success: true,
        message: 'Security alert triggered and escalated to administrative security.',
        data: log,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/pickup/logs
   */
  getRecentLogs = async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const logs = await this.pickupService.getRecentLogs(limit);
      res.status(200).json({
        success: true,
        data: logs,
        count: logs.length,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
