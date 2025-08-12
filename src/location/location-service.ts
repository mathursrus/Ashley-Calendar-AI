// Main location service for calendar invite location enhancement

import { LocationService, LocationDetectionResult, MeetingLocation, GoogleMeetConfig, CalendarEventWithLocation } from './location-types';
import { LocationDetector } from './location-detector';
import { GoogleMeetService } from './google-meet-service';

export class LocationServiceImpl implements LocationService {
  private googleMeetService: GoogleMeetService;

  constructor() {
    this.googleMeetService = new GoogleMeetService();
  }

  /**
   * Detect location from email content
   */
  detectLocation(emailContent: string): LocationDetectionResult {
    return LocationDetector.detectLocation(emailContent);
  }

  /**
   * Generate Google Meet link configuration
   */
  async generateGoogleMeetLink(): Promise<GoogleMeetConfig> {
    return this.googleMeetService.generateGoogleMeetConfig();
  }

  /**
   * Create calendar event with location enhancement
   */
  async createCalendarEventWithLocation(
    eventDetails: any,
    location: MeetingLocation
  ): Promise<CalendarEventWithLocation> {
    const baseEvent = {
      summary: eventDetails.summary,
      description: eventDetails.description,
      start: {
        dateTime: eventDetails.start_time,
        timeZone: eventDetails.timezone || 'America/Los_Angeles'
      },
      end: {
        dateTime: eventDetails.end_time,
        timeZone: eventDetails.timezone || 'America/Los_Angeles'
      },
      attendees: eventDetails.attendees?.map((email: string) => ({
        email: email.trim(),
        displayName: this.extractDisplayName(email)
      }))
    };

    if (location.type === 'physical' && location.address) {
      // Physical meeting - no Google Meet needed
      return {
        ...baseEvent,
        location: location.address
      };
    } else {
      // Virtual meeting - add Google Meet
      const meetConfig = await this.generateGoogleMeetLink();
      return {
        ...baseEvent,
        location: 'Virtual Meeting',
        conferenceData: meetConfig
      };
    }
  }

  /**
   * Determine the best location for a meeting based on email content
   */
  async determineBestLocation(emailContent: string): Promise<MeetingLocation> {
    const detectionResult = this.detectLocation(emailContent);

    // If we detected a physical location with decent confidence, use it
    if (detectionResult.location?.type === 'physical' && detectionResult.confidence >= 60) {
      console.log(`📍 Using detected physical location: ${detectionResult.location.address}`);
      return detectionResult.location;
    }

    // If virtual meeting was explicitly requested, use it
    if (detectionResult.location?.type === 'virtual') {
      console.log('💻 Using requested virtual meeting');
      return detectionResult.location;
    }

    // Default to virtual meeting with Google Meet
    console.log('🔗 Defaulting to virtual meeting with Google Meet');
    return {
      type: 'virtual',
      notes: 'Google Meet link will be generated automatically'
    };
  }

  /**
   * Create the actual calendar event using Google Calendar API
   */
  async createCalendarEvent(eventWithLocation: CalendarEventWithLocation): Promise<any> {
    if (eventWithLocation.conferenceData) {
      // Virtual meeting with Google Meet
      return await this.googleMeetService.createEventWithGoogleMeet({
        summary: eventWithLocation.summary,
        description: eventWithLocation.description,
        start: eventWithLocation.start,
        end: eventWithLocation.end,
        attendees: eventWithLocation.attendees,
        location: eventWithLocation.location
      });
    } else {
      // Physical meeting
      return await this.googleMeetService.createEventWithoutGoogleMeet({
        summary: eventWithLocation.summary,
        description: eventWithLocation.description,
        start: eventWithLocation.start,
        end: eventWithLocation.end,
        attendees: eventWithLocation.attendees,
        location: eventWithLocation.location || 'TBD'
      });
    }
  }

  /**
   * Validate that the location service is properly configured
   */
  async validateService(): Promise<boolean> {
    return await this.googleMeetService.validateService();
  }

  /**
   * Extract display name from email address
   */
  private extractDisplayName(email: string): string | undefined {
    const localPart = email.split('@')[0];
    return localPart.split('.').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
  }
}