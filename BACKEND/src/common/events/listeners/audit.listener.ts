/**
 * Oakland International School - Audit Log Event Listener (Consumer)
 * 
 * Automatically captures domain events across the institution and records
 * them into the permanent institutional audit registry.
 */

import { eventBus } from '../event-bus.js';
import { AppEvents, AppEvent } from '../event-types.js';
import { auditService } from '../../services/audit.service.js';

export class AuditEventListener {
  private static isRegistered = false;

  public static register(): void {
    if (this.isRegistered) return;
    this.isRegistered = true;

    console.log('[AuditEventListener] 🛡️ Registering institutional audit event consumer...');

    // Automatically subscribe to ALL AppEvents
    const allEvents = Object.values(AppEvents);

    for (const eventName of allEvents) {
      eventBus.subscribe(eventName, async (event: AppEvent) => {
        await AuditEventListener.recordAuditEvent(event);
      });
    }

    console.log(`[AuditEventListener] ✓ Audit consumer listening to ${allEvents.length} institutional events.`);
  }

  private static async recordAuditEvent(event: AppEvent): Promise<void> {
    try {
      const { meta, payload } = event;

      // Extract resource type from event name prefix (e.g., 'staff', 'student', 'fee')
      const resourceType = meta.eventName.split('.')[0] || 'general';

      // Sanitize payload for metadata
      const sanitizedMetadata = { ...payload };
      if (sanitizedMetadata.temporaryPassword) sanitizedMetadata.temporaryPassword = '***REDACTED***';
      if (sanitizedMetadata.password) sanitizedMetadata.password = '***REDACTED***';

      await auditService.recordLog({
        school_id: payload?.school_id || 'a0000000-0000-0000-0000-000000000001',
        actor_id: payload?.actor_id || payload?.marked_by || payload?.graded_by || payload?.recorded_by || payload?.appointedBy,
        actor_role: payload?.actor_role || meta.source || 'system',
        action: meta.eventName,
        resource_type: resourceType,
        resource_id: payload?.id || payload?.studentId || payload?.employeeId || payload?.receiptNumber,
        metadata: {
          eventId: meta.eventId,
          source: meta.source,
          summary: payload?.title || payload?.fullName || payload?.studentName || meta.eventName,
          ...sanitizedMetadata,
        },
        created_at: meta.timestamp,
      });
    } catch (err: any) {
      console.warn('[AuditEventListener] Non-fatal audit log warning:', err.message);
    }
  }
}
