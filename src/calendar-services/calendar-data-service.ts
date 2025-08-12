// Simple calendar data gathering service - passes raw data to BAML for decision-making

import * as dotenv from 'dotenv';
import { GoogleCalendarService } from './google-calendar-service';

// Load environment variables
dotenv.config();

export class CalendarDataService {
  private googleCalendarService: GoogleCalendarService;

  constructor() {
    this.googleCalendarService = new GoogleCalendarService();
  }

  /**
   * Gather calendar data for multiple participants and format for BAML input
   * BAML will make all decisions about coordination, messaging, and consent links
   */
  async gatherParticipantCalendarData(
    participants: string[],
    startTime: Date,
    endTime: Date
  ): Promise<string> {
    console.log(`🔍 Gathering calendar data for ${participants.length} participants...`);
    
    let calendarData = '\nParticipant Calendar Data:\n\n';

    for (const email of participants) {
      console.log(`📅 Checking calendar access for ${email}...`);
      
      const freeBusyResult = await this.googleCalendarService.getFreeBusy(
        email, 
        startTime, 
        endTime
      );

      if (freeBusyResult.status === 'success') {
        console.log(`✅ ${email}: Calendar access available`);
        
        calendarData += `${email}:\n`;
        calendarData += `  Status: Calendar access available\n`;
        
        if (freeBusyResult.busySlots && freeBusyResult.busySlots.length > 0) {
          calendarData += `  Busy times:\n`;
          for (const slot of freeBusyResult.busySlots) {
            calendarData += `    - ${this.formatDateTime(slot.start)} to ${this.formatDateTime(slot.end)}\n`;
          }
        } else {
          calendarData += `  Busy times: None (completely free during requested period)\n`;
        }
        calendarData += '\n';
        
      } else {
        console.log(`❌ ${email}: ${freeBusyResult.errorMessage}`);
        
        calendarData += `${email}:\n`;
        calendarData += `  Status: Calendar access not available\n`;
        calendarData += `  Reason: ${freeBusyResult.errorMessage}\n`;
        calendarData += `  Note: Manual coordination required\n\n`;
      }
    }

    // Add helpful context for BAML
    calendarData += 'Instructions for Ashley:\n';
    calendarData += '- For participants with calendar access: Use their actual busy times to suggest optimal meeting slots\n';
    calendarData += '- For participants without calendar access: Ask them to provide their availability manually\n';
    calendarData += '- At the end of coordination emails, add an asterisk note: "*For faster scheduling in the future, you can share your calendar with ashley.sidsai@gmail.com (free/busy only): https://calendar.google.com/calendar/r/settings/calendar/primary?card=sharing"\n';
    calendarData += '- Keep the sharing link optional and non-intrusive\n';
    calendarData += '- Always maintain professional, helpful tone\n';

    return calendarData;
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Los_Angeles'
    });
  }
}
