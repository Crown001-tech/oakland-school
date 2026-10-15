export type EventType =
  | 'academic'
  | 'holiday'
  | 'examination'
  | 'meeting'
  | 'pta'
  | 'deadline'
  | 'activity'
  | 'sports';

export type EventAudience = 'all' | 'staff' | 'parents' | 'students' | 'specific_class';

export interface SchoolEvent {
  id: string;
  title: string;
  description?: string;
  eventType: EventType;
  startDate: string;
  endDate: string;
  allDay: boolean;
  audience: EventAudience;
  targetClass?: string;
  location?: string;
  notifyBeforeDays: number;
  isPublished: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventDTO {
  title: string;
  description?: string;
  eventType: EventType;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  audience?: EventAudience;
  targetClass?: string;
  location?: string;
  notifyBeforeDays?: number;
  isPublished?: boolean;
}

export interface UpdateEventDTO extends Partial<CreateEventDTO> {}
