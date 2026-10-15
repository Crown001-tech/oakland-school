/**
 * Oakland International School - Communication Centre Controller
 * 
 * Provides HTTP endpoints for:
 * - Omnichannel Broadcast Execution (Email, SMS, WhatsApp)
 * - Dynamic Audience Calculation & Segmentation
 * - Notification Templates & Channel Gateway Administration
 * - Delivery Audit Telemetry & Statistics
 */

import { Request, Response } from 'express';
import { ResponseUtil } from '../../common/utils/response.util.js';
import {
  notificationEngine,
  DispatchRecipient,
  ChannelType,
} from '../../common/services/notification/notification-engine.service.js';
import { prisma } from '../../config/prisma.js';

export class CommunicationController {
  /**
   * Helper: Resolves recipients based on selected audience criteria from real database records.
   */
  private static async resolveAudienceRecipients(
    audience: string,
    classId?: string
  ): Promise<DispatchRecipient[]> {
    try {
      if (audience === 'all_parents' || audience === 'class_parents' || audience === 'debtors') {
        const students = await prisma.student.findMany({
          where: {
            status: 'active',
            ...(audience === 'class_parents' && classId
              ? { enrollments: { some: { classId } } }
              : {}),
          },
          include: {
            studentGuardians: {
              include: { guardian: true },
            },
            enrollments: {
              include: { class: true },
            },
          },
        });

        const recipients: DispatchRecipient[] = [];
        for (const s of students) {
          const studentName = `${s.firstName} ${s.lastName}`.trim();
          const studentClass = s.enrollments?.[0]?.class?.name || 'Class';
          for (const sg of s.studentGuardians) {
            if (sg.guardian) {
              recipients.push({
                name: `${sg.guardian.firstName} ${sg.guardian.lastName}`.trim() || 'Guardian',
                email: sg.guardian.email || 'guardian@oaklandschools.edu.ng',
                phone: sg.guardian.phone || '',
                studentName,
                studentClass,
                type: 'parent',
              });
            }
          }
        }
        return recipients;
      } else if (audience === 'all_staff' || audience === 'teaching_staff') {
        const staffList = await prisma.staffProfile.findMany({
          where: {
            isActive: true,
            ...(audience === 'teaching_staff' ? { role: 'teacher' } : {}),
          },
        });

        return staffList.map(st => ({
          name: `${st.firstName} ${st.lastName}`.trim(),
          email: st.email || '',
          phone: st.phone || '',
          type: 'staff',
        }));
      }
    } catch (e: any) {
      console.warn('resolveAudienceRecipients warning:', e.message);
    }

    return [];
  }

