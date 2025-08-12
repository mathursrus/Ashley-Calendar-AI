// Google Meet integration service for calendar invites

import { google } from 'googleapis';
import { GoogleMeetConfig } from './location-types';
import { v4 as uuidv4 } from 'uuid';

export class GoogleMeetService {
  private calendar: any;

  constructor() {
    // Initialize Google Calendar API with the same auth as the orchestrator
    const auth = new google.auth.OAuth2(
      process.env.ASHLEY_GMAIL_CLIENT_ID,
      process.env.ASHLEY_GMAIL_CLIENT_SECRET,
      'http://localhost:3000/oauth/callback'
    );

    // Set credentials if available
    if (process.env.ASHLEY_GMAIL_REFRESH_TOKEN) {
      auth.setCredentials({
        refresh_token: process.env.ASHLEY_GMAIL_REFRESH_TOKEN,
        access_token: process.env.ASHLEY_GMAIL_ACCESS_TOKEN || null
      });
    }

    this.calendar = google.calendar({ version: 'v3', auth });
  }

  /**
   * Generate Google Meet configuration for calendar event
   */
  generateGoogleMeetConfig(): GoogleMeetConfig {
    return {
      createRequest: {
        requestId: uuidv4(),
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    };
  }

  /**
   * Create a calendar event with Google Meet link
   */
  async createEventWithGoogleMeet(eventDetails: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    attendees?: Array<{ email: string; displayName?: string }>;
    location?: string;
  }): Promise<any> {
    try {
      const meetConfig = this.generateGoogleMeetConfig();
      
      const event = {
        summary: eventDetails.summary,
        description: eventDetails.description,
        start: eventDetails.start,
        end: eventDetails.end,
        attendees: eventDetails.attendees?.map(attendee => ({
          email: attendee.email,
          displayName: attendee.displayName
        })),
        location: eventDetails.location,
        conferenceData: meetConfig,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 15 }       // 15 minutes before
          ]
        }
      };

      console.log('📅 Creating calendar event with Google Meet...');
      
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1, // Required for conference data
        sendUpdates: 'all' // Send invites to all attendees
      });

      console.log('✅ Calendar event created successfully');
      console.log(`   Event ID: ${response.data.id}`);
      console.log(`   Google Meet Link: ${response.data.conferenceData?.entryPoints?.[0]?.uri || 'Not available'}`);

      return response.data;

    } catch (error) {
      console.error('❌ Error creating calendar event with Google Meet:', error);
      throw error;
    }
  }

  /**
   * Create a calendar event without Google Meet (physical location only)
   */
  async createEventWithoutGoogleMeet(eventDetails: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    attendees?: Array<{ email: string; displayName?: string }>;
    location: string;
  }): Promise<any> {
    try {
      const event = {
        summary: eventDetails.summary,
        description: eventDetails.description,
        start: eventDetails.start,
        end: eventDetails.end,
        attendees: eventDetails.attendees?.map(attendee => ({
          email: attendee.email,
          displayName: attendee.displayName
        })),
        location: eventDetails.location,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 15 }       // 15 minutes before
          ]
        }
      };

      console.log('📅 Creating calendar event with physical location...');
      
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        sendUpdates: 'all' // Send invites to all attendees
      });

      console.log('✅ Calendar event created successfully');
      console.log(`   Event ID: ${response.data.id}`);
      console.log(`   Location: ${eventDetails.location}`);

      return response.data;

    } catch (error) {
      console.error('❌ Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * Validate Google Meet service availability
   */
  async validateService(): Promise<boolean> {
    try {
      // Test calendar access
      await this.calendar.calendarList.list({ maxResults: 1 });
      return true;
    } catch (error) {
      console.error('❌ Google Meet service validation failed:', error);
      return false;
    }
  }
}