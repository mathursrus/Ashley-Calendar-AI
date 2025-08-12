// Main location service that orchestrates location detection and Google Meet integration

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
        location: location.address || 'Virtual Meeting',
        conferenceData: meetConfig
      };
    }
  }

  /**
   * Determine the best location for a meeting based on email content and context
   */
  async determineBestLocation(
    emailContent: string,
    participantCount: number = 1
  ): Promise<MeetingLocation> {
    const detectionResult = this.detectLocation(emailContent);

    // If we detected a physical location with high confidence, use it
    if (detectionResult.location?.type === 'physical' && detectionResult.confidence >= 70) {
      console.log(`📍 Using detected physical location: ${detectionResult.location.address}`);
      return detectionResult.location;
    }

    // If virtual meeting was explicitly requested, use it
    if (detectionResult.location?.type === 'virtual') {
      console.log('💻 Using requested virtual meeting');
      return detectionResult.location;
    }

    // Default to virtual meeting with Google Meet for convenience
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
    // Simple extraction - could be enhanced with contact lookup
    const localPart = email.split('@')[0];
    return localPart.split('.').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
  }

  /**
   * Enhanced location detection with context awareness
   */
  async detectLocationWithContext(
    emailContent: string,
    senderEmail: string,
    participantEmails: string[]
  ): Promise<LocationDetectionResult> {
    const baseResult = this.detectLocation(emailContent);

    // Enhance confidence based on context
    let enhancedConfidence = baseResult.confidence;
    const enhancedKeywords = [...baseResult.detectedKeywords];

    // If sender is from same domain as participants, physical meetings more likely
    const senderDomain = senderEmail.split('@')[1];
    const participantDomains = participantEmails.map(email => email.split('@')[1]);
    const sameDomainCount = participantDomains.filter(domain => domain === senderDomain).length;
    
    if (sameDomainCount > 0 && baseResult.location?.type === 'physical') {
      enhancedConfidence += 10;
      enhancedKeywords.push('same-domain-participants');
    }

    // If many external participants, virtual meetings more likely
    if (participantEmails.length > 3 && !baseResult.location) {
      return {
        location: {
          type: 'virtual',
          notes: 'Large meeting - defaulting to virtual'
        },
        confidence: 75,
        detectedKeywords: ['large-meeting', ...enhancedKeywords],
        source: 'default'
      };
    }

    return {
      ...baseResult,
      confidence: Math.min(enhancedConfidence, 95),
      detectedKeywords: enhancedKeywords
    };
  }
}