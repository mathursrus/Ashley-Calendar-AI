// Calendar service types and interfaces

export interface BusySlot {
  start: Date;
  end: Date;
  status: 'busy' | 'tentative' | 'out_of_office';
}

export interface FreeBusyResult {
  email: string;
  status: 'success' | 'access_denied' | 'not_found' | 'error';
  busySlots?: BusySlot[];
  errorMessage?: string;
}

export interface AvailableSlot {
  start: Date;
  end: Date;
  duration: number; // in minutes
}

export interface ParticipantAvailability {
  email: string;
  hasApiAccess: boolean;
  availableSlots: AvailableSlot[];
  busySlots: BusySlot[];
  errorMessage?: string;
}

export interface AvailabilityResult {
  commonAvailableSlots: AvailableSlot[];
  participantData: ParticipantAvailability[];
  hasApiAccess: boolean;
  requiresManualCoordination: string[]; // emails needing manual confirmation
  summary: string; // formatted summary for BAML
}

// Enhanced calendar types with location support
export type LocationType = 'physical' | 'virtual' | 'hybrid';

export interface MeetingLocation {
  type: LocationType;
  address?: string;
  meetingLink?: string;
  notes?: string;
}

export interface LocationDetectionResult {
  location?: MeetingLocation;
  confidence: number; // 0-100
  detectedKeywords: string[];
  source: 'email_content' | 'explicit_request' | 'default';
}

export interface CalendarEventDetails {
  summary: string;
  description?: string;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  timezone?: string;
  attendees?: string[];
  location?: MeetingLocation;
}

export interface CalendarService {
  getFreeBusy(
    email: string,
    startTime: Date,
    endTime: Date
  ): Promise<FreeBusyResult>;
}

// Enhanced calendar service with location capabilities
export interface EnhancedCalendarService extends CalendarService {
  createEventWithLocation?(eventDetails: CalendarEventDetails): Promise<any>;
  detectLocationFromContent?(content: string): LocationDetectionResult;
}