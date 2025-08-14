import * as b from './baml_client';

// Test data structures
interface EmailMessage {
  from: string;
  to: string;
  cc: string;
  date: string;
  subject: string;
  content: string;
  conversationHistory?: EmailMessage[];
}

interface IntentTestCase {
  name: string;
  message: EmailMessage;
  expectedIntent?: any;
  expectedKeywords?: string[];
}

// Helper function to convert email to string format
function emailToString(email: EmailMessage): string {
  let emailString = `From: ${email.from}\nTo: ${email.to}`;
  if (email.cc) emailString += `\nCC: ${email.cc}`;
  emailString += `\nDate: ${email.date}\nSubject: ${email.subject}\n\n${email.content}`;
  
  if (email.conversationHistory && email.conversationHistory.length > 0) {
    emailString += '\n\n--- Previous Messages ---\n';
    email.conversationHistory.forEach((msg, index) => {
      emailString += `\n[${index + 1}] From: ${msg.from}\nTo: ${msg.to}`;
      if (msg.cc) emailString += `\nCC: ${msg.cc}`;
      emailString += `\nDate: ${msg.date}\n${msg.content}\n`;
    });
  }
  
  return emailString;
}

// Test runner function
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

async function runSingleTestOnly(testCase: IntentTestCase): Promise<void> {
  console.log('🚀 Running single test case...\n');
  await runIntentTest(testCase);
  console.log('🏁 Test completed!');
}

// @smoke - Core intent detection for basic meeting requests
const testRequestFromSidToBookTime: IntentTestCase = {
  name: 'requestFromSidToBookTime',
  message: {
    from: identities.sid,
    to: identities.ashley,
    cc: '',
    date: dates.monday,
    subject: 'Meeting Request',
    content: contents.requestFromSidToBookTime
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Sid',
    participants: 'alice@company.com'
  }
};

// @smoke - Non-calendar message detection (negative case)
const testNonCalendarMessage: IntentTestCase = {
  name: 'nonCalendarMessage',
  message: {
    from: identities.colleague,
    to: identities.ashley,
    cc: '',
    date: dates.tuesday,
    subject: 'Project Update',
    content: contents.nonCalendarMessage
  },
  expectedIntent: {
    action_needed: false
  }
};

const testSuggestionRequestFromEA: IntentTestCase = {
  name: 'suggestionRequestFromEA',
  message: {
    from: identities.executiveAssistant,
    to: identities.ashley,
    cc: '',
    date: dates.wednesday,
    subject: 'Meeting Scheduling',
    content: contents.suggestionRequestFromEA
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Samantha'
  }
};

// @smoke - Executive assistant booking requests
const testBookTimeRequestFromEA: IntentTestCase = {
  name: 'bookTimeRequestFromEA',
  message: {
    from: identities.executiveAssistant,
    to: identities.ashley,
    cc: '',
    date: dates.thursday,
    subject: 'Calendar Booking',
    content: contents.bookTimeRequestFromEA
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Samantha',
    participants: 'karmen@company.com'
  }
};

const testAvailabilityCheck: IntentTestCase = {
  name: 'availabilityCheck',
  message: {
    from: identities.colleague,
    to: identities.ashley,
    cc: '',
    date: dates.friday,
    subject: 'Availability Check',
    content: contents.availabilityCheck
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike'
  }
};

const testExternalClientMeeting: IntentTestCase = {
  name: 'externalClientMeeting',
  message: {
    from: identities.colleague,
    to: identities.ashley,
    cc: '',
    date: dates.monday,
    subject: 'Client Meeting Setup',
    content: contents.externalClientMeeting
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike',
    participants: 'mike.chen@company.com'
  }
};

const testTeamMeetingWithMultipleEAs: IntentTestCase = {
  name: 'teamMeetingWithMultipleEAs',
  message: {
    from: identities.executiveAssistant,
    to: identities.ashley,
    cc: 'lisa@company.com',
    date: dates.tuesday,
    subject: 'Team Meeting Coordination',
    content: contents.teamMeetingWithMultipleEAs
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Samantha',
    participants: 'karmen@company.com',
    executive_assistants: 'samantha@company.com,lisa@company.com'
  }
};

