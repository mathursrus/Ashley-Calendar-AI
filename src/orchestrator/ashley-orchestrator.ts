// Ashley Calendar AI Orchestrator - Replaces N8n workflow with unified TypeScript implementation

import * as dotenv from 'dotenv';
import { gmail_v1, google } from 'googleapis';
import { CalendarDataService } from '../calendar-services/calendar-data-service';
import { CalendarIntent, AshleyResponse } from '../../baml_client/types';
import { b } from '../../baml_client';
import { LocationServiceImpl } from '../location/location-service';

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
        access_token: process.env.ASHLEY_GMAIL_ACCESS_TOKEN || null
      });
      
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
      const newEmails = await this.getNewEmails();
      
      if (newEmails.length === 0) {
        console.log('📭 No new emails to process');
        return;
      }

      console.log(`📧 Found ${newEmails.length} new email(s) to process`);

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
      if (this.isFromAshley(email)) {
        console.log('🚫 Skipping email from Ashley herself');
        return;
      }

      // Analyze email for calendar intent
      const calendarIntent = await this.analyzeCalendarIntent(email);
      
      if (!calendarIntent.action_needed) {
        console.log('ℹ️ No action needed for this email');
        await this.logToAirtable(email, calendarIntent, null);
        return;
      }

      console.log(`📋 Action needed: ${calendarIntent.action_needed}`);

      // Get calendar data
      const startTime = calendarIntent.start_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const endTime = calendarIntent.end_time || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const calendarData = await this.getSidCalendarData(startTime, endTime);
      
      // Generate Ashley's response
      const ashleyResponse = await this.generateAshleyResponse(calendarIntent, calendarData);

      // Execute Ashley's response (send email, create calendar invite)
      await this.executeAshleyResponse(email, ashleyResponse);

      // Log to Airtable
      await this.logToAirtable(email, calendarIntent, ashleyResponse);

    } catch (error) {
      console.error(`❌ Error processing email ${email.id}:`, error);
      await this.logErrorToAirtable(email, error);
    }
  }

  /**
   * Get new emails from Gmail
   */
  private async getNewEmails(): Promise<EmailData[]> {
    try {
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
   * Parse Gmail API response into EmailData
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
   * Check if email is from Ashley herself
   */
  private isFromAshley(email: EmailData): boolean {
    const ashleyEmails = ['ashley@example.com', 'sid.mathur@gmail.com'];
    return ashleyEmails.some(ashleyEmail => 
      email.from.toLowerCase().includes(ashleyEmail.toLowerCase())
    );
  }

  /**
   * Analyze email for calendar intent using BAML
   */
  private async analyzeCalendarIntent(email: EmailData): Promise<CalendarIntent> {
    const emailText = this.formatEmailForBAML(email);
    const response = await b.CalendarIntentAnalyzer(emailText);
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
   * Get Sid's calendar data
   */
  private async getSidCalendarData(startTime: string, endTime: string): Promise<string> {
    try {
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);

      console.log(`📅 Getting Sid's calendar data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      const availabilityResult = await this.calendarDataService.getAvailability(
        ['sid.mathur@gmail.com'],
        startDate,
        endDate
      );

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
   * Generate Ashley's response using BAML
   */
  private async generateAshleyResponse(
    calendarIntent: CalendarIntent,
    calendarData: string
  ): Promise<AshleyResponse> {
    const response = await b.AshleyCalendarAssistant(calendarIntent, calendarData);
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

    // Create calendar invite with location enhancement
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
      const emailContent = email.snippet + ' ' + email.subject;
      const participantEmails = response.participants_to_invite?.split(',').map(p => p.trim()) || [];

      // Determine the best location for this meeting
      const bestLocation = await this.locationService.determineBestLocation(
        emailContent,
        participantEmails.length + 1
      );

      console.log(`📍 Location determined: ${bestLocation.type}`);

      // Create calendar event details
      const eventDetails = {
        summary: response.calendar_invite_subject || 'Meeting',
        description: response.email_response || 'Meeting scheduled by Ashley',
        start_time: response.meeting_start_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_time: response.meeting_end_time || new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        attendees: [email.from, ...participantEmails],
        timezone: 'America/Los_Angeles'
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
      console.log('📅 Creating basic calendar invite (fallback)...');
      console.log(`   Subject: ${response.calendar_invite_subject}`);
      console.log(`   Start: ${response.meeting_start_time}`);
      console.log(`   End: ${response.meeting_end_time}`);
      console.log(`   Participants: ${response.participants_to_invite}`);
    }
  }

  /**
   * Log interaction to Airtable
   */
  private async logToAirtable(
    email: EmailData,
    calendarIntent: CalendarIntent,
    ashleyResponse: AshleyResponse | null
  ): Promise<void> {
    try {
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
   * Start the orchestrator with polling
   */
  async start(intervalMinutes: number = 1): Promise<void> {
    console.log(`🚀 Ashley Orchestrator started (checking every ${intervalMinutes} minute(s))`);

    await this.processIncomingEmails();

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