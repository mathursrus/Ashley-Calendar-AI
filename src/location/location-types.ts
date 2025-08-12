// Location types and interfaces for calendar invite enhancement

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

export interface GoogleMeetConfig {
  createRequest: {
    requestId: string;
    conferenceSolutionKey: {
      type: 'hangoutsMeet';
    };
  };
}

export interface CalendarEventWithLocation {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  location?: string;
  conferenceData?: GoogleMeetConfig;
}

export interface LocationService {
  detectLocation(emailContent: string): LocationDetectionResult;
  generateGoogleMeetLink(): Promise<GoogleMeetConfig>;
  createCalendarEventWithLocation(
    eventDetails: any,
    location: MeetingLocation
  ): Promise<CalendarEventWithLocation>;
}