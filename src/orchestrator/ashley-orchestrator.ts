import { google } from 'googleapis';
import { ExtractCalendarIntent, GenerateEmailResponse } from '../../baml_client';
import { CalendarIntent } from '../../baml_client/types';
import { TimezoneDetector, TimezoneConverter, TimezoneInfo, ParticipantTimezone } from '../timezone/timezone-utils';
import * as moment from 'moment-timezone';

interface EmailData {
  from: string;
  to: string;
  subject: string;
  body: string;
  headers: Record<string, string>;
  timestamp: Date;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: { email: string; displayName?: string }[];
  location?: string;
  description?: string;
}

export class AshleyOrchestrator {
  private calendar: any;
  private readonly SID_TIMEZONE = 'America/Los_Angeles';

  constructor() {
    // Initialize Google Calendar client
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  /**
   * Main entry point for processing incoming emails
   */
  async processEmail(email: EmailData): Promise<void> {
    try {
      console.log(`Processing email from ${email.from}: ${email.subject}`);
      
      // Step 1: Detect sender's timezone
      const senderTimezone = TimezoneDetector.detectTimezone(email.headers, email.body);
      console.log(`Detected sender timezone: ${senderTimezone.detectedTimezone} (confidence: ${senderTimezone.confidence}, source: ${senderTimezone.source})`);

      // Step 2: Extract calendar intent with timezone awareness
      const calendarIntent = await this.analyzeCalendarIntentWithTimezone(email, senderTimezone);
      
      if (!calendarIntent || calendarIntent.action === 'QUERY') {
        console.log('No actionable calendar intent detected');
        return;
      }

      // Step 3: Extract participants and detect their timezones
      const participants = this.extractParticipants(email, calendarIntent);
      const participantTimezones = TimezoneDetector.detectParticipantTimezones(
        participants, 
        email.headers, 
        email.body
      );

      // Step 4: Convert times to Sid's timezone for calendar operations
      let convertedStartTime = calendarIntent.timerange_start;
      let convertedEndTime = calendarIntent.timerange_end;

      if (calendarIntent.timerange_start && calendarIntent.timerange_end) {
        convertedStartTime = TimezoneConverter.convertToSidTimezone(
          calendarIntent.timerange_start,
          senderTimezone.detectedTimezone
        );
        convertedEndTime = TimezoneConverter.convertToSidTimezone(
          calendarIntent.timerange_end,
          senderTimezone.detectedTimezone
        );
        
        console.log(`Converted times: ${calendarIntent.timerange_start} (${senderTimezone.detectedTimezone}) -> ${convertedStartTime} (${this.SID_TIMEZONE})`);
      }

      // Step 5: Get Sid's calendar data using converted times
      const calendarData = convertedStartTime && convertedEndTime 
        ? await this.getSidCalendarData(convertedStartTime, convertedEndTime)
        : '';

      // Step 6: Get participant calendar data (if available)
      const participantCalendarData = await this.getParticipantCalendarData(
        participantTimezones,
        convertedStartTime,
        convertedEndTime
      );

      // Step 7: Handle the calendar action with timezone awareness
      await this.handleCalendarAction(
        calendarIntent,
        convertedStartTime,
        convertedEndTime,
        senderTimezone,
        participantTimezones
      );

      // Step 8: Generate and send timezone-aware response
      const ashleyResponse = await this.generateAshleyResponseWithTimezone(
        calendarIntent,
        calendarData + participantCalendarData,
        senderTimezone,
        participantTimezones
      );

      await this.sendEmailResponse(email.from, email.subject, ashleyResponse);
      
      console.log('Email processed successfully with timezone awareness');
    } catch (error) {
      console.error('Error processing email:', error);
      // Send error response to user
      await this.sendErrorResponse(email.from, email.subject, error);
    }
  }

  /**
   * Analyze calendar intent with timezone context
   */
  private async analyzeCalendarIntentWithTimezone(
    email: EmailData, 
    senderTimezone: TimezoneInfo
  ): Promise<CalendarIntent> {
    const intent = await ExtractCalendarIntent(email.body, email.from, email.subject);
    
    // Enhance intent with timezone information
    intent.requestor_timezone = senderTimezone.detectedTimezone;
    intent.timezone_confidence = senderTimezone.confidence;
    intent.timezone_source = senderTimezone.source;
    intent.explicit_timezone_mentioned = this.hasExplicitTimezoneReference(email.body);
    
    return intent;
  }

  /**
   * Extract participants from email and calendar intent
   */
  private extractParticipants(email: EmailData, intent: CalendarIntent): string[] {
    const participants = new Set<string>();
    
    // Add attendees from intent
    if (intent.attendees) {
      intent.attendees.forEach(attendee => participants.add(attendee));
    }
    
    // Add CC recipients from email headers
    if (email.headers['Cc']) {
      const ccEmails = email.headers['Cc'].split(',').map(e => e.trim());
      ccEmails.forEach(email => participants.add(email));
    }
    
    // Add sender
    participants.add(email.from);
    
    // Remove Sid's email and Ashley's email
    participants.delete('sid.mathur@gmail.com');
    participants.delete('ashley@sidmathur.com');
    
    return Array.from(participants);
  }

  /**
   * Check if email content has explicit timezone references
   */
  private hasExplicitTimezoneReference(emailContent: string): boolean {
    const explicitPatterns = [
      /\b(PST|EST|CST|MST|GMT|UTC|BST|CET|JST|IST|AEST)\b/i,
      /\b(Pacific|Eastern|Central|Mountain)\s+time\b/i,
      /\b(GMT|UTC)[+-]\d{1,2}\b/i,
      /\b\d{1,2}:\d{2}\s*(AM|PM)?\s+(PST|EST|CST|MST|GMT|UTC|BST|CET|JST|IST|AEST)\b/i
    ];
    
    return explicitPatterns.some(pattern => pattern.test(emailContent));
  }

  /**
   * Get Sid's calendar data for the specified time range (in Sid's timezone)
   */
  private async getSidCalendarData(startTime: string, endTime: string): Promise<string> {
    try {
      const timeMin = new Date(startTime).toISOString();
      const timeMax = new Date(endTime).toISOString();

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      
      if (events.length === 0) {
        return `Sid is available from ${startTime} to ${endTime} (${this.SID_TIMEZONE})`;
      }

      const eventSummaries = events.map((event: GoogleCalendarEvent) => {
        const start = event.start?.dateTime || event.start?.date;
        const end = event.end?.dateTime || event.end?.date;
        return `${event.summary}: ${start} - ${end}`;
      });

      return `Sid's calendar for ${startTime} to ${endTime} (${this.SID_TIMEZONE}):\n${eventSummaries.join('\n')}`;
    } catch (error) {
      console.error('Error fetching Sid\'s calendar data:', error);
      return `Unable to fetch calendar data for ${startTime} to ${endTime}`;
    }
  }

  /**
   * Get participant calendar data (placeholder for future implementation)
   */
  private async getParticipantCalendarData(
    participantTimezones: ParticipantTimezone[],
    startTime?: string,
    endTime?: string
  ): Promise<string> {
    // TODO: Implement participant calendar integration
    // This would require access to participants' calendars or calendar systems
    
    if (!startTime || !endTime || participantTimezones.length === 0) {
      return '';
    }
    
    const timezoneInfo = participantTimezones.map(p => 
      `${p.email}: ${p.timezone.detectedTimezone}`
    ).join(', ');
    
    return `\n\nParticipant timezones: ${timezoneInfo}`;
  }

  /**
   * Handle different calendar actions with timezone awareness
   */
  private async handleCalendarAction(
    intent: CalendarIntent,
    startTime?: string,
    endTime?: string,
    senderTimezone?: TimezoneInfo,
    participantTimezones?: ParticipantTimezone[]
  ): Promise<void> {
    switch (intent.action) {
      case 'SCHEDULE':
        if (startTime && endTime) {
          await this.createCalendarEventWithTimezone(intent, startTime, endTime, senderTimezone, participantTimezones);
        }
        break;
      
      case 'RESCHEDULE':
        // TODO: Implement rescheduling with timezone awareness
        console.log('Reschedule action detected - implementation pending');
        break;
      
      case 'CANCEL':
        // TODO: Implement cancellation
        console.log('Cancel action detected - implementation pending');
        break;
      
      default:
        console.log(`Action ${intent.action} does not require calendar modification`);
    }
  }

  /**
   * Create calendar event with timezone awareness
   */
  private async createCalendarEventWithTimezone(
    intent: CalendarIntent,
    startTime: string,
    endTime: string,
    senderTimezone?: TimezoneInfo,
    participantTimezones?: ParticipantTimezone[]
  ): Promise<void> {
    try {
      // Convert times to proper ISO format for Google Calendar
      const startDateTime = moment.tz(startTime, 'YYYY-MM-DD HH:mm', this.SID_TIMEZONE).toISOString();
      const endDateTime = moment.tz(endTime, 'YYYY-MM-DD HH:mm', this.SID_TIMEZONE).toISOString();

      // Build attendees list
      const attendees = intent.attendees?.map(email => ({ email })) || [];

      // Create timezone-aware description
      let description = intent.description || '';
      if (senderTimezone && participantTimezones) {
        description += this.buildTimezoneDescription(startTime, endTime, senderTimezone, participantTimezones);
      }

      const event = {
        summary: intent.title || 'Meeting',
        start: {
          dateTime: startDateTime,
          timeZone: this.SID_TIMEZONE,
        },
        end: {
          dateTime: endDateTime,
          timeZone: this.SID_TIMEZONE,
        },
        attendees,
        location: intent.location,
        description,
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      console.log(`Calendar event created: ${response.data.id}`);
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * Build timezone description for calendar events
   */
  private buildTimezoneDescription(
    startTime: string,
    endTime: string,
    senderTimezone: TimezoneInfo,
    participantTimezones: ParticipantTimezone[]
  ): string {
    let timezoneInfo = '\n\n--- Timezone Information ---\n';
    
    // Show time in sender's timezone
    if (senderTimezone.detectedTimezone !== this.SID_TIMEZONE) {
      const senderStartTime = TimezoneConverter.convertTime(startTime, this.SID_TIMEZONE, senderTimezone.detectedTimezone);
      const senderEndTime = TimezoneConverter.convertTime(endTime, this.SID_TIMEZONE, senderTimezone.detectedTimezone);
      timezoneInfo += `Sender's time: ${senderStartTime} - ${senderEndTime} (${senderTimezone.detectedTimezone})\n`;
    }
    
    // Show time in participant timezones
    const uniqueTimezones = new Set(participantTimezones.map(p => p.timezone.detectedTimezone));
    uniqueTimezones.forEach(timezone => {
      if (timezone !== this.SID_TIMEZONE && timezone !== senderTimezone.detectedTimezone) {
        const participantStartTime = TimezoneConverter.convertTime(startTime, this.SID_TIMEZONE, timezone);
        const participantEndTime = TimezoneConverter.convertTime(endTime, this.SID_TIMEZONE, timezone);
        timezoneInfo += `${timezone}: ${participantStartTime} - ${participantEndTime}\n`;
      }
    });
    
    return timezoneInfo;
  }

  /**
   * Generate Ashley's response with timezone awareness
   */
  private async generateAshleyResponseWithTimezone(
    intent: CalendarIntent,
    calendarData: string,
    senderTimezone: TimezoneInfo,
    participantTimezones: ParticipantTimezone[]
  ): Promise<string> {
    const senderTimezoneStr = senderTimezone.detectedTimezone;
    const participantTimezoneStrs = participantTimezones.map(p => p.timezone.detectedTimezone);
    
    return await GenerateEmailResponse(
      intent,
      calendarData,
      senderTimezoneStr,
      participantTimezoneStrs
    );
  }

  /**
   * Send email response
   */
  private async sendEmailResponse(to: string, originalSubject: string, response: string): Promise<void> {
    // TODO: Implement email sending functionality
    console.log(`Would send email to ${to}:`);
    console.log(`Subject: Re: ${originalSubject}`);
    console.log(`Body: ${response}`);
  }

  /**
   * Send error response
   */
  private async sendErrorResponse(to: string, originalSubject: string, error: unknown): Promise<void> {
    const errorMessage = `I encountered an error processing your calendar request. Please try again or contact Sid directly.`;
    await this.sendEmailResponse(to, originalSubject, errorMessage);
  }
}