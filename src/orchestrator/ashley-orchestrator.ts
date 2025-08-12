// Ashley Calendar AI Orchestrator - Replaces N8n workflow with unified TypeScript implementation

import * as dotenv from 'dotenv';
import { gmail_v1, google } from 'googleapis';
import { CalendarDataService } from '../calendar-services/calendar-data-service';
import { CalendarIntent, AshleyResponse } from '../../baml_client/types';
import { b } from '../../baml_client';
import { TimezoneDetector, TimezoneConverter } from '../timezone/timezone-utils';

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
    }

    this.gmail = google.gmail({ version: 'v1', auth });
    this.calendarDataService = new CalendarDataService();
  }

  /**
   * Main orchestration method - processes new emails and handles calendar intents
   */
  async processNewEmails(): Promise<void> {
    try {
      console.log('🔍 Checking for new emails...');
      
      // Get unread emails from Ashley's inbox
      const emails = await this.getUnreadEmails();
      
      if (emails.length === 0) {
        console.log('📭 No new emails found');
        return;
      }

      console.log(`📧 Found ${emails.length} new email(s)`);

      // Process each email
      for (const email of emails) {
        await this.processEmail(email);
      }

    } catch (error) {
      console.error('❌ Error in processNewEmails:', error);
      throw error;
    }
  }

  /**
   * Process a single email
   */
  private async processEmail(email: EmailData): Promise<void> {
    try {
      console.log(`📨 Processing email from ${email.from}: ${email.subject}`);

      // Get full email content
      const fullEmail = await this.getFullEmailContent(email.id);
      
      // Simple timezone detection - just add to the existing flow
      const emailHeaders = fullEmail.headers || {};
      const emailBody = fullEmail.body || email.snippet;
      const senderTimezone = TimezoneDetector.detectTimezone(emailHeaders, emailBody);
      
      console.log(`🌍 Detected timezone: ${senderTimezone.detectedTimezone} (confidence: ${senderTimezone.confidence})`);

      // Extract calendar intent using BAML
      const calendarIntent = await b.ExtractCalendarIntent(
        fullEmail.body || email.snippet,
        email.from,
        email.subject
      );

      // Add timezone info to the intent
      calendarIntent.requestor_timezone = senderTimezone.detectedTimezone;
      calendarIntent.timezone_confidence = senderTimezone.confidence;
      calendarIntent.explicit_timezone_mentioned = this.hasExplicitTimezone(emailBody);

      console.log('🎯 Calendar Intent:', JSON.stringify(calendarIntent, null, 2));

      // Skip processing if no actionable intent
      if (!calendarIntent || calendarIntent.action === 'QUERY') {
        console.log('ℹ️ No actionable calendar intent detected');
        await this.markAsRead(email.id);
        return;
      }

      // Convert times if timezone detected and different from Sid's timezone
      let convertedStartTime = calendarIntent.timerange_start;
      let convertedEndTime = calendarIntent.timerange_end;
      
      if (senderTimezone.detectedTimezone !== 'America/Los_Angeles' && 
          calendarIntent.timerange_start && calendarIntent.timerange_end) {
        convertedStartTime = TimezoneConverter.convertToSidTimezone(
          calendarIntent.timerange_start, 
          senderTimezone.detectedTimezone
        );
        convertedEndTime = TimezoneConverter.convertToSidTimezone(
          calendarIntent.timerange_end, 
          senderTimezone.detectedTimezone
        );
        console.log(`🔄 Converted times: ${calendarIntent.timerange_start} -> ${convertedStartTime}`);
      }

      // Get Sid's calendar data using converted times
      let calendarData = '';
      if (convertedStartTime && convertedEndTime) {
        calendarData = await this.calendarDataService.getSidCalendarData(
          convertedStartTime,
          convertedEndTime
        );
      }

      console.log('📅 Calendar Data:', calendarData);

      // Handle the calendar action
      await this.handleCalendarAction(calendarIntent, convertedStartTime, convertedEndTime);

      // Generate Ashley's response using BAML
      const ashleyResponse = await b.GenerateEmailResponse(calendarIntent, calendarData);

      console.log('💬 Ashley Response:', ashleyResponse);

      // Send reply email
      await this.sendReplyEmail(email, ashleyResponse);

      // Mark original email as read
      await this.markAsRead(email.id);

      console.log('✅ Email processed successfully');

    } catch (error) {
      console.error(`❌ Error processing email ${email.id}:`, error);
      // Don't mark as read if there was an error - we might want to retry
    }
  }

  /**
   * Check if email content has explicit timezone mentions
   */
  private hasExplicitTimezone(content: string): boolean {
    const timezonePatterns = [
      /\b(PST|EST|CST|MST|GMT|UTC|BST|CET|JST|IST|AEST)\b/i,
      /\b(Pacific|Eastern|Central|Mountain)\s+time\b/i,
      /\b\d{1,2}:\d{2}\s*(AM|PM)?\s+(PST|EST|CST|MST|GMT|UTC)\b/i
    ];
    return timezonePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Get unread emails from Ashley's inbox
   */
  private async getUnreadEmails(): Promise<EmailData[]> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread in:inbox',
        maxResults: 10
      });

      const messages = response.data.messages || [];
      const emails: EmailData[] = [];

      for (const message of messages) {
        if (!message.id) continue;

        const emailResponse = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date']
        });

        const email = this.parseEmailMetadata(emailResponse.data);
        if (email) {
          emails.push(email);
        }
      }

      return emails;
    } catch (error) {
      console.error('❌ Error fetching unread emails:', error);
      throw error;
    }
  }

  /**
   * Get full email content including body
   */
  private async getFullEmailContent(messageId: string): Promise<{ body: string; headers: Record<string, string> }> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const headers: Record<string, string> = {};
      if (response.data.payload?.headers) {
        response.data.payload.headers.forEach(header => {
          if (header.name && header.value) {
            headers[header.name] = header.value;
          }
        });
      }

      // Extract body from email payload
      let body = '';
      if (response.data.payload) {
        body = this.extractEmailBody(response.data.payload);
      }

      return { body, headers };
    } catch (error) {
      console.error(`❌ Error fetching full email content for ${messageId}:`, error);
      return { body: '', headers: {} };
    }
  }

  /**
   * Extract email body from Gmail payload
   */
  private extractEmailBody(payload: gmail_v1.Schema$MessagePart): string {
    let body = '';

    if (payload.body?.data) {
      // Decode base64url encoded body
      body = Buffer.from(payload.body.data, 'base64url').toString('utf-8');
    } else if (payload.parts) {
      // Multi-part email - look for text/plain or text/html
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64url').toString('utf-8');
          break;
        }
      }
      
      // If no plain text, try HTML
      if (!body) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/html' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64url').toString('utf-8');
            break;
          }
        }
      }
    }

    return body;
  }

  /**
   * Parse email metadata from Gmail API response
   */
  private parseEmailMetadata(message: gmail_v1.Schema$Message): EmailData | null {
    if (!message.id || !message.payload?.headers) {
      return null;
    }

    const headers = message.payload.headers;
    const getHeader = (name: string) => headers.find(h => h.name === name)?.value || '';

    return {
      id: message.id,
      from: getHeader('From'),
      to: getHeader('To'),
      cc: getHeader('Cc'),
      subject: getHeader('Subject'),
      snippet: message.snippet || '',
      internalDate: message.internalDate || '',
      threadId: message.threadId || ''
    };
  }

  /**
   * Handle different calendar actions
   */
  private async handleCalendarAction(intent: CalendarIntent, startTime?: string, endTime?: string): Promise<void> {
    switch (intent.action) {
      case 'SCHEDULE':
        if (startTime && endTime) {
          console.log(`📅 Creating calendar event: ${intent.title} from ${startTime} to ${endTime}`);
          // TODO: Implement calendar event creation
        }
        break;
      
      case 'RESCHEDULE':
        console.log('🔄 Reschedule action detected - implementation pending');
        break;
      
      case 'CANCEL':
        console.log('❌ Cancel action detected - implementation pending');
        break;
      
      default:
        console.log(`ℹ️ Action ${intent.action} does not require calendar modification`);
    }
  }

  /**
   * Send reply email
   */
  private async sendReplyEmail(originalEmail: EmailData, responseContent: string): Promise<void> {
    try {
      // Create reply email
      const replySubject = originalEmail.subject.startsWith('Re:') 
        ? originalEmail.subject 
        : `Re: ${originalEmail.subject}`;

      // Extract email address from "Name <email@domain.com>" format
      const fromEmail = originalEmail.from.match(/<(.+)>/) 
        ? originalEmail.from.match(/<(.+)>/)![1] 
        : originalEmail.from;

      const emailContent = [
        `To: ${fromEmail}`,
        `Subject: ${replySubject}`,
        `In-Reply-To: ${originalEmail.id}`,
        `References: ${originalEmail.id}`,
        '',
        responseContent
      ].join('\n');

      // Encode email content
      const encodedEmail = Buffer.from(emailContent).toString('base64url');

      // Send email
      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
          threadId: originalEmail.threadId
        }
      });

      console.log(`📤 Reply sent to ${fromEmail}`);
    } catch (error) {
      console.error('❌ Error sending reply email:', error);
      throw error;
    }
  }

  /**
   * Mark email as read
   */
  private async markAsRead(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });
      console.log(`✅ Marked email ${messageId} as read`);
    } catch (error) {
      console.error(`❌ Error marking email ${messageId} as read:`, error);
    }
  }

  /**
   * Start the email processing loop
   */
  async start(): Promise<void> {
    console.log('🚀 Ashley Calendar AI Orchestrator starting...');
    
    // Process emails immediately
    await this.processNewEmails();
    
    // Set up interval to check for new emails every 30 seconds
    setInterval(async () => {
      try {
        await this.processNewEmails();
      } catch (error) {
        console.error('❌ Error in email processing loop:', error);
      }
    }, 30000);
    
    console.log('✅ Orchestrator started successfully');
  }
}