const testReschedulingRequest: IntentTestCase = {
  name: 'reschedulingRequest',
  message: {
    from: identities.colleague,
    to: identities.ashley,
    cc: '',
    date: dates.wednesday,
    subject: 'Reschedule Meeting',
    content: contents.reschedulingRequest
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike'
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
    content: contents.multiTurnConversation,
    conversationHistory: [
      {
        from: identities.colleague,
        to: identities.ashley,
        cc: '',
        date: dates.thursday,
        content: `Hi Ashley,

I need to schedule a strategy meeting with Sid for next week. I'm available:
- Tuesday 2-4pm
- Wednesday 10am-12pm  
- Thursday 3-5pm

Can you check his availability?

Best,
Mike`
      }
    ]
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike'
  },
  expectedKeywords: ['thursday', 'strategy', 'meeting']
};

const testComplexMultiTurnConversation: IntentTestCase = {
  name: 'complexMultiTurnConversation',
  message: {
    from: identities.colleague,
    to: identities.ashley,
    cc: 'sarah.johnson@company.com',
    date: dates.friday,
    subject: 'Re: Strategy Meeting - Updated Requirements',
    content: contents.complexMultiTurnConversation,
    conversationHistory: [
      {
        from: identities.colleague,
        to: identities.ashley,
        cc: 'sarah.johnson@company.com',
        date: dates.thursday,
        content: `Hi Ashley,

I need to schedule a strategy meeting with Sid and Sarah for next week. We also need John Doe from the product team to join. I'm available:
- Monday 2-4pm
- Tuesday 10am-12pm  
- Wednesday 3-5pm
- Thursday 1-3pm

Can you coordinate with everyone?

Best,
Mike`
      }
    ]
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike',
    participants: 'sarah.johnson@company.com,john.doe@company.com'
  },
  expectedKeywords: ['thursday', 'monday', 'tuesday', 'wednesday']
};

const testLongEmailThread: IntentTestCase = {
  name: 'longEmailThread',
  message: {
    from: identities.executiveAssistant,
    to: identities.ashley,
    cc: 'lisa@company.com',
    date: '2025-07-30 09:15:00',
    subject: 'Re: Q4 Strategy Meeting - Final Confirmation',
    content: `Hi Ashley,

After reviewing everyone's feedback, Karmen has decided she needs Lisa to join the strategy meeting as well. Can you please:

1. Add Lisa to the meeting
2. Extend the duration to 2.5 hours 
3. Find a new slot that works for all three of them

Thanks,
Samantha`,
    conversationHistory: [
      {
        from: identities.colleague,
        to: identities.ashley,
        cc: 'karmen@company.com',
        date: '2025-07-29 14:30:00',
        content: `Hi Ashley,

Could you check Sid's availability for a strategy session next week? I need about 2 hours with him and Karmen to go over the Q4 planning.

Best,
Mike`
      },
      {
        from: identities.ashley,
        to: identities.colleague,
        cc: 'karmen@company.com',
        date: '2025-07-29 16:45:00',
        content: `Hi Mike,

I found some options for next week:

Tuesday: 10am-12pm, 2pm-4pm
Wednesday: 9am-11am, 3pm-5pm
Thursday: 11am-1pm, 4pm-6pm
Friday: 10am-12pm, 1pm-3pm

Let me know which works best for you and Karmen.

Best,
Ashley`
      }
    ]
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Samantha',
    participants: 'karmen@company.com,lisa@company.com'
  }
};

// @smoke - Date interpretation for "today" requests
const testInternalDate: IntentTestCase = {
  name: 'testInternalDate',
  message: {
    from: identities.sid,
    to: identities.ashley,
    cc: '',
    date: '2025-07-29 10:00:00',
    subject: 'Meeting Today',
    content: `Hi Ashley,

Can you schedule a 1-hour meeting with Alice for today at 3pm?

Thanks,
Sid`
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Sid',
    participants: 'alice@company.com',
    timerange_start: '2025-07-29 15:00',
    timerange_end: '2025-07-29 16:00'
  }
};

const testDateInterpretationFix: IntentTestCase = {
  name: 'dateInterpretationFix',
  message: {
    from: identities.colleague,
    to: identities.ashley,
    cc: '',
    date: '2025-07-29 14:30:00',
    subject: 'Meeting Next Week',
    content: `Hi Ashley,

Can you schedule a meeting with Sid for next week? I'm flexible on timing.

Best,
Mike`
  },
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike',
    timerange_start: '2025-08-04',
    timerange_end: '2025-08-08'
  }
};

