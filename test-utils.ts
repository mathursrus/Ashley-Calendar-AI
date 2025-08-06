import * as dotenv from 'dotenv';
import { b } from './baml_client';
import { CalendarIntent, AshleyResponse, AshleyAction } from './baml_client/types';
import { setLogLevel } from './baml_client/config';
import { create } from 'domain';

// Set BAML log level to error to reduce noise
setLogLevel('error');

// Load environment variables from .env file
dotenv.config();

// Email message interface
export interface EmailMessage {
  from: string;
  to?: string;
  cc?: string;
  date: string;
  subject?: string;
  content: string;
  conversationHistory?: EmailMessage[];
}


export interface ContextMemoryTestCase {
  name: string;
  conversationHistory: EmailMessage[];
  currentMessage: EmailMessage;
  sidCalendarData: string;
  expectedIntent?: Partial<CalendarIntent>;
  expectedAshleyResponse?: Partial<AshleyResponse>;
}

// Shared identities
export const identities = {
  ashley: 'Ashley <ashley.sidsai@gmail.com>',
  sid: 'Sid <sid.mathur@gmail.com>',
  colleague: 'Mike Chen <mike.chen@company.com>',
  executiveAssistant: 'Samantha <samantha@company.com>',
  externalPerson: 'John Smith <john.smith@external.com>'
};

export const lists = {
  ashleyAndSid: identities.ashley + ', ' + identities.sid,
  multiplePeople: identities.colleague + ', ' + identities.externalPerson
};

export const dates = {
  monday: '2025-07-28',
  last_day_of_month: '2025-07-31',
  friday: '2025-08-01',
  internalDate: '1754329721000'
};

export const subjects = {
  bookTimeRequest: 'Meeting Request',
  availabilityCheck: 'Checking Availability',
  scheduleMeeting: 'Schedule Meeting',
  nonCalendar: 'Project Update',
  meetingTitle: 'Project summary meeting'
};

// Content field variations
export const contents = {
  simpleMeetingRequest: 'Can we meet next Friday at 3pm?',
  requestWithDurationAndTime: 'I need to schedule a 1-hour meeting with Sid next Tuesday at 2pm. Please let me know if this works.',
  requestWithVagueTimePeriods: 'Is Sid available tomorrow morning for a quick call?',
  requestFromSid: 'Ashley, please schedule a team meeting with Mike and John next Wednesday at 10am',
  requestFromColleagueWithEA: 'When is Sid available for a client meeting on Thursday at 2pm? My EA will work with you to schedule the meeting.',
  notARequestForAshley: 'Sarah, please work with Ashley to schedule a meeting with Sid next week.',
  nonCalendarMessage: 'Thanks for the update on the project status. Everything looks good!',
  suggestionRequestFromEA: 'The SVP - karmen@company.com - needs to meet with Sid for 2 hours next week. She can only meet 5pm-7pm EST. Please suggest time slots',
  bookTimeRequestFromEA: 'The SVP - karmen@company.com - needs to meet with Sid for 2 hours next week. She can only meet 5pm-7pm EST. Please book available time',
  urgentMeetingRequest: 'URGENT: Need to meet with Sid today at 4pm for crisis discussion. Please schedule ASAP.',
  recurringMeetingRequest: 'Can we set up a weekly 30-minute check-in with Sid every Monday at 9am starting next week?',
  availabilityCheck: 'Is Sid available for a 45-minute call tomorrow between 2-4pm?',
  externalClientMeeting: 'Our client from Acme Corp (client@acme.com) needs to meet with Sid for 1.5 hours next Thursday. They prefer afternoon slots.',
  teamMeetingWithMultipleEAs: 'The marketing team needs to meet with Sid next Tuesday. My EA (sarah@company.com) and John\'s EA (lisa@company.com) will coordinate the scheduling.',
  meetingWithSpecificConstraints: 'Need to schedule a 2-hour strategy session with Sid next week, but only on Tuesday or Wednesday, and only between 10am-2pm.'
}

// Reusable calendar data
export const sidCalendarData = {
  // Available calendar - Sid has lots of free time
  available: `
Monday, August 4, 2025:
- 9:00 AM - 10:00 AM: Team Standup
- 2:00 PM - 3:30 PM: Product Review

Wednesday, August 6, 2025:
- 10:00 AM - 11:00 AM: Client Meeting
- 4:30 PM - 5:30 PM: Strategy Session

Thursday, August 7, 2025:
- 2:30 PM - 3:30 PM: Focus time
  `,
  
  // Busy calendar - Sid has limited availability
  busy: `
Monday, August 4, 2025:
- 9:00 AM - 11:00 AM: Back-to-back meetings
- 1:00 PM - 2:00 PM: Lunch with investors
- 3:00 PM - 4:30 PM: Product roadmap review
- 5:00 PM - 6:00 PM: Team retrospective

Tuesday, August 5, 2025:
- 8:00 AM - 9:00 AM: Morning standup
- 10:00 AM - 12:00 PM: Engineering sync
- 2:00 PM - 3:00 PM: Customer call
- 4:00 PM - 5:00 PM: Board prep meeting

Wednesday, August 6, 2025:
- 9:00 AM - 10:00 AM: Leadership team meeting
- 11:00 AM - 12:30 PM: Investor pitch prep
- 2:00 PM - 4:00 PM: All-hands meeting
- 4:30 PM - 5:30 PM: One-on-one with CTO

Thursday, August 7, 2025:
- 8:30 AM - 9:30 AM: Product demo
- 10:00 AM - 11:30 AM: Customer feedback session
- 1:00 PM - 2:30 PM: Strategic planning
- 3:00 PM - 4:00 PM: Team check-in
- 4:30 PM - 5:30 PM: Wrap-up meeting

Friday, August 8, 2025:
- 9:00 AM - 10:30 AM: Weekly review
- 11:00 AM - 12:00 PM: Client presentation
- 2:00 PM - 3:00 PM: Team retrospective
  `
};

