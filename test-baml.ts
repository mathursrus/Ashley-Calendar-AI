import * as dotenv from 'dotenv';
import { b } from './baml_client';
import { CalendarIntent, RequestType } from './baml_client/types';
import { setLogLevel } from './baml_client/config';

// Set BAML log level to error to reduce noise
setLogLevel('error');

// Load environment variables from .env file
dotenv.config();

// Email message interface
interface EmailMessage {
  from: string;
  to: string;
  cc: string;
  date: string;
  subject: string;
  content: string;
}

// Test case interface
interface TestCase {
  name: string;
  message: EmailMessage;
  expectedIntent?: Partial<CalendarIntent>;
}

const identities = {
  ashley: 'Ashley <ashley.sidsai@gmail.com>',
  sid: 'Sid <sid.mathur@gmail.com>',
  colleague: 'Mike Chen <mike.chen@company.com>',
  executiveAssistant: 'Samantha <samantha@company.com>',
  externalPerson: 'John Smith <john.smith@external.com>'
};

const lists = {
  ashleyAndSid: identities.ashley + ', ' + identities.sid,
  multiplePeople: identities.colleague + ', ' + identities.externalPerson
};

const dates = {
  monday: '2025-07-28',
  last_day_of_month: '2025-07-31',
  friday: '2025-07-30'
};

const subjects = {
  bookTimeRequest: 'Meeting Request',
  availabilityCheck: 'Checking Availability',
  scheduleMeeting: 'Schedule Meeting',
  nonCalendar: 'Project Update'
};

// Content field variations
const contents = {
  simpleMeetingRequest: 'Can we meet next Friday at 3pm?',
  requestWithDurationAndTime: 'I need to schedule a 1-hour meeting with Sid next Tuesday at 2pm. Please let me know if this works.',
  requestWithVagueTimePeriods: 'Is Sid available tomorrow morning for a quick call?',
  requestFromSid: 'Ashley, please schedule a team meeting with Mike and John next Wednesday at 10am',
  requestFromColleagueWithEA: 'When is Sid available for a client meeting on Thursday at 2pm? My EA will work with you to schedule the meeting.',
  notARequestForAshley: 'Sarah, please work with Ashley to schedule a meeting with Sid next week.',
  nonCalendarMessage: 'Thanks for the update on the project status. Everything looks good!',
  suggestionRequestFromEA: 'The SVP - karmen@company.com - needs to meet with Sid for 2 hours next week. She can only meet 5pm-7pm EST. Please suggest time slots',
  bookTimeRequestFromEA: 'The SVP - karmen@company.com - needs to meet with Sid for 2 hours next week. She can only meet 5pm-7pm EST. Please book available time'
}

// Helper function to convert email message to newline-separated string
function emailToString(email: EmailMessage): string {
  const lines = [
    `From: ${email.from}`,
    `To: ${email.to}`,
    `CC: ${email.cc}`,
    `Date: ${email.date}`,
    `Subject: ${email.subject}`,
    '',
    email.content
  ];
  return lines.join('\n');
}

// Reusable test runner function
async function runSingleTest(testCase: TestCase): Promise<void> {
  console.log(`📝 Test: ${testCase.name}`);
  
  try {
    const emailString = emailToString(testCase.message);
    console.log('   📧 Email sent to API:');
    console.log('   ' + emailString.split('\n').join('\n   '));
    const result = await b.ExtractCalendarIntent(emailString);
    console.log('   📊 Result:', JSON.stringify(result, null, 2));
    
    if (testCase.expectedIntent) {
      const isValid = validateResult(result, testCase.expectedIntent);
      console.log(`   ${isValid ? '✅' : '❌'} Validation: ${isValid ? 'PASSED' : 'FAILED'}`);
    } else {
      console.log('   ✅ Success!');
    }
  } catch (error) {
    console.error('   ❌ Error:', error instanceof Error ? error.message : String(error));
  }
  console.log('');
}

// Validation function
function validateResult(result: CalendarIntent, expected: Partial<CalendarIntent>): boolean {
  // Check if all expected fields match the result
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (result[key as keyof CalendarIntent] !== expectedValue) {
      console.log(`   ❌ Validation failed: Expected ${key} to be ${expectedValue}, but got ${result[key as keyof CalendarIntent]}`);
      return false;
    }
  }
  return true;
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('🧪 Testing BAML Calendar Intent Extraction...\n');
  
  for (const testCase of testCases) {
    await runSingleTest(testCase);
  }
  
  console.log('🏁 All tests completed!');
}

const testRequestFromSidToBookTime: TestCase = {
  name: 'requestFromSidToBookTime',
  message: {
    from: identities.sid,
    to: identities.ashley,
    cc: lists.multiplePeople,
    date: dates.monday,
    subject: subjects.bookTimeRequest,
    content: contents.requestFromSid
  },
  expectedIntent: {
    action_needed: true,
    request_type: RequestType.BookTime,
    requestor: 'sid.mathur@gmail.com',
    participants: 'mike.chen@company.com,john.smith@external.com'
  }
};

const testNonCalendarMessage: TestCase = {
  name: 'nonCalendarMessage',
  message: {
    ...testRequestFromSidToBookTime.message,
    content: contents.nonCalendarMessage
  },
  expectedIntent: {
    action_needed: false
  }
};

const testSuggestionRequestFromEA: TestCase = {
  name: 'suggestionRequestFromEA',
  message: {
    ...testRequestFromSidToBookTime.message,
    from: identities.executiveAssistant,
    content: contents.suggestionRequestFromEA
  },
  expectedIntent: {
    action_needed: true,
    request_type: RequestType.SuggestTime || RequestType.DoesTimeWork,
    requestor: 'samantha@company.com',
    participants: 'karmen@company.com',
    executive_assistants: 'samantha@company.com',
    silent_observers: 'mike.chen@company.com,john.smith@external.com',
    meeting_duration: '120 minutes',
    timerange_start: '2025-08-04 14:00',
    timerange_end: '2025-08-08 16:00',
    date_of_request: '2025-07-28'
  }
};

const testBookTimeRequestFromEA: TestCase = {
  name: 'bookTimeRequestFromEA',
  message: {
    ...testSuggestionRequestFromEA.message,
    content: contents.bookTimeRequestFromEA
  },
  expectedIntent: {
    ...testSuggestionRequestFromEA.expectedIntent,
    request_type: RequestType.BookTime
  }
};

// Test cases - composed from modular components
const testCases: TestCase[] = [
  //testRequestFromSidToBookTime,
  //testNonCalendarMessage,
  testSuggestionRequestFromEA,
  testBookTimeRequestFromEA
];


// Run the tests
runAllTests(); 