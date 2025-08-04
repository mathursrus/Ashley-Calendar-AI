import * as dotenv from 'dotenv';
import { b } from './baml_client';
import { CalendarIntent } from './baml_client/types';
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
  expectedKeywords?: string[]; // For testing request_details content
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
  friday: '2025-08-01'
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
  bookTimeRequestFromEA: 'The SVP - karmen@company.com - needs to meet with Sid for 2 hours next week. She can only meet 5pm-7pm EST. Please book available time',
  urgentMeetingRequest: 'URGENT: Need to meet with Sid today at 4pm for crisis discussion. Please schedule ASAP.',
  recurringMeetingRequest: 'Can we set up a weekly 30-minute check-in with Sid every Monday at 9am starting next week?',
  availabilityCheck: 'Is Sid available for a 45-minute call tomorrow between 2-4pm?',
  externalClientMeeting: 'Our client from Acme Corp (client@acme.com) needs to meet with Sid for 1.5 hours next Thursday. They prefer afternoon slots.',
  teamMeetingWithMultipleEAs: 'The marketing team needs to meet with Sid next Tuesday. My EA (sarah@company.com) and John\'s EA (lisa@company.com) will coordinate the scheduling.',
  meetingWithSpecificConstraints: 'Need to schedule a 2-hour strategy session with Sid next week, but only on Tuesday or Wednesday, and only between 10am-2pm.'
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
      const isValid = validateResult(result, testCase.expectedIntent, testCase.expectedKeywords);
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
function validateResult(result: CalendarIntent, expected: Partial<CalendarIntent>, expectedKeywords?: string[]): boolean {
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

// Helper function to create email thread content with multiple messages
function createEmailThread(messages: Array<{
  from: string;
  to: string;
  cc: string;
  date: string;
  content: string;
}>): string {
  return messages.map(msg => 
    `From: ${msg.from}
To: ${msg.to}
CC: ${msg.cc}
Date: ${msg.date}

${msg.content}

---`
  ).join('\n\n');
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('🧪 Testing Calendar Intent Extraction...\n');
  
  for (const testCase of testCases) {
    await runSingleTest(testCase);
  }
  
  console.log('🏁 All tests completed!');
}

// Single test runner for testInternalDate
async function runSingleTestOnly(): Promise<void> {
  console.log('🧪 Testing Calendar Intent Extraction - Internal Date Test...\n');
  
  await runSingleTest(testInternalDate);
  
  console.log('🏁 Test completed!');
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
    requestor: 'Sid',
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
    requestor: 'Samantha',
    participants: 'karmen@company.com',
    executive_assistants: 'samantha@company.com',
    silent_observers: 'mike.chen@company.com,john.smith@external.com'
  }
};

const testBookTimeRequestFromEA: TestCase = {
  name: 'bookTimeRequestFromEA',
  message: {
    ...testSuggestionRequestFromEA.message,
    content: contents.bookTimeRequestFromEA
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Samantha',
    participants: 'karmen@company.com',
    executive_assistants: 'samantha@company.com',
    silent_observers: 'mike.chen@company.com,john.smith@external.com'
  }
};

const testUrgentMeetingRequest: TestCase = {
  name: 'urgentMeetingRequest',
  message: {
    from: identities.colleague,
    to: identities.ashley,
    cc: '',
    date: dates.friday,
    subject: 'URGENT: Crisis Discussion',
    content: contents.urgentMeetingRequest
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike',
    participants: 'mike.chen@company.com',
    executive_assistants: '',
    silent_observers: ''
  }
};

const testAvailabilityCheck: TestCase = {
  name: 'availabilityCheck',
  message: {
    from: identities.externalPerson,
    to: identities.ashley,
    cc: '',
    date: dates.monday,
    subject: 'Availability Check',
    content: contents.availabilityCheck
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'John',
    participants: 'john.smith@external.com'
  }
};

const testExternalClientMeeting: TestCase = {
  name: 'externalClientMeeting',
  message: {
    from: identities.colleague,
    to: identities.ashley,
    cc: '',
    date: dates.monday,
    subject: 'Client Meeting Request',
    content: contents.externalClientMeeting
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike'
  }
};

const testTeamMeetingWithMultipleEAs: TestCase = {
  name: 'teamMeetingWithMultipleEAs',
  message: {
    from: identities.colleague,
    to: identities.ashley,
    cc: '',
    date: dates.monday,
    subject: 'Marketing Team Meeting',
    content: contents.teamMeetingWithMultipleEAs
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike',
    participants: 'mike.chen@company.com',
    executive_assistants: 'sarah@company.com,lisa@company.com'
  }
};

const testMeetingWithSpecificConstraints: TestCase = {
  name: 'meetingWithSpecificConstraints',
  message: {
    from: identities.colleague,
    to: identities.ashley,
    cc: '',
    date: dates.monday,
    subject: 'Strategy Session',
    content: contents.meetingWithSpecificConstraints
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike',
    participants: 'mike.chen@company.com'
  }
};

