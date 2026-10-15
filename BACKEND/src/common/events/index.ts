/**
 * Oakland International School - Event-Driven Architecture (EDA)
 * 
 * Central registry and initialization entry point.
 */

import { eventBus } from './event-bus.js';
import { EmailEventListener } from './listeners/email.listener.js';
import { AuditEventListener } from './listeners/audit.listener.js';
import { StudentTimelineListener } from './listeners/student-timeline.listener.js';
import { NotificationEventListener } from './listeners/notification.listener.js';

export * from './event-types.js';
export * from './event-bus.js';

let isInitialized = false;

/**
 * Boots up the event-driven subsystem and attaches all background listeners.
 */
export function initializeEventSystem(): void {
  if (isInitialized) return;
  isInitialized = true;

  console.log('--------------------------------------------------');
  console.log('⚡ Initializing Oakland Event-Driven Subsystem...');
  
  // Register subscribers
  EmailEventListener.register();
  AuditEventListener.register();
  StudentTimelineListener.register();
  NotificationEventListener.register();

  console.log('⚡ Event-Driven Subsystem Ready (Pub/Sub Active)');
  console.log('--------------------------------------------------');
}
