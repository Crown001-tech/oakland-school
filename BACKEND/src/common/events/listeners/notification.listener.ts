/**
 * Oakland International School - Multi-Channel Notification Event Listener
 * 
 * Asynchronously consumes institutional domain events and routes them through the
 * multi-channel NotificationEngine (Email + SMS + WhatsApp) according to policy.
 */

import { eventBus } from '../event-bus.js';
import {
  AppEvents,
  AppEvent,
  StudentAbsentPayload,
  ReportCardPublishedPayload,
  FeePaymentRecordedPayload,
  StaffBroadcastPayload,
} from '../event-types.js';
import { notificationEngine } from '../../services/notification/notification-engine.service.js';

export class NotificationEventListener {
  private static isRegistered = false;

  public static register(): void {
    if (this.isRegistered) return;
    this.isRegistered = true;

    console.log('[NotificationEventListener] 📡 Registering Multi-Channel Event Consumers...');

    // 1. Student Absentee Attendance Alerts (Multi-channel: Email + SMS)
    eventBus.subscribe<StudentAbsentPayload>(
      AppEvents.STUDENT_ABSENT_MARKED,
      async (event: AppEvent<StudentAbsentPayload>) => {
        await NotificationEventListener.handleStudentAbsent(event.payload);
      }
    );

    // 2. Fee Payment Receipts & Bursary Confirmations (Multi-channel: Email + SMS)
    eventBus.subscribe<FeePaymentRecordedPayload>(
      AppEvents.FEE_PAYMENT_RECORDED,
      async (event: AppEvent<FeePaymentRecordedPayload>) => {
        await NotificationEventListener.handleFeePayment(event.payload);
      }
    );

    // 3. Report Card Releases (Multi-channel: Email + WhatsApp)
    eventBus.subscribe<ReportCardPublishedPayload>(
      AppEvents.REPORT_CARD_PUBLISHED,
      async (event: AppEvent<ReportCardPublishedPayload>) => {
        await NotificationEventListener.handleReportCard(event.payload);
      }
    );

    // 4. Staff Executive Broadcasts (Multi-channel dispatch)
    eventBus.subscribe<StaffBroadcastPayload>(
      AppEvents.STAFF_BROADCAST_CREATED,
      async (event: AppEvent<StaffBroadcastPayload>) => {
        await NotificationEventListener.handleStaffBroadcast(event.payload);
      }
    );

    // 5. School Calendar Event Reminders
    eventBus.subscribe(
      AppEvents.CALENDAR_EVENT_REMINDER,
      async (event: AppEvent<any>) => {
        await NotificationEventListener.handleCalendarReminder(event.payload);
      }
    );

    // 6. Master Timetable Publication
    eventBus.subscribe(
      AppEvents.TIMETABLE_VERSION_PUBLISHED,
      async (event: AppEvent<any>) => {
        await NotificationEventListener.handleTimetablePublished(event.payload);
      }
    );

    // 7. Student Pickup Clearance (Parent Instant Alert)
    eventBus.subscribe(
      AppEvents.STUDENT_PICKUP_RECORDED,
      async (event: AppEvent<any>) => {
        await NotificationEventListener.handleStudentPickup(event.payload);
      }
    );

    // 8. Gate Security Alert (Unauthorized Attempt)
    eventBus.subscribe(
      AppEvents.SECURITY_PICKUP_FLAGGED,
      async (event: AppEvent<any>) => {
        await NotificationEventListener.handleSecurityFlag(event.payload);
      }
    );

    // 9. Procurement Requisition Routing
    eventBus.subscribe(
      AppEvents.PROCUREMENT_REQUEST_SUBMITTED,
      async (event: AppEvent<any>) => {
        await NotificationEventListener.handleProcurementSubmitted(event.payload);
      }
    );

    // 10. CBT Assessment Published Announcement
    eventBus.subscribe(
      AppEvents.CBT_ASSESSMENT_PUBLISHED,
      async (event: AppEvent<any>) => {
        await NotificationEventListener.handleCbtPublished(event.payload);
      }
    );

    // 11. CBT Assessment Submission & Instant Result Alert
    eventBus.subscribe(
      AppEvents.CBT_SESSION_SUBMITTED,
      async (event: AppEvent<any>) => {
        await NotificationEventListener.handleCbtSubmitted(event.payload);
      }
    );

    console.log('[NotificationEventListener] ✓ Multi-Channel Event Consumers active.');
  }

  private static async handleStudentAbsent(payload: StudentAbsentPayload): Promise<void> {
    const { studentName, studentClass, date, parentEmail, parentName, guardianPhone } = payload;
    const phone = guardianPhone || '+2348031234567';

    console.log(`[NotificationEventListener] Routing absentee notice for ${studentName} via Multi-Channel Engine...`);

    await notificationEngine.dispatch({
      recipients: [
        {
          name: parentName || 'Parent / Guardian',
          email: parentEmail,
          phone,
          studentName,
          studentClass,
        },
      ],
      channels: ['email', 'sms'],
      templateCode: 'absent_notice',
      data: {
        student_name: studentName,
        parent_name: parentName || 'Parent / Guardian',
        class: studentClass,
        date: date || new Date().toLocaleDateString('en-GB'),
      },
      eventType: AppEvents.STUDENT_ABSENT_MARKED,
    });
  }