// Validation function
function validateCalendarIntent(result: any, expected: any, expectedKeywords?: string[]): boolean {
  let isValid = true;
  
  for (const [key, value] of Object.entries(expected)) {
    if (result[key] !== value) {
      console.log(`   ❌ Expected ${key}: ${value}, got: ${result[key]}`);
      isValid = false;
    }
  }
  
  if (expectedKeywords) {
    const resultString = JSON.stringify(result).toLowerCase();
    for (const keyword of expectedKeywords) {
      if (!resultString.includes(keyword.toLowerCase())) {
        console.log(`   ❌ Expected keyword "${keyword}" not found in result`);
        isValid = false;
      }
    }
  }
  
  return isValid;
}

// Test data constants
const identities = {
  sid: 'sid.mathur@gmail.com',
  ashley: 'ashley@company.com',
  colleague: 'mike.chen@company.com',
  executiveAssistant: 'samantha@company.com'
};

const dates = {
  monday: '2025-07-28 09:00:00',
  tuesday: '2025-07-29 10:30:00',
  wednesday: '2025-07-30 14:15:00',
  thursday: '2025-07-31 11:45:00',
  friday: '2025-08-01 16:20:00'
};

const contents = {
  requestFromSidToBookTime: `Hi Ashley,

Can you schedule a 1-hour meeting with Alice (alice@company.com) for next Tuesday at 2pm?

Thanks,
Sid`,

  nonCalendarMessage: `Hi Ashley,

Just wanted to give you a quick update on the project status. Everything is on track and we should be ready for the demo next week.

Let me know if you need anything else.

Best,
Mike`,

  suggestionRequestFromEA: `Hi Ashley,

Karmen needs to meet with Sid sometime next week for about an hour. Can you suggest some times that work for both of them?

Thanks,
Samantha`,

  bookTimeRequestFromEA: `Hi Ashley,

Please book a 90-minute strategy session between Karmen (karmen@company.com) and Sid for Thursday afternoon if possible.

Best,
Samantha`,

  availabilityCheck: `Hi Ashley,

Is Sid available for a quick 30-minute call this Friday afternoon?

Thanks,
Mike`,

  externalClientMeeting: `Hi Ashley,

I need to set up a client meeting with Sid. The client is flexible but prefers mornings. Can you coordinate?

Best,
Mike`,

  teamMeetingWithMultipleEAs: `Hi Ashley,

Karmen would like to schedule a team meeting with Sid. Lisa and I will be coordinating the logistics. Can you help find a suitable time?

Thanks,
Samantha`,

  reschedulingRequest: `Hi Ashley,

We need to reschedule the meeting we had planned for tomorrow. Can you suggest some alternative times?

Thanks,
Mike`,

  multiTurnConversation: `Thanks for checking. Unfortunately, I can't make Tuesday or Wednesday due to client meetings. 

How about Thursday at 2pm? I can do a 1-hour session then. Let me know if that works for Sid.`,

  complexMultiTurnConversation: `Hi Ashley,

Thanks for your suggestions. Here's the situation:

- Sarah and I can't do Monday due to the board meeting
- Tuesday morning is out because I have a client call at 10am
- Wednesday afternoon works for Sarah but I have a 3pm deadline
- We could do the second slot you proposed on Thursday. If that still works, please book it.

Also, please include our VP of Operations (john.doe@company.com) in the meeting.

Thanks!
Mike`
};

// Test cases array
const intentTestCases: IntentTestCase[] = [
  testRequestFromSidToBookTime,
  testNonCalendarMessage,
  testSuggestionRequestFromEA,
  testBookTimeRequestFromEA,
  testAvailabilityCheck,
  testExternalClientMeeting,
  testTeamMeetingWithMultipleEAs,
  testReschedulingRequest,
  testMultiTurnConversation,
  testComplexMultiTurnConversation,
  testLongEmailThread,
  testInternalDate,
  testDateInterpretationFix
];

// Main execution
async function runAllIntentTests(): Promise<void> {
  console.log('🚀 Starting Intent Extraction Tests...\n');
  
  for (const testCase of intentTestCases) {
    await runIntentTest(testCase);
  }
  
  console.log('🏁 All tests completed!');
}

// Run all tests
runAllIntentTests();