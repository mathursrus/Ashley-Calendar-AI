import { identities, lists, dates, subjects, contents, EmailMessage, createEmailThread, emailToString, validateCalendarIntent } from './test-utils';
import { CalendarIntent } from './baml_client/types';
import { b } from './baml_client';

// Test case interfaces
interface IntentTestCase {
  name: string;
  message: EmailMessage;
  expectedIntent?: Partial<CalendarIntent>;
  expectedKeywords?: string[]; // For testing request_details content
}

// Test runner for intent extraction
export async function runIntentTest(testCase: IntentTestCase): Promise<void> {
  console.log(`📝 Test: ${testCase.name}`);
  
  try {
    const emailString = emailToString(testCase.message);
    console.log('   📧 Email sent to API:');
    console.log('   ' + emailString.split('\n').join('\n   '));
    const result = await b.ExtractCalendarIntent(emailString);
    console.log('   📊 Result:', JSON.stringify(result, null, 2));
    
    if (testCase.expectedIntent) {
      const isValid = validateCalendarIntent(result, testCase.expectedIntent, testCase.expectedKeywords);
      console.log(`   ${isValid ? '✅' : '❌'} Validation: ${isValid ? 'PASSED' : 'FAILED'}`);
    } else {
      console.log('   ✅ Success!');
    }
  } catch (error) {
    console.error('   ❌ Error:', error instanceof Error ? error.message : String(error));
  }
  
  console.log('');
}

// Main test runner
async function runAllTests(): Promise<void> {
  console.log('🧪 Testing Calendar Intent Extraction...\n');
  
  for (const testCase of testCases) {
    await runIntentTest(testCase);
  }
  
  console.log('🏁 All tests completed!');
}

// Single test runner for testInternalDate
async function runSingleTestOnly(testCase: IntentTestCase): Promise<void> {
  console.log(`🧪 Testing Calendar Intent Extraction - ${testCase.name}...\n`);
  
  await runIntentTest(testCase);
  
  console.log('🏁 Test completed!');
}

