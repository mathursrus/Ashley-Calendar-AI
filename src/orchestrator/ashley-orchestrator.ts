// Ashley Calendar AI Orchestrator - Replaces N8n workflow with unified TypeScript implementation

import * as dotenv from 'dotenv';
import { gmail_v1, google } from 'googleapis';
import { CalendarDataService } from '../calendar-services/calendar-data-service';
import { CalendarIntent, AshleyResponse } from '../../baml_client/types';
import { b } from '../../baml_client';
import { TimezoneDetector, TimezoneConverter, TimezoneInfo, ParticipantTimezone } from '../timezone/timezone-utils';
import { LocationServiceImpl } from '../location/location-service';
import { MeetingLocation, CalendarEventDetails } from '../calendar-services/calendar-types';

// Load environment variables
dotenv.config();

export interface EmailData {
  id: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  snippet: string;
  internalDate: string;
  threadId: string;
}

// Using BAML types - no need to duplicate interfaces

export class AshleyOrchestrator {
  private gmail: gmail_v1.Gmail;
  private calendarDataService: CalendarDataService;
  private locationService: LocationServiceImpl;
  private lastProcessedEmailId: string | null = null;

  constructor() {
    // Initialize Gmail API for Ashley's email account
    const auth = new google.auth.OAuth2(
      process.env.ASHLEY_GMAIL_CLIENT_ID,
      process.env.ASHLEY_GMAIL_CLIENT_SECRET,
      'http://localhost:3000/oauth/callback'
    );

    // Set credentials if available
    if (process.env.ASHLEY_GMAIL_REFRESH_TOKEN) {
      auth.setCredentials({
        refresh_token: process.env.ASHLEY_GMAIL_REFRESH_TOKEN,
        access_token: process.env.ASHLEY_GMAIL_ACCESS_TOKEN || null // This will be refreshed automatically
      });
      
      // Set up automatic token refresh
      auth.on('tokens', (tokens) => {
        if (tokens.refresh_token) {
          console.log('🔄 New refresh token received');
        }
        if (tokens.access_token) {
          console.log('🔄 Access token refreshed');
        }
      });
    } else {
      console.warn('⚠️ Gmail OAuth refresh token not found in environment variables');
    }

    this.gmail = google.gmail({ version: 'v1', auth });
    this.calendarDataService = new CalendarDataService();
    this.locationService = new LocationServiceImpl();
  }

  /**
   * Main orchestrator method - replaces the entire N8n workflow
   */
  async processIncomingEmails(): Promise<void> {
    console.log('🔄 Ashley Orchestrator: Checking for new emails...');

    try {
      // Step 1: Get new emails (replaces Gmail Trigger)
      const newEmails = await this.getNewEmails();
      
      if (newEmails.length === 0) {
        console.log('📭 No new emails to process');
        return;
      }

      console.log(`📧 Found ${newEmails.length} new email(s) to process`);

      // Process each email
      for (const email of newEmails) {
        await this.processEmail(email);
      }

    } catch (error) {
      console.error('❌ Error in Ashley Orchestrator:', error);
      throw error;
    }
  }

