// Type definitions for calendar services

export interface BusySlot {
  start: Date;
  end: Date;
}

export interface FreeBusyResult {
  email: string;
  busy: BusySlot[];
}

export interface CalendarService {
  createEvent(
    summary: string,
    description: string,
    startTime: Date,
    endTime: Date,
    attendeeEmails: string[],
    location?: string,
    meetingLink?: string
  ): Promise<string>;

  updateEvent(
    eventId: string,
    updates: {
      summary?: string;
      description?: string;
      startTime?: Date;
      endTime?: Date;
      attendeeEmails?: string[];
      location?: string;
      meetingLink?: string;
    }
  ): Promise<void>;

  deleteEvent(eventId: string): Promise<void>;

  checkAvailability(
    email: string,
    startTime: Date,
    endTime: Date
  ): Promise<FreeBusyResult>;

  findAvailableSlots(
    emails: string[],
    duration: number,
    searchStart: Date,
    searchEnd: Date
  ): Promise<Date[]>;
}
