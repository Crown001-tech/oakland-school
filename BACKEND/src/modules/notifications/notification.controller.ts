import { Request, Response } from 'express';
import { ResponseUtil } from '../../common/utils/response.util.js';
import { eventBus, AppEvents } from '../../common/events/index.js';
import { auditService } from '../../common/services/audit.service.js';

export class NotificationController {
  /**
   * Publishes any institutional domain event into the asynchronous EventBus.
   * Enables event-driven decoupled operations across frontend and backend.
   */
  static async publishEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventName, payload } = req.body;

      if (!eventName || !Object.values(AppEvents).includes(eventName as AppEvents)) {
        ResponseUtil.badRequest(
          res,
          `Invalid or missing eventName. Valid events: ${Object.values(AppEvents).join(', ')}`
        );
        return;
      }

      if (!payload || typeof payload !== 'object') {
        ResponseUtil.badRequest(res, 'A valid payload object is required.');
        return;
      }

      const eventId = eventBus.publish(
        eventName as AppEvents,
        payload,
        { source: 'NotificationController.publishEvent' }
      );

      ResponseUtil.success(
        res,
        {
          eventId,
          eventName,
          status: 'queued',
          dispatchedAt: new Date().toISOString(),
        },
        `Event "${eventName}" published successfully to asynchronous pipeline`
      );
    } catch (err: any) {
      ResponseUtil.serverError(res, 'Failed to publish domain event', err);
    }
  }

  /**
   * Returns real-time health metrics of the Event-Driven Architecture pipeline.
   */
  static async getEventStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = eventBus.getStats();
      const recentLogs = eventBus.getRecentLogs(20);

      ResponseUtil.success(
        res,
        {
          architecture: 'Event-Driven Pub/Sub (Asynchronous)',
          stats,
          recentEvents: recentLogs,
        },
        'Event bus telemetry retrieved'
      );
    } catch (err: any) {
      ResponseUtil.serverError(res, 'Failed to retrieve event telemetry', err);
    }
  }

  /**
   * Returns persistent database-backed audit logs for institutional compliance.
   */
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const schoolId = req.query.schoolId as string | undefined;

      const logs = await auditService.getRecentLogs(limit, schoolId);

      ResponseUtil.success(
        res,
        {
          total: logs.length,
          logs,
        },
        'Persistent institutional audit logs retrieved'
      );
    } catch (err: any) {
      ResponseUtil.serverError(res, 'Failed to retrieve persistent audit logs', err);
    }
  }

  /**
   * Retries a specific failed event from the queue.
   */
  static async retryEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const success = eventBus.retryEvent(eventId);

      if (!success) {
        ResponseUtil.notFound(res, `Event with ID "${eventId}" not found in recent logs`);
        return;
      }

      ResponseUtil.success(res, { eventId, status: 'requeued' }, `Event ${eventId} queued for retry`);
    } catch (err: any) {
      ResponseUtil.serverError(res, 'Failed to retry event', err);
    }
  }

  /**
   * Test email endpoint now operates as an asynchronous domain event publisher!
   */
  static async sendTestEmail(req: Request, res: Response): Promise<void> {
    try {
      const { to, type = 'absent', studentName = 'Chinedu Okafor', studentClass = 'JSS 2' } = req.body;

      if (!to) {
        ResponseUtil.badRequest(res, 'Destination email (to) is required');
        return;
      }

      let eventName: AppEvents;
      let payload: any;

      if (type === 'report-card') {
        eventName = AppEvents.REPORT_CARD_PUBLISHED;
        payload = {
          studentId: 'std-test',
          studentName,
          studentClass,
          term: 'First Term',
          academicYear: '2026/2027',
          parentEmail: to,
          parentName: 'Guardian',
          position: null,
          percentage: null,
        };
      } else if (type === 'absent') {
        eventName = AppEvents.STUDENT_ABSENT_MARKED;
        payload = {
          studentId: 'std-test',
          studentName,
          studentClass,
          date: new Date().toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          parentEmail: to,
          parentName: 'Guardian',
        };
      } else {
        eventName = AppEvents.STAFF_APPOINTED;
        payload = {
          to,
          fullName: 'Mr Seyi Bankole',
          role: 'admin',
          employeeId: 'OAK-ADM-001',
          temporaryPassword: 'Oakland@2026',
        };
      }

      const eventId = eventBus.publish(eventName, payload, { source: 'NotificationController.sendTestEmail' });

      ResponseUtil.success(
        res,
        {
          eventId,
          eventName,
          recipient: to,
          status: 'queued_for_background_delivery',
        },
        `Test ${type} email domain event dispatched to asynchronous pipeline (Event ID: ${eventId.slice(0, 8)})`
      );
    } catch (err: any) {
      ResponseUtil.serverError(res, 'Test email dispatch failed', err);
    }
  }
}
