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
    requestor: 'Mike'
  }
};

const testTeamMeetingWithMultipleEAs: IntentTestCase = {
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
    content: `Thanks for checking. Unfortunately, I can't make Tuesday or Wednesday due to client meetings. 

    How about Thursday at 2pm? I can do a 1-hour session then. Let me know if that works for Sid.`,
    conversationHistory: [
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
    subject: 'Re: Quarterly Review Meeting',
    content: `Hi Ashley,

Thanks for your suggestions. Here's the situation:

- Sarah and I can't do Monday due to the board meeting
- Tuesday morning is out because I have a client call at 10am
- Wednesday afternoon works for Sarah but I have a 3pm deadline
- We could do the second slot you propose on Thursday. If that still works, please book it.

Also, please include our VP of Operations (john.doe@company.com) in the meeting.

Thanks!
Mike`,
    conversationHistory: [
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
    cc: 'karmen@company.com, lisa@company.com',
    date: dates.friday,
    subject: 'Re: Re: Re: Executive Strategy Session',
    content: `Hi Ashley,

Karmen's availability changed. She cannot meet any day other than Friday. If Friday still works, please book the slot you proposed. But shorten it to the first hour only. Also, she'd like to include Lisa from Marketing (lisa@company.com) in the meeting.

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

// Test case for date interpretation fix - "next week" should be calculated from the email date that contains it
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