  /**
   * Process a single email through the complete workflow
   */
  private async processEmail(email: EmailData): Promise<void> {
    console.log(`📧 Processing email: ${email.subject} from ${email.from}`);

    try {
      // Step 1: Check if email is from Ashley herself (don't respond to self)
      if (this.isFromAshley(email)) {
        console.log('🚫 Skipping email from Ashley herself');
        return;
      }

      // Step 2: Detect timezone from email (NEW: timezone awareness)
      const emailHeaders = this.extractEmailHeaders(email);
      const emailContent = this.extractEmailContent(email);
      const senderTimezone = TimezoneDetector.detectTimezone(emailHeaders, emailContent);
      
      console.log(`🌍 Detected timezone: ${senderTimezone.detectedTimezone} (confidence: ${senderTimezone.confidence}, source: ${senderTimezone.source})`);

      // Step 3: Analyze email for calendar intent (replaces "Summarize Request")
      const calendarIntent = await this.analyzeCalendarIntentWithTimezone(email, senderTimezone);
      
      if (!calendarIntent.action_needed) {
        console.log('ℹ️ No action needed for this email');
        await this.logToAirtable(email, calendarIntent, null);
        return;
      }

      console.log(`📋 Action needed: ${calendarIntent.action_needed}`);

      // Step 4: Get calendar data based on timezone-aware times
      const startTime = calendarIntent.start_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const endTime = calendarIntent.end_time || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      // Get participant timezones for multi-timezone coordination
      const participantEmails = calendarIntent.participants?.split(',').map(p => p.trim()) || [];
      const participantTimezones = await Promise.all(
        participantEmails.map(async email => {
          // For now, use sender timezone as fallback for participants
          // In future, could implement participant timezone detection
          return {
            email,
            timezone: senderTimezone.detectedTimezone,
            confidence: senderTimezone.confidence * 0.8 // Slightly lower confidence for participants
          };
        })
      );

      const calendarData = await this.getSidCalendarData(startTime, endTime);
      
      // Step 5: Generate Ashley's response with timezone awareness
      const ashleyResponse = await this.generateAshleyResponseWithTimezone(
        calendarIntent, 
        calendarData, 
        senderTimezone,
        participantTimezones
      );

      // Step 6: Execute Ashley's response (send email, create calendar invite)
      await this.executeAshleyResponse(email, ashleyResponse);

      // Step 7: Log to Airtable
      await this.logToAirtable(email, calendarIntent, ashleyResponse);

    } catch (error) {
      console.error(`❌ Error processing email ${email.id}:`, error);
      await this.logErrorToAirtable(email, error);
    }
  }

  /**
   * Get new emails from Gmail (replaces Gmail Trigger + Get full email)
   */
  private async getNewEmails(): Promise<EmailData[]> {
    try {
      // Get list of messages (only new ones since last processed)
      const query = this.lastProcessedEmailId 
        ? `is:unread after:${this.lastProcessedEmailId}`
        : 'is:unread';

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 10
      });

      if (!response.data.messages || response.data.messages.length === 0) {
        return [];
      }

      // Get full message data for each email
      const emails: EmailData[] = [];
      for (const message of response.data.messages) {
        if (message.id) {
          const fullMessage = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });

