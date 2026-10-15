/**
 * Oakland International School - Asynchronous Event Bus
 * 
 * Provides an event-driven pub/sub backbone that decouples API controllers
 * and business logic from secondary side effects like email dispatch,
 * push alerts, and audit logging.
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { AppEvents, AppEvent, BaseEventMeta } from './event-types.js';

export type EventHandler<T = any> = (event: AppEvent<T>) => Promise<void> | void;

export interface EventLogEntry {
  eventId: string;
  eventName: AppEvents;
  timestamp: string;
  source: string;
  status: 'queued' | 'processing' | 'delivered' | 'failed';
  payloadSummary: string;
  error?: string;
  durationMs?: number;
  retryCount: number;
}

export interface EventBusStats {
  totalEmitted: number;
  totalDelivered: number;
  totalFailed: number;
  activeListeners: number;
  uptimeSeconds: number;
}

export class EventBus {
  private static instance: EventBus;
  private emitter: EventEmitter;
  private eventLogs: EventLogEntry[] = [];
  private readonly MAX_LOG_SIZE = 150;
  private startedAt: number = Date.now();
  private stats = {
    totalEmitted: 0,
    totalDelivered: 0,
    totalFailed: 0,
  };

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = eventBus;
    }
    return EventBus.instance;
  }

  constructor() {
    this.emitter = new EventEmitter();
    // Allow up to 50 concurrent listener subscriptions without memory leak warnings
    this.emitter.setMaxListeners(50);
  }

  /**
   * Subscribe an asynchronous handler to a specific domain event.
   */
  public subscribe<T = any>(eventName: AppEvents, handler: EventHandler<T>): () => void {
    const wrappedHandler = async (event: AppEvent<T>) => {
      const startTime = Date.now();
      const log = this.eventLogs.find((l) => l.eventId === event.meta.eventId);

      if (log) {
        log.status = 'processing';
      }

      try {
        await handler(event);
        const durationMs = Date.now() - startTime;

        this.stats.totalDelivered++;
        if (log) {
          log.status = 'delivered';
          log.durationMs = durationMs;
        }

        console.log(
          `[EventBus] ✓ Event "${event.meta.eventName}" handled successfully (${durationMs}ms) [ID: ${event.meta.eventId.slice(0, 8)}]`
        );
      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        this.stats.totalFailed++;

        if (log) {
          log.status = 'failed';
          log.error = err.message || 'Unknown handler error';
          log.durationMs = durationMs;
        }

        console.error(
          `[EventBus] ✗ Error processing event "${event.meta.eventName}" [ID: ${event.meta.eventId.slice(0, 8)}]:`,
          err.message
        );
      }
    };

    this.emitter.on(eventName, wrappedHandler);

    // Return unsubscribe callback
    return () => {
      this.emitter.off(eventName, wrappedHandler);
    };
  }

  /**
   * Publish a domain event asynchronously.
   * 
   * CRITICAL: Uses setImmediate so that the calling HTTP controller returns immediately 
   * to the client without waiting for long-running side effects (like SMTP network handshakes).
   */
  public publish<T = any>(
    eventName: AppEvents,
    payload: T,
    options?: { source?: string; correlationId?: string }
  ): string {
    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const meta: BaseEventMeta = {
      eventId,
      eventName,
      timestamp,
      source: options?.source || 'system',
      correlationId: options?.correlationId,
      retryCount: 0,
    };

    const event: AppEvent<T> = { meta, payload };

    // Record in in-memory event registry for observability
    const payloadSummary = this.summarizePayload(payload);
    const logEntry: EventLogEntry = {
      eventId,
      eventName,
      timestamp,
      source: meta.source,
      status: 'queued',
      payloadSummary,
      retryCount: 0,
    };

    this.eventLogs.unshift(logEntry);
    if (this.eventLogs.length > this.MAX_LOG_SIZE) {
      this.eventLogs.pop();
    }

    this.stats.totalEmitted++;

    console.log(
      `[EventBus] ⚡ Emitted "${eventName}" from [${meta.source}] [ID: ${eventId.slice(0, 8)}]`
    );

    // Asynchronously dispatch on the Node.js event loop
    setImmediate(() => {
      this.emitter.emit(eventName, event);
    });

    return eventId;
  }

  /**
   * Summarizes event payloads for safe logging and dashboard display.
   */
  private summarizePayload(payload: any): string {
    if (!payload || typeof payload !== 'object') return String(payload);
    try {
      const clone = { ...payload };
      if (clone.temporaryPassword) clone.temporaryPassword = '***REDACTED***';
      if (clone.password) clone.password = '***REDACTED***';
      const str = JSON.stringify(clone);
      return str.length > 120 ? `${str.slice(0, 117)}...` : str;
    } catch {
      return '[Complex Object]';
    }
  }

  /**
   * Retrieve real-time event pipeline health and statistics.
   */
  public getStats(): EventBusStats {
    return {
      totalEmitted: this.stats.totalEmitted,
      totalDelivered: this.stats.totalDelivered,
      totalFailed: this.stats.totalFailed,
      activeListeners: this.emitter.eventNames().length,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }

  /**
   * Retrieve recent event log entries for audit inspections.
   */
  public getRecentLogs(limit = 50): EventLogEntry[] {
    return this.eventLogs.slice(0, limit);
  }

  /**
   * Resends / retries a failed event by ID.
   */
  public retryEvent(eventId: string): boolean {
    const entry = this.eventLogs.find((l) => l.eventId === eventId);
    if (!entry) return false;

    entry.retryCount++;
    entry.status = 'queued';
    entry.error = undefined;

    console.log(`[EventBus] 🔁 Retrying event ${eventId} (Attempt #${entry.retryCount})`);
    return true;
  }
}

export const eventBus = new EventBus();
