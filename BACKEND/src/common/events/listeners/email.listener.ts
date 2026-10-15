/**
 * Oakland International School - Email Event Listener (Consumer)
 * 
 * Asynchronously processes domain events emitted across the institution
 * and dispatches branded emails via SMTP / Resend without holding up
 * HTTP controller response cycles.
 */

import { eventBus } from '../event-bus.js';
import {
  AppEvents,
  AppEvent,
  StaffAppointedPayload,
  StudentAbsentPayload,
  ReportCardPublishedPayload,
  StaffBroadcastPayload,
} from '../event-types.js';
import { emailService } from '../../services/email.service.js';

export class EmailEventListener {
  private static isRegistered = false;

  /**
   * Registers all email consumers onto the Event Bus.
   */
  public static register(): void {
    if (this.isRegistered) return;
    this.isRegistered = true;

    console.log('[EmailEventListener] 📬 Registering email event consumers on EventBus...');

    // 1. Staff Appointments & Credentials
    eventBus.subscribe<StaffAppointedPayload>(
      AppEvents.STAFF_APPOINTED,
      async (event: AppEvent<StaffAppointedPayload>) => {
        await EmailEventListener.handleStaffAppointed(event.payload);
      }
    );

    // 2. Student Absentee Attendance Alerts
    eventBus.subscribe<StudentAbsentPayload>(
      AppEvents.STUDENT_ABSENT_MARKED,
      async (event: AppEvent<StudentAbsentPayload>) => {
        await EmailEventListener.handleStudentAbsent(event.payload);
      }
    );

    // 3. Report Card Approvals & Parent Dispatches
    eventBus.subscribe<ReportCardPublishedPayload>(
      AppEvents.REPORT_CARD_PUBLISHED,
      async (event: AppEvent<ReportCardPublishedPayload>) => {
        await EmailEventListener.handleReportCardPublished(event.payload);
      }
    );

    // 4. Proprietor Staff Broadcast
    eventBus.subscribe<StaffBroadcastPayload>(
      AppEvents.STAFF_BROADCAST_CREATED,
      async (event: AppEvent<StaffBroadcastPayload>) => {
        await EmailEventListener.handleStaffBroadcast(event.payload);
      }
    );

    console.log('[EmailEventListener] ✓ All email event consumers active and listening.');
  }

  /**
   * Consumer for Staff Appointments
   */
  private static async handleStaffAppointed(payload: StaffAppointedPayload): Promise<void> {
    const { to, fullName, role, employeeId, temporaryPassword, loginUrl } = payload;
    const password = temporaryPassword || 'Oak-Pass2026!';

    console.log(`[EmailEventListener] Processing staff appointment email for [${role}] ${to}`);

    if (role === 'admin') {
      await emailService.sendPrincipalAppointmentEmail({
        to,
        principalName: fullName,
        employeeId,
        password,
        loginUrl,
      });
    } else if (role === 'bursar') {
      await emailService.sendBursarAppointmentEmail({
        to,
        bursarName: fullName,
        employeeId,
        password,
        loginUrl,
      });
    } else {
      await emailService.sendStaffOnboardingEmail({
        to,
        staffName: fullName,
        role: `Faculty Instructor (${role})`,
        employeeId,
        password,
      });
    }
  }

  /**
   * Consumer for Absentee Alerts to Parents
   */
  private static async handleStudentAbsent(payload: StudentAbsentPayload): Promise<void> {
    const { parentEmail, studentName, studentClass, date, parentName } = payload;

    if (!parentEmail) {
      console.log(
        `[EmailEventListener] Skipping absentee email for ${studentName}: No parent email address on record.`
      );
      return;
    }

    console.log(`[EmailEventListener] Dispatching absentee alert to parent (${parentEmail}) for ${studentName}`);

    await emailService.sendAbsenteeAlertEmail({
      to: parentEmail,
      parentName,
      studentName,
      studentClass,
      date,
    });
  }

  /**
   * Consumer for Terminal Report Card Email Publication
   */
  private static async handleReportCardPublished(
    payload: ReportCardPublishedPayload
  ): Promise<void> {
    const {
      parentEmail,
      parentName,
      studentName,
      studentClass,
      term,
      academicYear,
      position,
      percentage,
      portalUrl,
    } = payload;

    if (!parentEmail) {
      console.log(`[EmailEventListener] Skipping report card email for ${studentName}: No parent email address.`);
      return;
    }

    console.log(`[EmailEventListener] Dispatching report card to parent (${parentEmail}) for ${studentName}`);

    await emailService.sendReportCardEmail({
      to: parentEmail,
      parentName,
      studentName,
      studentClass,
      term,
      academicYear,
      position,
      averageScore: percentage,
      portalUrl,
    });
  }

  /**
   * Consumer for Proprietor Staff Broadcast
   */
  private static async handleStaffBroadcast(payload: StaffBroadcastPayload): Promise<void> {
    const { title, message, targetEmails, priority, senderName } = payload;

    if (!targetEmails || targetEmails.length === 0) {
      console.log(`[EmailEventListener] Staff broadcast contains no target emails.`);
      return;
    }

    console.log(
      `[EmailEventListener] Dispatching staff broadcast "${title}" to ${targetEmails.length} staff member(s)...`
    );

    // Send emails in asynchronous parallel batches
    for (const email of targetEmails) {
      try {
        await emailService.sendStaffOnboardingEmail({
          to: email,
          staffName: 'Distinguished Faculty Member',
          role: priority,
          employeeId: 'OAK-STAFF',
          password: message, // Or structured notice content
        });
      } catch (err: any) {
        console.error(`[EmailEventListener] Failed sending broadcast to ${email}:`, err.message);
      }
    }
  }
}