// Helper function to convert email message to newline-separated string
export function emailToString(email: EmailMessage): string {
  const lines = [
    `From: ${email.from}`,
    `To: ${email.to}`,
    `CC: ${email.cc}`,
    `Date: ${email.date}`,
    `Subject: ${email.subject}`,
    '',
    email.content,
    createEmailThread(email.conversationHistory || [])
  ];
  return lines.join('\n');
}

// Helper function to create email thread with conversation history
export function createEmailThread(conversationHistory: EmailMessage[]): string {
    let emailThread = '';
    
    // Add conversation history as previous emails in thread
    conversationHistory.forEach((msg, index) => {
     emailThread += `\n On ${msg.date} from ${msg.from} wrote: n`;
     emailThread += msg.content + '\n';
    });
    
    return emailThread;
  }

// Validation function for CalendarIntent
export function validateCalendarIntent(result: CalendarIntent, expected: Partial<CalendarIntent>, expectedKeywords?: string[]): boolean {
  // Check if all expected fields match the result
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (result[key as keyof CalendarIntent] !== expectedValue) {
      console.log(`   ❌ Validation failed: Expected ${key} to be ${expectedValue}, but got ${result[key as keyof CalendarIntent]}`);
      return false;
    }
  }
  
  // Check request_details keywords if provided
  if (expectedKeywords && expectedKeywords.length > 0) {
    const actualDetails = result.request_details.toLowerCase();
    const missingKeywords = expectedKeywords.filter(keyword => 
      !actualDetails.includes(keyword.toLowerCase())
    );
    if (missingKeywords.length > 0) {
      console.log(`   ❌ Validation failed: request_details missing required keywords: ${missingKeywords.join(', ')}`);
      return false;
    }
  }
  
  return true;
}

// Validation function for AshleyResponse
export function validateAshleyResponse(result: AshleyResponse, expected: Partial<AshleyResponse>): boolean {
  // Check if all expected fields match the result
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (result[key as keyof AshleyResponse] !== expectedValue) {
      console.log(`   ❌ Validation failed: Expected ${key} to be ${expectedValue}, but got ${result[key as keyof AshleyResponse]}`);
      return false;
    }
  }
  return true;
}

// Test runner for context memory tests
export async function runContextMemoryTest(testCase: ContextMemoryTestCase): Promise<boolean> {
  console.log(`📝 Test: ${testCase.name}`);
  
  try {
    // Create email thread with conversation history + current message
    const emailThread = createEmailThread(testCase.conversationHistory);
    
    console.log('   📧 Email Thread sent to API:');
    console.log('   ' + emailThread.split('\n').join('\n   '));
    
    // Step 1: Extract intent from email thread
    const calendarIntent = await b.ExtractCalendarIntent(emailThread);
    console.log('   📊 Extracted Intent:', JSON.stringify(calendarIntent, null, 2));
    
    // Validate extracted intent if expected
    if (testCase.expectedIntent) {
      const intentValid = validateCalendarIntent(calendarIntent, testCase.expectedIntent);
      console.log(`   ${intentValid ? '✅' : '❌'} Intent Validation: ${intentValid ? 'PASSED' : 'FAILED'}`);
      if (!intentValid) return false;
    }
    
    // Step 2: Pass intent to Ashley
    const ashleyResponse = await b.AshleyCalendarAssistant(calendarIntent, testCase.sidCalendarData);
    console.log('   📧 Ashley\'s Response:');
    console.log('   ' + ashleyResponse.email_response.split('\n').join('\n   '));
    console.log('   📊 Ashley Result:', JSON.stringify(ashleyResponse, null, 2));
    
    // Validate Ashley's response if expected
    if (testCase.expectedAshleyResponse) {
      const ashleyValid = validateAshleyResponse(ashleyResponse, testCase.expectedAshleyResponse);
      console.log(`   ${ashleyValid ? '✅' : '❌'} Ashley Validation: ${ashleyValid ? 'PASSED' : 'FAILED'}`);
      return ashleyValid;
    }
    
    console.log('   ✅ Success!');
    return true;
    
  } catch (error) {
    console.error('   ❌ Error:', error instanceof Error ? error.message : String(error));
    return false;
  }
}