// @smoke - Core booking request from Sid
const testRequestFromSidToBookTime: IntentTestCase = {
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

const testNonCalendarMessage: IntentTestCase = {
  name: 'nonCalendarMessage',
  message: {
    ...testRequestFromSidToBookTime.message,
    content: contents.nonCalendarMessage
  },
  expectedIntent: {
    action_needed: false
  }
};

const testSuggestionRequestFromEA: IntentTestCase = {
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

// @smoke - EA booking request handling
const testBookTimeRequestFromEA: IntentTestCase = {
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

const testUrgentMeetingRequest: IntentTestCase = {
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

const testAvailabilityCheck: IntentTestCase = {
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

const testExternalClientMeeting: IntentTestCase = {
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
    requestor: 'Mike',
    participants: 'client@acme.com,mike.chen@company.com'
  }
};

const testTeamMeetingWithMultipleEAs: IntentTestCase = {
  name: 'teamMeetingWithMultipleEAs',
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

const testMeetingWithSpecificConstraints: IntentTestCase = {
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

const testMultiTurnConversation: IntentTestCase = {
  name: 'multiTurnConversation',
  message: {
    from: identities.colleague,
    to: identities.ashley,
    cc: '',
    date: dates.friday,
    subject: 'Re: Strategy Meeting',
    content: `Actually, let's make it Thursday at 2pm instead. If that doesn't work, Tuesday or Wednesday afternoon would be fine too.

Best,
Mike`,
    conversationHistory: [
      {
        from: identities.colleague,
        to: identities.ashley,
        cc: '',
        date: dates.monday,
        content: `Hi Ashley,

Can you schedule a 1-hour strategy meeting with Sid for next week? I'm thinking Monday morning would be ideal.

Thanks,
Mike`
      }
    ]
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike',
    participants: 'mike.chen@company.com'
  },
  expectedKeywords: ['thursday', '2pm', 'tuesday', 'wednesday']
};

const testComplexMultiTurnConversation: IntentTestCase = {
  name: 'complexMultiTurnConversation',
  message: {
    from: identities.colleague,
    to: identities.ashley,
    cc: 'sarah.johnson@company.com',
    date: dates.friday,
    subject: 'Re: Team Strategy Session',
    content: `Perfect! Let's finalize it for Thursday then. Please include John Doe as well - john.doe@company.com.

So the final attendees should be:
- Me (Mike)
- Sarah Johnson 
- John Doe

Looking forward to it!

Mike`,
    conversationHistory: [
      {
        from: identities.ashley,
        to: identities.colleague,
        cc: 'sarah.johnson@company.com',
        date: dates.thursday,
        content: `Hi Mike,

I found these available slots for your team meeting next week:

Monday: 2pm-4pm
Tuesday: 10am-12pm
Wednesday: 3pm-5pm  
Thursday: 1pm-3pm

Which works best for everyone?

Best,
Ashley`
      }
    ]
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike',
    participants: 'mike.chen@company.com,sarah.johnson@company.com,john.doe@company.com'
  },
  expectedKeywords: ['thursday', 'monday', 'tuesday', 'wednesday']
};

// Add a new test case for a longer thread with multiple participants
const testLongEmailThread: IntentTestCase = {
  name: 'longEmailThread',
  message: {
    from: identities.executiveAssistant,
    to: identities.ashley,
    cc: '',
    date: '2025-07-30 09:00:00',
    subject: 'Re: Strategy Session Coordination',
    content: `Hi Ashley,

Following up on Karmen's request. She confirmed she can do any of the slots you mentioned, but prefers Wednesday 2pm-4pm if Sid is available then. 

Also, Lisa (John's EA) asked me to include her as a silent observer for coordination purposes.

Please let me know if Wednesday works!

Thanks,
Samantha`,
    conversationHistory: [
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
      }
    ]
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Samantha',
    participants: 'karmen@company.com,lisa@company.com',
    executive_assistants: 'samantha@company.com'
  }
};

const testInternalDate: IntentTestCase = {
  name: 'testInternalDate',
  message: {
    from: identities.sid,
    to: identities.ashley,
    cc: '',
    date: dates.internalDate,
    subject: 'Meeting Request',
    content: 'Hi Ashley, can you please block 5-6pm today for a meeting with friends?'
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Sid',
    participants: '',
    timerange_start: '2025-08-04 00:00',
    timerange_end: '2025-08-04 23:59',
    baseline_date: '2025-08-04'
  }
};

// @smoke - Date interpretation and conversation history handling
const testDateInterpretationFix: IntentTestCase = {
  name: 'dateInterpretationFix',
  message: {
    from: identities.colleague,
    to: identities.ashley,
    date: dates.internalDate, // August 4, 2025 (current email)
    subject: 'Re: Meeting with Sarah next week',
    content: 'Actually, please make that meeting 30 minutes and book it whenever Sid has time',
    conversationHistory: [
      {
        date: 'Tue, July 29, 2025 at 10:01 AM',
        from: identities.ashley,
        content: 'I\'d be happy to help schedule a 1-hour meeting with Sarah Johnson. I have several time slots available next week...',
      },
      {
        date: 'Tue, July 28, 2025 at 10:00 AM', // This email contains "next week"
        from: identities.colleague,
        content: 'Hi Ashley, can you schedule a 1-hour meeting with Sarah Johnson (sarah.j@company.com) sometime next week? I\'m flexible on timing. Thanks, Mike (Assistant to Sarah)'
      },
    ],
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike',
    participants: 'sarah.j@company.com',
    // "next week" from July 28, 2025 should be August 4-8, 2025 (not August 11-15)
    timerange_start: '2025-08-04 00:00',
    timerange_end: '2025-08-08 23:59',
    baseline_date: '2025-07-28'
  }
};


// Test cases - composed from modular components
const testCases: IntentTestCase[] = [
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
  testInternalDate,
  testDateInterpretationFix
];

// Run the tests
runAllTests(); 
// runSingleTestOnly(testDateInterpretationFix);