  /**
   * GET /api/v1/communications/stats
   * Returns aggregated telemetry and gateway health metrics.
   */
  static async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await notificationEngine.getStats();
      ResponseUtil.success(res, stats, 'Communication telemetry retrieved');
    } catch (err: any) {
      ResponseUtil.serverError(res, 'Failed to fetch communication stats', err);
    }
  }

  /**
   * GET /api/v1/communications/channels
   * Returns configured channels and status.
   */
  static async getChannels(_req: Request, res: Response): Promise<void> {
    try {
      const channels = await notificationEngine.getChannels();
      ResponseUtil.success(res, channels, 'Notification channels retrieved');
    } catch (err: any) {
      ResponseUtil.serverError(res, 'Failed to fetch notification channels', err);
    }
  }

  /**
   * PATCH /api/v1/communications/channels/:type
   * Updates channel gateway settings.
   */
  static async updateChannel(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const updates = req.body;

      if (!['email', 'sms', 'whatsapp'].includes(type)) {
        ResponseUtil.badRequest(res, 'Invalid channel type. Must be email, sms, or whatsapp.');
        return;
      }

      const updated = await notificationEngine.updateChannel(type as ChannelType, updates);
      ResponseUtil.success(res, updated, `Channel "${type}" updated successfully`);
    } catch (err: any) {
      ResponseUtil.serverError(res, 'Failed to update channel', err);
    }
  }

  /**
   * GET /api/v1/communications/templates
   * Lists reusable notification templates.
   */
  static async getTemplates(_req: Request, res: Response): Promise<void> {
    try {
      const templates = await notificationEngine.getTemplates();
      ResponseUtil.success(res, templates, 'Templates retrieved');
    } catch (err: any) {
      ResponseUtil.serverError(res, 'Failed to retrieve templates', err);
    }
  }

  /**
   * POST /api/v1/communications/templates
   * Creates or updates a notification template.
   */
  static async saveTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { code, name, category, channels, subject, body_email, body_sms, body_whatsapp, variables } = req.body;

      if (!code || !name || !category || !channels || !channels.length) {
        ResponseUtil.badRequest(res, 'code, name, category, and at least one channel are required.');
        return;
      }

      const template = await notificationEngine.saveTemplate({
        code,
        name,
        category,
        channels,
        subject: subject || name,
        body_email: body_email || '',
        body_sms: body_sms || '',
        body_whatsapp: body_whatsapp || '',
        variables: variables || [],
        is_system: false,
      });

      ResponseUtil.success(res, template, 'Notification template saved successfully');
    } catch (err: any) {
      ResponseUtil.serverError(res, 'Failed to save template', err);
    }
  }

  /**
   * POST /api/v1/communications/audience-count
   * Calculates audience size and sample recipients for preview.
   */
  static async getAudienceCount(req: Request, res: Response): Promise<void> {
    try {
      const { audience = 'all_parents', classId } = req.body;
      const recipients = await CommunicationController.resolveAudienceRecipients(audience, classId);

      ResponseUtil.success(
        res,
        {
          count: recipients.length,
          audience,
          classId: classId || null,
          sampleRecipients: recipients.slice(0, 5),
        },
        'Audience estimation calculated'
      );
    } catch (err: any) {
      ResponseUtil.serverError(res, 'Failed to calculate audience count', err);
    }
  }

  /**
   * POST /api/v1/communications/broadcast
   * Dispatches instant or scheduled broadcast communication.
   */
  static async broadcast(req: Request, res: Response): Promise<void> {
    try {
      const {
        audience = 'all_parents',
        classId,
        channels = ['email'],
        templateCode,
        subject,
        message,
        customRecipients,
      } = req.body;

      if (!channels || !Array.isArray(channels) || channels.length === 0) {
        ResponseUtil.badRequest(res, 'At least one delivery channel (email, sms, whatsapp) is required.');
        return;
      }

      // Resolve targets
      let recipients: DispatchRecipient[] = [];
      if (customRecipients && Array.isArray(customRecipients) && customRecipients.length > 0) {
        recipients = customRecipients;
      } else {
        recipients = await CommunicationController.resolveAudienceRecipients(audience, classId);
      }

      if (recipients.length === 0) {
        ResponseUtil.badRequest(res, 'No valid recipients resolved for the chosen audience.');
        return;
      }

      const summary = await notificationEngine.dispatch({
        recipients,
        channels: channels as ChannelType[],
        templateCode,
        subject,
        customBody: message,
        data: {
          school_name: 'Oakland International School',
          date: new Date().toLocaleDateString('en-GB'),
        },
        eventType: 'manual_broadcast',
      });

      ResponseUtil.success(
        res,
        {
          summary,
          broadcastId: `bc-${Date.now()}`,
          audience,
          dispatchedAt: new Date().toISOString(),
        },
        `Broadcast dispatched to ${recipients.length} recipients across ${channels.length} channel(s)`
      );
    } catch (err: any) {
      ResponseUtil.serverError(res, 'Failed to dispatch broadcast', err);
    }
  }

  /**
   * GET /api/v1/communications/logs
   * Retrieves notification delivery audit trail.
   */
  static async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const channel = req.query.channel as string | undefined;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const logs = await notificationEngine.getLogs({ channel, status, search, limit });

      ResponseUtil.success(
        res,
        {
          total: logs.length,
          logs,
        },
        'Delivery logs retrieved'
      );
    } catch (err: any) {
      ResponseUtil.serverError(res, 'Failed to retrieve delivery logs', err);
    }
  }

  /**
   * POST /api/v1/communications/test-channel
   * 1-Click Gateway Diagnostic Test Send
   */
  static async testChannel(req: Request, res: Response): Promise<void> {
    try {
      const { channel, destination = 'test@example.com' } = req.body;

      if (!['email', 'sms', 'whatsapp'].includes(channel)) {
        ResponseUtil.badRequest(res, 'channel must be email, sms, or whatsapp');
        return;
      }

      const isEmail = channel === 'email';
      const summary = await notificationEngine.dispatch({
        recipients: [
          {
            name: 'Oakland Administrator',
            email: isEmail ? destination : undefined,
            phone: !isEmail ? destination : undefined,
          },
        ],
        channels: [channel as ChannelType],
        subject: `Oakland Diagnostic Test [${channel.toUpperCase()}]`,
        customBody: `This is a verified gateway test dispatch from Oakland International School Notification Engine (${channel.toUpperCase()}). Time: ${new Date().toLocaleTimeString()}.`,
      });

      ResponseUtil.success(res, summary, `Test dispatch completed via ${channel}`);
    } catch (err: any) {
      ResponseUtil.serverError(res, 'Diagnostic test dispatch failed', err);
    }
  }
}
