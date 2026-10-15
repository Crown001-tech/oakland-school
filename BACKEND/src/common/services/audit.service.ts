/**
 * Oakland International School - Persistent Audit Service
 * 
 * Provides durable database-backed audit recording for all institutional operations,
 * administrative actions, and domain events.
 */

import { prisma } from '../../config/prisma.js';

export interface AuditLogEntry {
  id?: string;
  school_id?: string;
  actor_id?: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  created_at?: string;
}

class AuditService {
  private inMemoryFallback: AuditLogEntry[] = [];
  private readonly MAX_FALLBACK_SIZE = 200;

  /**
   * Persistently records an audit entry to the database,
   * falling back to local memory buffer if the database is unreachable.
   */
  public async recordLog(entry: AuditLogEntry): Promise<void> {
    const timestamp = entry.created_at || new Date().toISOString();
    const normalizedEntry: AuditLogEntry = {
      ...entry,
      created_at: timestamp,
      actor_role: entry.actor_role || 'system',
      metadata: entry.metadata || {},
    };

    // Store in local ring buffer for immediate telemetry
    this.inMemoryFallback.unshift(normalizedEntry);
    if (this.inMemoryFallback.length > this.MAX_FALLBACK_SIZE) {
      this.inMemoryFallback.pop();
    }

    try {
      const isUuid = (val?: string) => !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

      const dbActorId = isUuid(normalizedEntry.actor_id) ? normalizedEntry.actor_id : null;
      const dbResourceId = isUuid(normalizedEntry.resource_id) ? normalizedEntry.resource_id : null;

      const finalMetadata = {
        ...normalizedEntry.metadata,
        ...(normalizedEntry.actor_id && !dbActorId ? { original_actor_ref: normalizedEntry.actor_id } : {}),
        ...(normalizedEntry.resource_id && !dbResourceId ? { original_resource_ref: normalizedEntry.resource_id } : {}),
      };

      await prisma.auditLog.create({
        data: {
          schoolId: normalizedEntry.school_id || 'a0000000-0000-0000-0000-000000000001',
          actorId: dbActorId,
          actorRole: normalizedEntry.actor_role,
          action: normalizedEntry.action,
          resourceType: normalizedEntry.resource_type,
          resourceId: dbResourceId,
          metadata: finalMetadata as any,
          ipAddress: normalizedEntry.ip_address || null,
          createdAt: new Date(normalizedEntry.created_at!),
        },
      });

      console.log(`[AuditService] 🛡️ Recorded audit log: [${normalizedEntry.action}] on [${normalizedEntry.resource_type}]`);
    } catch (err: any) {
      console.warn(`[AuditService] Non-fatal audit log persistence error:`, err.message);
    }
  }

  /**
   * Retrieves recent audit logs from Prisma DB, falling back to local ring buffer.
   */
  public async getRecentLogs(limit = 50, schoolId?: string): Promise<AuditLogEntry[]> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: schoolId ? { schoolId } : undefined,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      if (!logs || logs.length === 0) {
        return this.inMemoryFallback.slice(0, limit);
      }

      return logs.map(l => ({
        id: l.id,
        school_id: l.schoolId,
        actor_id: l.actorId || undefined,
        actor_role: l.actorRole,
        action: l.action,
        resource_type: l.resourceType,
        resource_id: l.resourceId || undefined,
        metadata: l.metadata as any,
        ip_address: l.ipAddress || undefined,
        created_at: l.createdAt?.toISOString(),
      }));
    } catch (err: any) {
      console.warn('[AuditService] Failed to query DB audit logs, using fallback:', err.message);
      return this.inMemoryFallback.slice(0, limit);
    }
  }
}


export const auditService = new AuditService();
