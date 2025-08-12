// Ashley Calendar AI Orchestrator - Replaces N8n workflow with unified TypeScript implementation

import * as dotenv from 'dotenv';
import { gmail_v1, google } from 'googleapis';
import { CalendarDataService } from '../calendar-services/calendar-data-service';
import { CalendarIntent, AshleyResponse } from '../../baml_client/types';
import { b } from '../../baml_client';

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

      // Step 2: Analyze email for calendar intent (replaces "Summarize Request")
      const calendarIntent = await this.analyzeCalendarIntent(email);
      
      if (!calendarIntent.action_needed) {
        console.log('ℹ️ No action needed for this email');
        await this.logToAirtable(email, calendarIntent, null);
        return;
      }

      console.log(`🎯 Action needed! Requestor: ${calendarIntent.requestor}`);

      // Step 3: Get Sid's calendar availability (replaces "Get Availability")
      const calendarData = await this.getSidCalendarData(
        calendarIntent.timerange_start,
        calendarIntent.timerange_end
      );

      // Step 4: Get participant calendar data if available
      const participantCalendarData = await this.getParticipantCalendarData(
        calendarIntent.participants,
        calendarIntent.timerange_start,
        calendarIntent.timerange_end
      );

      // Step 5: Generate Ashley's response (replaces "Construct email and invite")
      const ashleyResponse = await this.generateAshleyResponse(
        calendarIntent,
        calendarData + participantCalendarData
      );

      console.log(`📝 Ashley's action: ${ashleyResponse.action}`);

      // Step 6: Log to Airtable for review (replaces Airtable node)
      await this.logToAirtable(email, calendarIntent, ashleyResponse);

      // Step 7: Execute Ashley's response (send email, create calendar invite)
      await this.executeAshleyResponse(email, ashleyResponse);

      console.log('✅ Email processed successfully');

    } catch (error) {
      console.error(`❌ Error processing email ${email.id}:`, error);
      // Log error to Airtable for review
      await this.logErrorToAirtable(email, error);
    }
  }

  /**
   * Get new emails from Gmail (replaces Gmail Trigger + Get full email)
   */
  private async getNewEmails(): Promise<EmailData[]> {
    try {
      // Get list of messages
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread', // Only unread emails
        maxResults: 10
      });

      const messages = response.data.messages || [];
      const emails: EmailData[] = [];

      for (const message of messages) {
        if (!message.id) continue;

        // Get full email content
        const fullEmail = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        const emailData = this.parseEmailData(fullEmail.data);
        if (emailData) {
          emails.push(emailData);
        }
      }

      return emails;

    } catch (error) {
      console.error('❌ Error getting emails from Gmail:', error);
      return [];
    }
  }

  /**
   * Parse Gmail API response into EmailData (replaces "Reconstruct body")
   */
  private parseEmailData(message: gmail_v1.Schema$Message): EmailData | null {
    if (!message.id || !message.payload) return null;

    const headers = message.payload.headers || [];
    const getHeader = (name: string) => 
      headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    return {
      id: message.id,
      from: getHeader('From'),
      to: getHeader('To'),
      cc: getHeader('Cc'),
      subject: getHeader('Subject'),
      snippet: this.extractPlainTextFromPayload(message.payload),
      internalDate: message.internalDate || '',
      threadId: message.threadId || ''
    };
  }

  /**
   * Extract plain text from email payload (replaces N8n code node logic)
   */
  private extractPlainTextFromPayload(payload: gmail_v1.Schema$MessagePart): string {
    if (!payload) return '[No payload]';

    // Helper function to decode base64
    const decodeBase64 = (str: string): string => {
      return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    };

    // Check for multipart
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return this.cleanEmailText(decodeBase64(part.body.data));
        }
        // Check nested parts
        if (part.parts) {
          for (const nested of part.parts) {
            if (nested.mimeType === 'text/plain' && nested.body?.data) {
              return this.cleanEmailText(decodeBase64(nested.body.data));
            }
          }
        }
      }
    }

    // Check direct body
    if (payload.body?.data) {
      return this.cleanEmailText(decodeBase64(payload.body.data));
    }

    return '[No readable plain text found]';
  }

  /**
   * Clean email text (replaces N8n cleanText function)
   */
  private cleanEmailText(text: string): string {
    if (!text || typeof text !== 'string') return text;

    return text
      // Remove <https://...> style links
      .replace(/<https?:\/\/[^>\s]+>/gi, '')
      // Collapse long repeated newlines
      .replace(/\r?\n\s*\r?\n\s*\r?\n/g, '\n\n')
      // Remove quote markers
      .replace(/^>\s*/gm, '')
      .replace(/>>/g, '')
      .trim();
  }

  /**
   * Check if email is from Ashley herself (replaces "Don't respond to self")
   */
  private isFromAshley(email: EmailData): boolean {
    return email.from.includes('ashley.sidsai@gmail.com');
  }

  /**
   * Analyze email for calendar intent using BAML (replaces "Summarize Request")
   */
  private async analyzeCalendarIntent(email: EmailData): Promise<CalendarIntent> {
    // Format email as thread string for BAML
    const emailThread = `From: ${email.from}
To: ${email.to}
Cc: ${email.cc || ''}
Date: ${new Date(parseInt(email.internalDate)).toISOString().slice(0, 19).replace('T', ' ')}
Subject: ${email.subject}
Content: ${email.snippet}`;

    // Use BAML to extract calendar intent from email
    const calendarIntent = await b.ExtractCalendarIntent(emailThread);
    
    return calendarIntent;
  }

  /**
   * Get Sid's calendar data (replaces "Get Availability" + "Aggregate")
   */
  private async getSidCalendarData(startTime: string, endTime: string): Promise<string> {
    try {
      // Initialize Google Calendar API with API key
      if (!process.env.SID_CALENDAR_API_KEY) {
        throw new Error('SID_CALENDAR_API_KEY not found in environment variables');
      }
      
      const calendar = google.calendar({ 
        version: 'v3', 
        auth: process.env.SID_CALENDAR_API_KEY 
      });

      // Convert time strings to ISO format
      const timeMin = new Date(startTime).toISOString();
      const timeMax = new Date(endTime).toISOString();

      // Get Sid's calendar free/busy information
      const freeBusyResponse = await calendar.freebusy.query({
        requestBody: {
          timeMin,
          timeMax,
          items: [{ id: 'sid.mathur@gmail.com' }]
        }
      });

      const busyTimes = freeBusyResponse.data.calendars?.['sid.mathur@gmail.com']?.busy || [];
      
      let calendarData = `Sid's Calendar Data (${startTime} to ${endTime}):\n`;
      
      if (busyTimes.length === 0) {
        calendarData += '- Available for meetings\n- No conflicts found in requested time range';
      } else {
        calendarData += '- Busy times found:\n';
        busyTimes.forEach((busy, index) => {
          const start = new Date(busy.start!).toLocaleString();
          const end = new Date(busy.end!).toLocaleString();
          calendarData += `  ${index + 1}. ${start} - ${end}\n`;
        });
      }

      return calendarData;

    } catch (error) {
      console.error('❌ Error getting Sid\'s calendar data:', error);
      return `Sid's Calendar Data (${startTime} to ${endTime}):\n- Error accessing calendar: ${error}\n- Falling back to manual scheduling`;
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
    if (!participants) return '';

    const participantEmails = participants.split(',').map(email => email.trim());
    const start = new Date(startTime);
    const end = new Date(endTime);

    return await this.calendarDataService.gatherParticipantCalendarData(
      participantEmails,
      start,
      end
    );
  }

  /**
   * Generate Ashley's response using BAML (replaces "Construct email and invite")
   */
  private async generateAshleyResponse(
    calendarIntent: CalendarIntent,
    calendarData: string
  ): Promise<AshleyResponse> {
    // Use BAML directly with the CalendarIntent
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
      await this.createCalendarInvite(response);
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
   * Create calendar invite via Google Calendar
   */
  private async createCalendarInvite(response: AshleyResponse): Promise<void> {
    try {
      // TODO: Implement Google Calendar invite creation
      console.log('📅 Calendar invite creation not yet implemented');
      console.log(`   Subject: ${response.calendar_invite_subject}`);
      console.log(`   Start: ${response.meeting_start_time}`);
      console.log(`   End: ${response.meeting_end_time}`);
      console.log(`   Participants: ${response.participants_to_invite}`);

    } catch (error) {
      console.error('❌ Error creating calendar invite:', error);
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
