import { Request, Response } from 'express';
import { CalendarService } from './calendar.service.js';

export class CalendarController {
  private calendarService = CalendarService.getInstance();

  /**
   * GET /api/v1/calendar/events
   */
  getEvents = async (req: Request, res: Response) => {
    try {
      const { audience, eventType, month, year, search } = req.query;
      const events = await this.calendarService.getEvents({
        audience: audience as string,
        eventType: eventType as string,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        search: search as string,
      });

      res.status(200).json({
        success: true,
        data: events,
        count: events.length,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/calendar/events/:id
   */
  getEventById = async (req: Request, res: Response) => {
    try {
      const event = await this.calendarService.getEventById(req.params.id);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }
      res.status(200).json({ success: true, data: event });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/calendar/events
   */
  createEvent = async (req: Request, res: Response) => {
    try {
      const { title, eventType, startDate, endDate } = req.body;
      if (!title || !eventType || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'title, eventType, startDate, and endDate are required fields.',
        });
      }

      const created = await this.calendarService.createEvent(req.body, (req as any).user?.id);
      res.status(201).json({
        success: true,
        message: 'School event scheduled successfully.',
        data: created,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * PATCH /api/v1/calendar/events/:id
   */
  updateEvent = async (req: Request, res: Response) => {
    try {
      const updated = await this.calendarService.updateEvent(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Event updated successfully.',
        data: updated,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * DELETE /api/v1/calendar/events/:id
   */
  deleteEvent = async (req: Request, res: Response) => {
    try {
      const success = await this.calendarService.deleteEvent(req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }
      res.status(200).json({
        success: true,
        message: 'Event removed from school calendar.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/calendar/events/:id/notify
   */
  broadcastReminder = async (req: Request, res: Response) => {
    try {
      const result = await this.calendarService.broadcastEventReminder(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Event reminder broadcast dispatched.',
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