const testMultiTurnConversation: TestCase = {
  name: 'multiTurnConversation',
  message: {
    from: identities.colleague,
    to: identities.ashley,
    cc: '',
    date: dates.friday,
    subject: 'Re: Strategy Meeting',
    content: createEmailThread([
      {
        from: identities.colleague,
        to: identities.ashley,
        cc: '',
        date: '2025-07-30 14:30:00',
        content: `Thanks for checking. Unfortunately, I can't make Tuesday or Wednesday due to client meetings. 

How about Thursday at 2pm? I can do a 1-hour session then. Let me know if that works for Sid.`
      },
      {
        from: identities.ashley,
        to: identities.colleague,
        cc: '',
        date: '2025-07-30 10:00:00',
        content: `Hi Mike,

I checked Sid's availability for next week. He's free on Tuesday at 2pm and Wednesday at 10am. Which works better for you?

Best,
Ashley`
      },
      {
        from: identities.colleague,
        to: identities.ashley,
        cc: '',
        date: '2025-07-29 14:30:00',
        content: `Hi Ashley,

Could you check Sid's availability for next week?

Best,
Mike`
      }
    ])
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike',
    participants: 'mike.chen@company.com'
  },
  expectedKeywords: ['thursday', '2pm', 'tuesday', 'wednesday']
};

const testComplexMultiTurnConversation: TestCase = {
  name: 'complexMultiTurnConversation',
  message: {
    from: identities.colleague,
    to: identities.ashley,
    cc: 'sarah.johnson@company.com',
    date: dates.friday,
    subject: 'Re: Quarterly Review Meeting',
    content: createEmailThread([
      {
        from: identities.ashley,
        to: identities.colleague,
        cc: '',
        date: '2025-07-29 09:15:00',
        content: `Hi Mike,

I can see you're looking to schedule a quarterly review meeting. I have some time slots available next week:

Monday: 10am-12pm, 2pm-4pm
Tuesday: 9am-11am, 3pm-5pm
Wednesday: 11am-1pm, 4pm-6pm
Thursday: 10am-12pm, 2pm-4pm

Let me know which works best for you and Sarah.

Best,
Ashley`
      },
      {
        from: identities.colleague,
        to: identities.ashley,
        cc: 'sarah.johnson@company.com',
        date: '2025-07-30 16:45:00',
        content: `Hi Ashley,

Thanks for your suggestions. Here's the situation:

- Sarah and I can't do Monday due to the board meeting
- Tuesday morning is out because I have a client call at 10am
- Wednesday afternoon works for Sarah but I have a 3pm deadline
- We could do the second slot you propose on Thursday. If that still works, please book it.

Also, please include our VP of Operations (john.doe@company.com) in the meeting.

Thanks!
Mike`
      }
    ])
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike',
    participants: 'mike.chen@company.com,sarah.johnson@company.com,john.doe@company.com'
  },
  expectedKeywords: ['thursday', 'monday', 'tuesday', 'wednesday']
};

// Add a new test case for a longer thread with multiple participants
const testLongEmailThread: TestCase = {
  name: 'longEmailThread',
  message: {
    from: identities.executiveAssistant,
    to: identities.ashley,
    cc: 'karmen@company.com, lisa@company.com',
    date: dates.friday,
    subject: 'Re: Re: Re: Executive Strategy Session',
    content: createEmailThread([
      {
        from: 'Karmen <karmen@company.com>',
        to: identities.executiveAssistant,
        cc: '',
        date: '2025-07-28 08:00:00',
        content: `Samantha,

I need to meet with Sid to discuss the Q4 strategy. Can you coordinate with Ashley to find a 2-hour slot next week? I'm available any day except Tuesday.

Thanks,
Karmen`
      },
      {
        from: identities.executiveAssistant,
        to: identities.ashley,
        cc: '',
        date: '2025-07-28 10:30:00',
        content: `Hi Ashley,

Karmen needs to meet with Sid for a 2-hour strategy session next week. She's available Monday, Wednesday, Thursday, and Friday. Any time between 9am-5pm works for her.

Can you check Sid's availability?

Thanks,
Samantha`
      },
      {
        from: identities.ashley,
        to: identities.executiveAssistant,
        cc: '',
        date: '2025-07-29 14:20:00',
        content: `Hi Samantha,

I checked Sid's calendar. He has these slots available next week:

Monday: 1pm-3pm
Wednesday: 10am-12pm, 2pm-4pm
Thursday: 9am-11am, 3pm-5pm
Friday: 11am-1pm

Which works best for Karmen?

Best,
Ashley`
      },
      {
        from: identities.executiveAssistant,
        to: identities.ashley,
        cc: '',
        date: '2025-07-30 11:15:00',
        content: `Hi Ashley,

Karmen's availability changed. She cannot meet any day other than Friday. If Friday still works, please book the slot you proposed. But shorten it to the first hour only. Also, she'd like to include Lisa from Marketing (lisa@company.com) in the meeting.

Thanks,
Samantha`
      }
    ])
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Samantha',
    participants: 'karmen@company.com,lisa@company.com',
    executive_assistants: 'samantha@company.com'
  },
  expectedKeywords: ['friday', '11am-12pm', 'q4']
};

const testInternalDate: TestCase = {
  name: 'testInternalDate',
  message: {
    from: identities.sid,
    to: identities.ashley,
    cc: '',
    date: '1754329721000',
    subject: 'Meeting Request',
    content: 'Hi Ashley, can you please block 5-6pm today for a meeting with friends?'
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Sid',
    participants: '',
    timerange_start: '2025-08-04 17:00',
    timerange_end: '2025-08-04 18:00'
  }
};

// Test cases - composed from modular components
const testCases: TestCase[] = [
  testRequestFromSidToBookTime,
  testNonCalendarMessage,
  testSuggestionRequestFromEA,
  testBookTimeRequestFromEA,
  testUrgentMeetingRequest,
  testAvailabilityCheck,
  testExternalClientMeeting,
  testTeamMeetingWithMultipleEAs,
  testMeetingWithSpecificConstraints,
  testMultiTurnConversation,
  testComplexMultiTurnConversation,
  testLongEmailThread,
  testInternalDate
];

// Run the tests
runAllTests(); 