  private static async handleFeePayment(payload: FeePaymentRecordedPayload): Promise<void> {
    const { studentName, studentClass, amount, receiptNo, payerName, payerEmail } = payload;
    const email = payerEmail || 'parent@example.com';
    const phone = '+2348031234567';

    console.log(`[NotificationEventListener] Routing fee receipt [${receiptNo}] for ₦${amount} via Multi-Channel Engine...`);

    await notificationEngine.dispatch({
      recipients: [
        {
          name: payerName || 'Valued Parent',
          email,
          phone,
          studentName,
          studentClass,
        },
      ],
      channels: ['email', 'sms'],
      subject: `Oakland Bursary: Official Payment Receipt #${receiptNo}`,
      customBody: `Dear ${payerName},\n\nPayment confirmation: ₦${amount.toLocaleString()} was successfully received for ${studentName} (${studentClass}). Official Receipt: ${receiptNo}.\n\nThank you for your timely settlement.\nOakland Bursary`,
      data: {
        amount: amount.toLocaleString(),
        receipt_no: receiptNo,
        student_name: studentName,
      },
      eventType: AppEvents.FEE_PAYMENT_RECORDED,
    });
  }

  private static async handleReportCard(payload: ReportCardPublishedPayload): Promise<void> {
    const { studentName, studentClass, term, parentEmail, parentName, percentage } = payload;
    const phone = '+2348031234567';

    console.log(`[NotificationEventListener] Routing report card notification for ${studentName} via Multi-Channel Engine...`);

    await notificationEngine.dispatch({
      recipients: [
        {
          name: parentName || 'Parent / Guardian',
          email: parentEmail,
          phone,
          studentName,
          studentClass,
        },
      ],
      channels: ['email', 'whatsapp'],
      templateCode: 'report_card_ready',
      data: {
        student_name: studentName,
        parent_name: parentName || 'Parent / Guardian',
        class: studentClass,
        term,
        percentage: percentage ?? 85,
      },
      eventType: AppEvents.REPORT_CARD_PUBLISHED,
    });
  }

  private static async handleStaffBroadcast(payload: StaffBroadcastPayload): Promise<void> {
    const { title, message, targetEmails } = payload;

    const recipients = (targetEmails && targetEmails.length > 0 ? targetEmails : ['staff@oaklandschools.edu.ng']).map(
      (email) => ({
        name: 'Oakland Faculty Member',
        email,
        phone: '+2348030009999',
        type: 'staff' as const,
      })
    );

    console.log(`[NotificationEventListener] Routing staff broadcast "${title}" to ${recipients.length} staff member(s)...`);

    await notificationEngine.dispatch({
      recipients,
      channels: ['email'],
      subject: `Institutional Notice: ${title}`,
      customBody: message,
      eventType: AppEvents.STAFF_BROADCAST_CREATED,
    });
  }

  private static async handleCalendarReminder(payload: any): Promise<void> {
    const { title, eventType, startDate, audience, location } = payload;
    console.log(`[NotificationEventListener] 📅 Dispatching calendar reminder for "${title}" (${audience})...`);

    const formattedDate = new Date(startDate).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const recipients = [
      {
        name: audience === 'parents' ? 'Oakland Parents' : 'Oakland Community',
        email: audience === 'staff' ? 'staff@oaklandschools.edu.ng' : 'parents@oaklandschools.edu.ng',
        phone: '+2348030001234',
        type: (audience === 'staff' ? 'staff' : 'parent') as any,
      },
    ];

    await notificationEngine.dispatch({
      recipients,
      channels: ['email', 'sms'],
      subject: `Upcoming School Event: ${title}`,
      customBody: `Dear Oakland Community, please be reminded of the scheduled event: "${title}" occurring on ${formattedDate} at ${location || 'Oakland Main Campus'}.`,
      eventType: AppEvents.CALENDAR_EVENT_REMINDER,
    });
  }

  private static async handleTimetablePublished(payload: any): Promise<void> {
    const { academicYear, term } = payload;
    console.log(`[NotificationEventListener] 🕒 Master Timetable published for ${academicYear} ${term}. Alerting faculty...`);

    await notificationEngine.dispatch({
      recipients: [
        {
          name: 'Academic Faculty Directorate',
          email: 'academics@oaklandschools.edu.ng',
          phone: '+2348030008888',
          type: 'staff',
        },
      ],
      channels: ['email'],
      subject: `Official Master Timetable Published (${academicYear} - ${term})`,
      customBody: `The Principal has formally ratified and published the Master Timetable for ${academicYear} ${term}. Teachers may view their updated instructional periods directly in the Teacher Portal.`,
      eventType: AppEvents.TIMETABLE_VERSION_PUBLISHED,
    });
  }

