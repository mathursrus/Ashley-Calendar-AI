// Google Calendar API service implementation

import { CalendarService, FreeBusyResult, BusySlot } from './calendar-types';

export class GoogleCalendarService implements CalendarService {
  private apiKey: string | undefined;
  private serviceAccountPath: string | undefined;
  private useRealApi: boolean;

  constructor() {
    this.apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
    this.serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
    // Enable real API if credentials are available
    this.useRealApi = !!(this.apiKey || this.serviceAccountPath);
  }

  async getFreeBusy(
    email: string,
    startTime: Date,
    endTime: Date
  ): Promise<FreeBusyResult> {
    try {
      // Check if we have credentials configured
      if (!this.apiKey && !this.serviceAccountPath) {
        return {
          email,
          status: 'access_denied',
          errorMessage: 'Google Calendar API credentials not configured'
        };
      }

      // Use real API if credentials are available, otherwise use mock
      if (this.useRealApi) {
        console.log(`🔗 Attempting real Google Calendar API call for ${email}...`);
        const realResult = await this.realGoogleCalendarCall(email, startTime, endTime);
        return realResult;
      } else {
        console.log(`🎭 Using mock Google Calendar data for ${email}...`);
        const mockResult = await this.mockGoogleCalendarCall(email, startTime, endTime);
        return mockResult;
      }

    } catch (error) {
      return {
        email,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async mockGoogleCalendarCall(
    email: string,
    startTime: Date,
    endTime: Date
  ): Promise<FreeBusyResult> {
    // Simulate different scenarios based on email domain
    if (email.includes('@company.com')) {
      // Simulate successful API access for company emails
      const busySlots: BusySlot[] = [
        {
          start: new Date('2025-08-13T10:00:00-07:00'),
          end: new Date('2025-08-13T11:00:00-07:00'),
          status: 'busy'
        },
        {
          start: new Date('2025-08-13T14:00:00-07:00'),
          end: new Date('2025-08-13T15:30:00-07:00'),
          status: 'busy'
        }
      ];

      return {
        email,
        status: 'success',
        busySlots
      };
    } else {
      // Simulate access denied for external emails
      return {
        email,
        status: 'access_denied',
        errorMessage: 'Calendar sharing not enabled for external participant'
      };
    }
  }

  // Real Google Calendar API implementation
  private async realGoogleCalendarCall(
    email: string,
    startTime: Date,
    endTime: Date
  ): Promise<FreeBusyResult> {
    const { google } = require('googleapis');
    
    try {
      // Initialize auth (API key or service account)
      let auth;
      if (this.serviceAccountPath) {
        auth = new google.auth.GoogleAuth({
          keyFile: this.serviceAccountPath,
          scopes: ['https://www.googleapis.com/auth/calendar.freebusy']
        });
      } else if (this.apiKey) {
        auth = this.apiKey;
      } else {
        throw new Error('No valid authentication method available');
      }

      const calendar = google.calendar({ version: 'v3', auth });

      console.log(`📡 Making Google Calendar API request for ${email}...`);
      console.log(`   Time range: ${startTime.toISOString()} to ${endTime.toISOString()}`);

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          items: [{ id: email }]
        }
      });

      console.log(`📊 API Response received for ${email}`);
      
      // Check if the calendar was found and accessible
      const calendarData = response.data.calendars?.[email];
      if (!calendarData) {
        return {
          email,
          status: 'not_found',
          errorMessage: `Calendar not found or not accessible: ${email}`
        };
      }

      // Check for errors in the response
      if (calendarData.errors && calendarData.errors.length > 0) {
        const error = calendarData.errors[0];
        return {
          email,
          status: 'access_denied',
          errorMessage: `Calendar access error: ${error.reason || 'Unknown error'}`
        };
      }

      // Parse busy slots
      const busySlots: BusySlot[] = calendarData.busy?.map((slot: any) => ({
        start: new Date(slot.start || ''),
        end: new Date(slot.end || ''),
        status: 'busy' as const
      })) || [];

      console.log(`✅ Found ${busySlots.length} busy slots for ${email}`);

      return {
        email,
        status: 'success',
        busySlots
      };

    } catch (error: any) {
      console.log(`❌ Google Calendar API error for ${email}:`, error.message);
      
      if (error.code === 403) {
        return {
          email,
          status: 'access_denied',
          errorMessage: 'Calendar access denied - insufficient permissions'
        };
      }
      
      if (error.code === 404) {
        return {
          email,
          status: 'not_found',
          errorMessage: 'Calendar not found'
        };
      }
      
      return {
        email,
        status: 'error',
        errorMessage: `API error: ${error.message}`
      };
    }
  }
}
