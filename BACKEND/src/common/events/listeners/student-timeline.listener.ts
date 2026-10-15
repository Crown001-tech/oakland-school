/**
 * Oakland International School - Student Timeline Event Consumer
 * 
 * Automatically captures domain events touching students and projects them
 * directly onto the student's unified chronological timeline.
 */

import { eventBus } from '../event-bus.js';
import { AppEvents, AppEvent } from '../event-types.js';
import { Student360Service } from '../../../modules/students/student-360.service.js';

export class StudentTimelineListener {
  private static isRegistered = false;

  public static register(): void {
    if (this.isRegistered) return;
    this.isRegistered = true;

    console.log('[StudentTimelineListener] ⚡ Registering Student 360 timeline projection listener...');

    // 1. Attendance events
    eventBus.subscribe(AppEvents.STUDENT_ABSENT_MARKED, async (event: AppEvent) => {
      const { payload } = event;
      if (payload?.studentId) {
        await Student360Service.addTimelineEntry(payload.studentId, {
          event_type: 'attendance_absence',
          title: 'Marked Absent',
          description: `Classroom attendance marked absent on ${payload.date || 'today'}.`,
          metadata: { markedBy: payload.markedBy, class: payload.studentClass },
        });
      }
    });

    eventBus.subscribe(AppEvents.STUDENT_LATE_MARKED, async (event: AppEvent) => {
      const { payload } = event;
      if (payload?.studentId) {
        await Student360Service.addTimelineEntry(payload.studentId, {
          event_type: 'attendance_late',
          title: 'Marked Late',
          description: `Arrived after official morning assembly check-in (${payload.date || 'today'}).`,
          metadata: { markedBy: payload.markedBy },
        });
      }
    });

    // 2. Report card events
    eventBus.subscribe(AppEvents.REPORT_CARD_PUBLISHED, async (event: AppEvent) => {
      const { payload } = event;
      if (payload?.studentId) {
        await Student360Service.addTimelineEntry(payload.studentId, {
          event_type: 'report_card_published',
          title: `Report Card Published: ${payload.term || 'Term'}`,
          description: `Official academic results compiled and released with score average of ${payload.percentage || '—'}%. Position: ${payload.position || '—'}.`,
          metadata: payload,
        });
      }
    });

    // 3. Fee payment events
    eventBus.subscribe(AppEvents.FEE_PAYMENT_RECORDED, async (event: AppEvent) => {
      const { payload } = event;
      if (payload?.studentId) {
        await Student360Service.addTimelineEntry(payload.studentId, {
          event_type: 'fee_payment',
          title: `Tuition Fee Payment: ₦${Number(payload.amount || 0).toLocaleString()}`,
          description: `Payment confirmed via ${payload.paymentMethod || 'Bank Transfer'}. Receipt #${payload.receiptNumber || 'N/A'}.`,
          metadata: payload,
        });
      }
    });

    console.log('[StudentTimelineListener] ✓ Student 360 timeline projection active.');
  }
}