  private static async handleStudentPickup(payload: any): Promise<void> {
    const { studentName, studentClass, pickedUpBy, relationship, pickupTime, parentPhone, parentEmail } = payload;
    console.log(`[NotificationEventListener] 🛡️ Dispatching student pickup safety alert for ${studentName}...`);

    const formattedTime = new Date(pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    await notificationEngine.dispatch({
      recipients: [
        {
          name: 'Parent / Guardian',
          email: parentEmail || 'parents@oaklandschools.edu.ng',
          phone: parentPhone || '+2348030001234',
          type: 'parent',
        },
      ],
      channels: ['sms', 'whatsapp'],
      subject: `Gate Security: ${studentName} Picked Up`,
      customBody: `Oakland Security Alert: Your ward ${studentName} (${studentClass}) was safely picked up at ${formattedTime} by ${pickedUpBy} (${relationship}). If this was not authorized by you, contact security immediately: 0803-000-1234.`,
      eventType: AppEvents.STUDENT_PICKUP_RECORDED,
    });
  }

  private static async handleSecurityFlag(payload: any): Promise<void> {
    const { studentName, studentClass, attemptedBy, reason } = payload;
    console.log(`[NotificationEventListener] 🚨 SECURITY ALERT: Unauthorized pickup attempt for ${studentName} by ${attemptedBy}!`);

    await notificationEngine.dispatch({
      recipients: [
        {
          name: 'Chief Security Officer & Principal',
          email: 'security@oaklandschools.edu.ng',
          phone: '+2348030009999',
          type: 'staff',
        },
      ],
      channels: ['sms', 'email'],
      subject: `CRITICAL SECURITY ALERT: Unauthorized Pickup Flagged`,
      customBody: `URGENT SECURITY NOTICE: An unauthorized individual (${attemptedBy}) attempted pickup for ${studentName} (${studentClass}). Gate officer flagged: ${reason}. Gate locked down for this student.`,
      eventType: AppEvents.SECURITY_PICKUP_FLAGGED,
    });
  }

  private static async handleProcurementSubmitted(payload: any): Promise<void> {
    const { itemName, quantity, totalCost, requestedBy } = payload;
    console.log(`[NotificationEventListener] 📦 Routing procurement requisition "${itemName}" to Principal...`);

    await notificationEngine.dispatch({
      recipients: [
        {
          name: 'School Principal',
          email: 'principal@oaklandschools.edu.ng',
          phone: '+2348030007777',
          type: 'staff',
        },
      ],
      channels: ['email'],
      subject: `New Procurement Requisition: ${itemName}`,
      customBody: `A new procurement requisition has been submitted by ${requestedBy} for ${quantity} unit(s) of "${itemName}" (Est. Total: ₦${totalCost.toLocaleString()}). Please review in the Principal Portal.`,
      eventType: AppEvents.PROCUREMENT_REQUEST_SUBMITTED,
    });
  }

  private static async handleCbtPublished(payload: any): Promise<void> {
    const { title, subject, classLevel, durationMinutes, totalMarks } = payload;
    console.log(`[NotificationEventListener] 📝 CBT Assessment Published: "${title}" for ${classLevel}...`);

    await notificationEngine.dispatch({
      recipients: [
        {
          name: `${classLevel} Students & Parents`,
          email: 'academic-registry@oaklandschools.edu.ng',
          phone: '+2348031110001',
          studentClass: classLevel,
        },
      ],
      channels: ['email', 'sms'],
      subject: `Oakland CBT Notice: ${title}`,
      customBody: `New CBT Assessment Published: "${title}" (${subject}) for ${classLevel}. Duration: ${durationMinutes} minutes (${totalMarks} marks). Students may take this test via the student CBT portal.`,
      eventType: AppEvents.CBT_ASSESSMENT_PUBLISHED,
    });
  }

  private static async handleCbtSubmitted(payload: any): Promise<void> {
    const { studentName, studentClass, assessmentTitle, scoreObtained, totalMarks, percentage, passed, parentEmail, parentPhone } = payload;
    console.log(`[NotificationEventListener] 📊 CBT Result Recorded: ${studentName} scored ${scoreObtained}/${totalMarks} (${percentage}%)...`);

    await notificationEngine.dispatch({
      recipients: [
        {
          name: `${studentName}'s Guardian`,
          email: parentEmail || 'parent@example.com',
          phone: parentPhone || '+2348031110001',
          studentName,
          studentClass,
        },
      ],
      channels: ['sms', 'email'],
      subject: `Oakland CBT Result: ${studentName} - ${assessmentTitle}`,
      customBody: `Oakland CBT Assessment Completed: ${studentName} (${studentClass}) scored ${scoreObtained}/${totalMarks} (${percentage}%) in "${assessmentTitle}". Status: ${passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}.`,
      eventType: AppEvents.CBT_SESSION_SUBMITTED,
    });
  }
}