          const emailData = this.parseEmailData(fullMessage.data);
          if (emailData) {
            emails.push(emailData);
          }
        }
      }

      // Update last processed email ID
      if (emails.length > 0) {
        this.lastProcessedEmailId = emails[emails.length - 1].id;
      }

      return emails;

    } catch (error) {
      console.error('❌ Error fetching emails from Gmail:', error);
      return [];
    }
  }

  /**
   * Parse Gmail API response into EmailData (replaces "Reconstruct body")
   */
  private parseEmailData(message: gmail_v1.Schema$Message): EmailData | null {
    if (!message.id || !message.payload?.headers) {
      return null;
    }

    const getHeader = (name: string) => 
      message.payload?.headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    return {
      id: message.id,
      from: getHeader('from'),
      to: getHeader('to'),
      cc: getHeader('cc'),
      subject: getHeader('subject'),
      snippet: message.snippet || '',
      internalDate: message.internalDate || '',
      threadId: message.threadId || ''
    };
  }

  /**
   * Extract plain text from email payload (replaces N8n code node logic)
   */
  private extractPlainTextFromPayload(payload: gmail_v1.Schema$MessagePart): string {
    let text = '';

    // Helper function to decode base64
    const decodeBase64 = (str: string): string => {
      return Buffer.from(str, 'base64').toString('utf-8');
    };

    if (payload.body?.data) {
      // Direct text content
      text += decodeBase64(payload.body.data);
    }

    if (payload.parts) {
      // Multi-part message
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          text += decodeBase64(part.body.data);
        } else if (part.parts) {
          // Nested parts
          text += this.extractPlainTextFromPayload(part);
        }
      }
    }

    return text;
  }

  /**
   * Clean email text (replaces N8n cleanText function)
   */
  private cleanEmailText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s*>.*$/gm, '') // Remove quoted text
      .replace(/^\s*On .* wrote:.*$/gm, '') // Remove "On ... wrote:" lines
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Check if email is from Ashley herself (replaces "Don't respond to self")
   */
  private isFromAshley(email: EmailData): boolean {
    const ashleyEmails = ['ashley@example.com', 'sid.mathur@gmail.com']; // Add Ashley's actual emails
    return ashleyEmails.some(ashleyEmail => 
      email.from.toLowerCase().includes(ashleyEmail.toLowerCase())
    );
  }

  /**
   * Extract email headers for timezone detection
   */
  private extractEmailHeaders(email: EmailData): Record<string, string> {
    return {
      'X-Originating-IP': '', // Would be extracted from full headers if available
      'Received': '',
      'Date': email.internalDate,
      'From': email.from,
      'To': email.to
    };
  }

  /**
   * Extract email content for timezone detection
   */
  private extractEmailContent(email: EmailData): string {
    // For now, use snippet. In full implementation, would extract full body
    return this.cleanEmailText(email.snippet + ' ' + email.subject);
  }

  /**
   * Analyze email for calendar intent with timezone awareness
   */
  private async analyzeCalendarIntentWithTimezone(
    email: EmailData,
    senderTimezone: TimezoneInfo
  ): Promise<CalendarIntent> {
    const emailText = this.formatEmailForBAML(email);
    
    // Include timezone context in the analysis
    const timezoneContext = `
Sender timezone: ${senderTimezone.detectedTimezone} (confidence: ${senderTimezone.confidence}%)
Timezone detection source: ${senderTimezone.source}
Current time in sender's timezone: ${new Date().toLocaleString('en-US', { timeZone: senderTimezone.detectedTimezone })}
`;

    const enhancedEmailText = timezoneContext + '\n\n' + emailText;
    
    const response = await b.CalendarIntentAnalyzer(enhancedEmailText);
    return response;
  }

  /**
   * Generate Ashley's response with timezone awareness
   */
  private async generateAshleyResponseWithTimezone(
    calendarIntent: CalendarIntent,
    calendarData: string,
    senderTimezone: TimezoneInfo,
    participantTimezones: ParticipantTimezone[]
  ): Promise<AshleyResponse> {
    // Convert times to multiple timezones if needed
    let timezonedTimes: any[] = [];
    
    if (calendarIntent.start_time && calendarIntent.end_time) {
      const startTime = new Date(calendarIntent.start_time);
      const endTime = new Date(calendarIntent.end_time);
      
      // Convert to all participant timezones
      const uniqueTimezones = [...new Set([
        senderTimezone.detectedTimezone,
        ...participantTimezones.map(pt => pt.timezone)
      ])];
      
      timezonedTimes = uniqueTimezones.map(tz => ({
        timezone: tz,
        start: TimezoneConverter.convertToTimezone(startTime, tz),
        end: TimezoneConverter.convertToTimezone(endTime, tz),
        formatted_start: startTime.toLocaleString('en-US', { timeZone: tz }),
        formatted_end: endTime.toLocaleString('en-US', { timeZone: tz })
      }));
    }

    // Enhance calendar data with timezone information
    const enhancedCalendarData = this.enhanceCalendarDataWithTimezones(
      calendarData, 
      timezonedTimes, 
      participantTimezones
    );
    
    const response = await b.AshleyCalendarAssistant(calendarIntent, enhancedCalendarData);
    
    return response;
  }

  /**
   * Format email for BAML analysis
   */
  private formatEmailForBAML(email: EmailData): string {
    return `
From: ${email.from}
To: ${email.to}
Subject: ${email.subject}
Content: ${email.snippet}
    `.trim();
  }

  /**
   * Check if email content has explicit timezone mentions
   */
  private hasExplicitTimezoneInContent(content: string): boolean {
    const timezonePatterns = [
      /\b(PST|PDT|EST|EDT|CST|CDT|MST|MDT)\b/i,
      /\b(Pacific|Eastern|Central|Mountain)\s+(Standard|Daylight)\s+Time\b/i,
      /\b(UTC|GMT)[+-]?\d{1,2}\b/i,
      /\btimezone\b/i
    ];
    
    return timezonePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Enhance calendar data with timezone information for multi-participant coordination
   */
  private enhanceCalendarDataWithTimezones(
    calendarData: string,
    timezonedTimes: any[],
    participantTimezones: ParticipantTimezone[]
  ): string {
    let enhanced = calendarData;
    
    if (timezonedTimes.length > 1) {
      enhanced += '\n\nMEETING TIMES IN PARTICIPANT TIMEZONES:\n';
      timezonedTimes.forEach(tt => {
        enhanced += `- ${tt.timezone}: ${tt.formatted_start} - ${tt.formatted_end}\n`;
      });
    }
    
    if (participantTimezones.length > 0) {
      enhanced += '\n\nPARTICIPANT TIMEZONE INFO:\n';
      participantTimezones.forEach(pt => {
        enhanced += `- ${pt.email}: ${pt.timezone} (confidence: ${pt.confidence}%)\n`;
      });
    }
    
    return enhanced;
  }

  /**
   * Analyze email for calendar intent using BAML (replaces "Summarize Request")
   */
  private async analyzeCalendarIntent(email: EmailData): Promise<CalendarIntent> {
    const emailText = this.formatEmailForBAML(email);
    const response = await b.CalendarIntentAnalyzer(emailText);
    return response;
  }

  /**
   * Get Sid's calendar data (replaces "Get Availability" + "Aggregate")
   */
  private async getSidCalendarData(startTime: string, endTime: string): Promise<string> {
    try {
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);

      console.log(`📅 Getting Sid's calendar data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Get Sid's availability using the calendar data service
      const availabilityResult = await this.calendarDataService.getAvailability(
        ['sid.mathur@gmail.com'], // Sid's email
        startDate,
        endDate
      );

      // Format the result for BAML
      let formattedData = `AVAILABILITY SUMMARY:\n${availabilityResult.summary}\n\n`;
      
      if (availabilityResult.commonAvailableSlots.length > 0) {
        formattedData += 'AVAILABLE TIME SLOTS:\n';
        availabilityResult.commonAvailableSlots.forEach((slot, index) => {
          formattedData += `${index + 1}. ${slot.start.toLocaleString()} - ${slot.end.toLocaleString()} (${slot.duration} minutes)\n`;
        });
      } else {
        formattedData += 'No common available slots found in the requested time range.\n';
      }

      if (availabilityResult.requiresManualCoordination.length > 0) {
        formattedData += `\nREQUIRES MANUAL COORDINATION: ${availabilityResult.requiresManualCoordination.join(', ')}\n`;
      }

      return formattedData;

    } catch (error) {
      console.error('❌ Error getting Sid\'s calendar data:', error);
      return `Error retrieving calendar data: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Get participant calendar data using our new calendar service
   */
  private async getParticipantCalendarData(
    participants: string,
    startTime: string,
    endTime: string
  ): Promise<string> {
    try {
      const participantEmails = participants.split(',').map(email => email.trim());
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);

      const availabilityResult = await this.calendarDataService.getAvailability(
        participantEmails,
        startDate,
        endDate
      );

      return availabilityResult.summary;

    } catch (error) {
      console.error('❌ Error getting participant calendar data:', error);
      return `Error retrieving participant data: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Generate Ashley's response using BAML (replaces "Construct email and invite")
   */
  private async generateAshleyResponse(
    calendarIntent: CalendarIntent,
    calendarData: string
  ): Promise<AshleyResponse> {
    const response = await b.AshleyCalendarAssistant(calendarIntent, calendarData);
    
    // Return the response directly - no need to transform since it's already the right type
    return response;
  }

  /**
   * Execute Ashley's response (send email, create calendar invite)
   */
  private async executeAshleyResponse(email: EmailData, response: AshleyResponse): Promise<void> {
    console.log(`🎬 Executing Ashley's response: ${response.action}`);

    // Send email response
    if (response.email_response && response.action !== 'NoAction') {
      await this.sendEmailResponse(email, response.email_response);
    }

    // Create calendar invite if needed
    if (response.send_calendar_invite && response.action === 'BookTime') {
      await this.createCalendarInviteWithLocation(email, response);
    }
  }

  /**
   * Send email response via Gmail
   */
  private async sendEmailResponse(originalEmail: EmailData, responseText: string): Promise<void> {
    try {
      const emailContent = [
        `To: ${originalEmail.from}`,
        `Subject: Re: ${originalEmail.subject}`,
        `In-Reply-To: ${originalEmail.id}`,
        `References: ${originalEmail.id}`,
        '',
        responseText
      ].join('\n');

      const encodedMessage = Buffer.from(emailContent).toString('base64url');

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
          threadId: originalEmail.threadId
        }
      });

      console.log('📤 Email response sent successfully');

    } catch (error) {
      console.error('❌ Error sending email response:', error);
    }
  }

  /**
   * Create calendar invite with location enhancement
   */
  private async createCalendarInviteWithLocation(email: EmailData, response: AshleyResponse): Promise<void> {
    try {
      console.log('📅 Creating calendar invite with location enhancement...');

      // Extract email content for location detection
      const emailContent = this.extractEmailContent(email);
      const participantEmails = response.participants_to_invite?.split(',').map(p => p.trim()) || [];

      // Detect location with context awareness
      const locationResult = await this.locationService.detectLocationWithContext(
        emailContent,
        email.from,
        participantEmails
      );

      console.log(`📍 Location detection result: ${locationResult.location?.type || 'none'} (confidence: ${locationResult.confidence}%)`);

      // Determine the best location for this meeting
      const bestLocation = await this.locationService.determineBestLocation(
        emailContent,
        participantEmails.length + 1 // +1 for sender
      );

      // Create calendar event details
      const eventDetails: CalendarEventDetails = {
        summary: response.calendar_invite_subject || 'Meeting',
        description: response.email_response || 'Meeting scheduled by Ashley',
        start_time: response.meeting_start_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_time: response.meeting_end_time || new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        timezone: 'America/Los_Angeles', // Could be enhanced with timezone detection
        attendees: [email.from, ...participantEmails],
        location: bestLocation
      };

      // Create calendar event with location
      const calendarEvent = await this.locationService.createCalendarEventWithLocation(
        eventDetails,
        bestLocation
      );

      // Create the actual calendar event
      const createdEvent = await this.locationService.createCalendarEvent(calendarEvent);

      console.log('✅ Calendar invite created successfully with location enhancement');
      console.log(`   Event ID: ${createdEvent.id}`);
      console.log(`   Location Type: ${bestLocation.type}`);
      if (bestLocation.type === 'physical') {
        console.log(`   Address: ${bestLocation.address}`);
      } else {
        console.log(`   Google Meet Link: ${createdEvent.conferenceData?.entryPoints?.[0]?.uri || 'Will be generated'}`);
      }

    } catch (error) {
      console.error('❌ Error creating calendar invite with location:', error);
      // Fallback to basic calendar invite creation
      await this.createBasicCalendarInvite(response);
    }
  }

  /**
   * Fallback method for basic calendar invite creation
   */
  private async createBasicCalendarInvite(response: AshleyResponse): Promise<void> {
    try {
      console.log('📅 Creating basic calendar invite (fallback)...');
      console.log(`   Subject: ${response.calendar_invite_subject}`);
      console.log(`   Start: ${response.meeting_start_time}`);
      console.log(`   End: ${response.meeting_end_time}`);
      console.log(`   Participants: ${response.participants_to_invite}`);

      // This would be implemented with basic Google Calendar API calls
      // For now, just log the details
      console.log('⚠️ Basic calendar invite creation not yet fully implemented');

    } catch (error) {
      console.error('❌ Error creating basic calendar invite:', error);
    }
  }

  /**
   * Log interaction to Airtable (replaces Airtable node)
   */
  private async logToAirtable(
    email: EmailData,
    calendarIntent: CalendarIntent,
    ashleyResponse: AshleyResponse | null
  ): Promise<void> {
    try {
      // TODO: Implement Airtable logging
      console.log('📊 Logging to Airtable (not yet implemented)');
      console.log(`   Email ID: ${email.id}`);
      console.log(`   Action needed: ${calendarIntent.action_needed}`);
      if (ashleyResponse) {
        console.log(`   Ashley action: ${ashleyResponse.action}`);
      }

    } catch (error) {
      console.error('❌ Error logging to Airtable:', error);
    }
  }

  /**
   * Log errors to Airtable for review
   */
  private async logErrorToAirtable(email: EmailData, error: any): Promise<void> {
    try {
      console.log('🚨 Logging error to Airtable (not yet implemented)');
      console.log(`   Email ID: ${email.id}`);
      console.log(`   Error: ${error.message}`);

    } catch (logError) {
      console.error('❌ Error logging error to Airtable:', logError);
    }
  }

  /**
   * Start the orchestrator with polling (replaces N8n trigger)
   */
  async start(intervalMinutes: number = 1): Promise<void> {
    console.log(`🚀 Ashley Orchestrator started (checking every ${intervalMinutes} minute(s))`);

    // Process emails immediately
    await this.processIncomingEmails();

    // Set up polling interval
    setInterval(async () => {
      await this.processIncomingEmails();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Process emails once and exit (for testing)
   */
  async runOnce(): Promise<void> {
    console.log('🔄 Ashley Orchestrator: Running once...');
    await this.processIncomingEmails();
    console.log('✅ Ashley Orchestrator: Complete');
  }
}