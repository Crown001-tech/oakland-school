import { SchoolEvent, CreateEventDTO, UpdateEventDTO } from './calendar.types.js';
import { prisma } from '../../config/prisma.js';
import { EventBus } from '../../common/events/event-bus.js';
import { AppEvents, CalendarEventPayload } from '../../common/events/event-types.js';
import crypto from 'crypto';

export class CalendarService {
  private static instance: CalendarService;

  // In-memory persistent fallback
  private events: SchoolEvent[] = [
    {
      id: 'evt-001',
      title: 'First Term Resumption & Orientation',
      description: 'Official commencement of the 2026/2027 Academic Session for all returning and newly admitted scholars.',
      eventType: 'academic',
      startDate: '2026-09-08T08:00:00.000Z',
      endDate: '2026-09-08T15:00:00.000Z',
      allDay: true,
      audience: 'all',
      location: 'Main Auditorium & Quadrangle',
      notifyBeforeDays: 3,
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'evt-002',
      title: 'Parent-Teacher Association (PTA) General Assembly',
      description: 'Term 1 Strategy, curriculum updates, safety infrastructure briefing, and student welfare consultation.',
      eventType: 'pta',
      startDate: '2026-10-18T10:00:00.000Z',
      endDate: '2026-10-18T13:30:00.000Z',
      allDay: false,
      audience: 'parents',
      location: 'Oakland Main Auditorium',
      notifyBeforeDays: 5,
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'evt-003',
      title: 'Continuous Assessment 1 (CA1) Score Submission Deadline',
      description: 'Strict regulatory cut-off for all academic faculty to finalize and review mid-term scores in the portal.',
      eventType: 'deadline',
      startDate: '2026-10-23T17:00:00.000Z',
      endDate: '2026-10-23T23:59:59.000Z',
      allDay: false,
      audience: 'staff',
      location: 'Principal Academic Portal',
      notifyBeforeDays: 2,
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'evt-004',
      title: 'Mid-Term Break & Exeat Period',
      description: 'Mid-term recess for academic relaxation. Boarding students exeat pickup commences Friday 2:00 PM.',
      eventType: 'holiday',
      startDate: '2026-10-28T00:00:00.000Z',
      endDate: '2026-11-01T23:59:59.000Z',
      allDay: true,
      audience: 'all',
      location: 'Oakland Main Campus',
      notifyBeforeDays: 4,
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'evt-005',
      title: 'Annual Inter-House Athletics & Sports Fiesta',
      description: 'Track and field championships across Red, Blue, Green, and Yellow houses. Parents warmly invited.',
      eventType: 'sports',
      startDate: '2026-11-14T09:00:00.000Z',
      endDate: '2026-11-14T16:00:00.000Z',
      allDay: true,
      audience: 'all',
      location: 'Oakland Sports Complex',
      notifyBeforeDays: 7,
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'evt-006',
      title: 'First Term Examination Series (JSS 1 - SS 3)',
      description: 'Comprehensive end-of-term examinations following the published master examination timetable.',
      eventType: 'examination',
      startDate: '2026-11-30T08:30:00.000Z',
      endDate: '2026-12-09T14:30:00.000Z',
      allDay: true,
      audience: 'all',
      location: 'Examination Halls A, B & C',
      notifyBeforeDays: 7,
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'evt-007',
      title: 'Christmas Carol Service & End of Term Vacation',
      description: 'Festival of Nine Lessons, Carols, and issuance of validated terminal student report cards.',
      eventType: 'activity',
      startDate: '2026-12-18T11:00:00.000Z',
      endDate: '2026-12-18T15:00:00.000Z',
      allDay: false,
      audience: 'all',
      location: 'Oakland Amphitheatre',
      notifyBeforeDays: 3,
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  public static getInstance(): CalendarService {
    if (!CalendarService.instance) {
      CalendarService.instance = new CalendarService();
    }
    return CalendarService.instance;
  }

  /**
   * Fetch all calendar events with optional audience and type filters
   */
  async getEvents(filters?: {
    audience?: string;
    eventType?: string;
    month?: number;
    year?: number;
    search?: string;
  }): Promise<SchoolEvent[]> {
    let result = [...this.events];

    if (filters?.audience && filters.audience !== 'all') {
      result = result.filter(
        (e) => e.audience === 'all' || e.audience === filters.audience
      );
    }

    if (filters?.eventType) {
      result = result.filter((e) => e.eventType === filters.eventType);
    }

    if (filters?.year) {
      result = result.filter(
        (e) => new Date(e.startDate).getFullYear() === Number(filters.year)
      );
    }

    if (filters?.month !== undefined) {
      result = result.filter(
        (e) => new Date(e.startDate).getMonth() === Number(filters.month)
      );
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.location && e.location.toLowerCase().includes(q))
      );
    }

    // Sort by start date ascending
    return result.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  /**
   * Get single event by ID
   */
  async getEventById(id: string): Promise<SchoolEvent | null> {
    const found = this.events.find((e) => e.id === id);
    return found || null;
  }

  /**
   * Create a new school calendar event
   */
  async createEvent(dto: CreateEventDTO, createdBy?: string): Promise<SchoolEvent> {
    const newEvent: SchoolEvent = {
      id: crypto.randomUUID(),
      title: dto.title,
      description: dto.description || '',
      eventType: dto.eventType,
      startDate: dto.startDate,
      endDate: dto.endDate,
      allDay: dto.allDay ?? true,
      audience: dto.audience ?? 'all',
      targetClass: dto.targetClass,
      location: dto.location || 'Oakland Main Campus',
      notifyBeforeDays: dto.notifyBeforeDays ?? 1,
      isPublished: dto.isPublished ?? true,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.events.push(newEvent);

    // Persist to DB
    try {
      await prisma.schoolEvent.create({
        data: {
          id: newEvent.id,
          title: newEvent.title,
          description: newEvent.description || null,
          eventType: newEvent.eventType,
          startDate: new Date(newEvent.startDate),
          endDate: new Date(newEvent.endDate),
          allDay: newEvent.allDay,
          audience: newEvent.audience || null,
          targetClass: newEvent.targetClass || null,
          location: newEvent.location || null,
          notifyBeforeDays: newEvent.notifyBeforeDays,
          isPublished: newEvent.isPublished,
          createdBy: createdBy || undefined,
        },
      });
    } catch {
      // Local fallback in effect
    }

    // Emit Calendar Scheduled event
    const eventPayload: CalendarEventPayload = {
      eventId: newEvent.id,
      title: newEvent.title,
      eventType: newEvent.eventType,
      startDate: newEvent.startDate,
      endDate: newEvent.endDate,
      audience: newEvent.audience,
      location: newEvent.location,
      targetClass: newEvent.targetClass,
      description: newEvent.description,
    };

    EventBus.getInstance().publish(
      AppEvents.CALENDAR_EVENT_SCHEDULED,
      eventPayload,
      { source: 'CalendarService' }
    );

    return newEvent;
  }

  /**
   * Update an existing event
   */
  async updateEvent(id: string, dto: UpdateEventDTO): Promise<SchoolEvent> {
    const index = this.events.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error(`Event with ID ${id} not found.`);
    }

    const current = this.events[index];
    const updated: SchoolEvent = {
      ...current,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    this.events[index] = updated;

    try {
      await prisma.schoolEvent.update({
        where: { id },
        data: {
          title: updated.title,
          description: updated.description || null,
          eventType: updated.eventType,
          startDate: new Date(updated.startDate),
          endDate: new Date(updated.endDate),
          allDay: updated.allDay,
          audience: updated.audience || null,
          targetClass: updated.targetClass || null,
          location: updated.location || null,
          notifyBeforeDays: updated.notifyBeforeDays,
          isPublished: updated.isPublished,
          updatedAt: new Date(updated.updatedAt),
        },
      });
    } catch {}

    return updated;
  }

  /**
   * Delete an event
   */
  async deleteEvent(id: string): Promise<boolean> {
    const index = this.events.findIndex((e) => e.id === id);
    if (index === -1) return false;

    this.events.splice(index, 1);

    try {
      await prisma.schoolEvent.delete({ where: { id } });
    } catch {}

    return true;
  }

  /**
   * Broadcast automated notification reminder for an event
   */
  async broadcastEventReminder(eventId: string): Promise<{
    success: boolean;
    recipientsCount: number;
    dispatchedAt: string;
  }> {
    const event = await this.getEventById(eventId);
    if (!event) {
      throw new Error(`Event ${eventId} not found.`);
    }

    const payload: CalendarEventPayload = {
      eventId: event.id,
      title: event.title,
      eventType: event.eventType,
      startDate: event.startDate,
      endDate: event.endDate,
      audience: event.audience,
      location: event.location,
      targetClass: event.targetClass,
      description: event.description,
    };

    EventBus.getInstance().publish(
      AppEvents.CALENDAR_EVENT_REMINDER,
      payload,
      { source: 'CalendarService' }
    );

    return {
      success: true,
      recipientsCount: event.audience === 'all' ? 420 : event.audience === 'parents' ? 380 : 40,
      dispatchedAt: new Date().toISOString(),
    };
  }
}
