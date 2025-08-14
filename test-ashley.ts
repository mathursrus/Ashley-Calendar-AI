import * as b from './baml_client';

// Enum for Ashley's possible actions
enum AshleyAction {
  BookTime = 'BookTime',
  SuggestTimes = 'SuggestTimes',
  CheckAvailability = 'CheckAvailability',
  AskForClarification = 'AskForClarification'
}

// Test case interface
interface AshleyTestCase {
  name: string;
  calendarIntent: any;
  sidCalendarData: string;
  expectedResponse?: {
    action: AshleyAction;
    send_calendar_invite?: boolean;
    meeting_duration_minutes?: number;
    participants_to_invite?: string;
  };
}

// Validation function
function validateAshleyResponse(response: any, expected: any): boolean {
  let isValid = true;
  
  for (const [key, value] of Object.entries(expected)) {
    if (response[key] !== value) {
      console.log(`   ❌ Expected ${key}: ${value}, got: ${response[key]}`);
      isValid = false;
    }
  }
  
  return isValid;
}

// Test runner function
export async function runAshleyTest(testCase: AshleyTestCase): Promise<boolean> {
  console.log(`📝 Test: ${testCase.name}`);
  
  // Print input to Ashley
  console.log('   📥 Input to Ashley:');
  console.log('   Calendar Intent:', JSON.stringify(testCase.calendarIntent, null, 2));
  console.log('   Sid\'s Calendar Data:');
  console.log('   ' + testCase.sidCalendarData.split('\n').join('\n   '));
  
  try {
    const response = await b.AshleyCalendarAssistant(testCase.calendarIntent, testCase.sidCalendarData);
    console.log('   📧 Ashley\'s Response:');
    console.log('   ' + response.email_response.split('\n').join('\n   '));
    console.log('   📊 Result:', JSON.stringify(response, null, 2));
    
    if (testCase.expectedResponse) {
      const isValid = validateAshleyResponse(response, testCase.expectedResponse);
      console.log(`   ${isValid ? '✅' : '❌'} Validation: ${isValid ? 'PASSED' : 'FAILED'}`);
      return isValid;
    } else {
      console.log('   ✅ Success!');
      return true;
    }
  } catch (error) {
    console.error('   ❌ Error:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Main test runner
async function runAllAshleyTests(): Promise<void> {
  console.log('🚀 Starting Ashley Response Tests...\n');
  
  let passedTests = 0;
  let totalTests = ashleyTestCases.length;
  
  for (const testCase of ashleyTestCases) {
    const passed = await runAshleyTest(testCase);
    if (passed) passedTests++;
    console.log(''); // Add spacing between tests
  }
  
  const allPassed = passedTests === totalTests;
  console.log(`\nTest Results: ${passedTests}/${totalTests} tests passed`);
  console.log(`\nOverall Result: ${allPassed ? '🎉 ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);
}

// @smoke - Basic meeting booking with available calendar
const testBookTimeAvailable: AshleyTestCase = {
  name: 'BookTime - Available Calendar',
  calendarIntent: {
    action_needed: true,
    requestor: "Sid",
    participants: "alice@company.com",
    executive_assistants: "",
    silent_observers: "",
    timerange_start: "2025-08-05 14:00",
    timerange_end: "2025-08-05 15:00",
    request_details: "Can you schedule a 1-hour meeting with Alice for Tuesday, August 5th at 2pm?",
    baseline_date: "2025-08-01"
  },
  sidCalendarData: `
Tuesday, August 5, 2025:
- 9:00 AM - 10:00 AM: Team Standup
- 11:00 AM - 12:00 PM: Product Review

Wednesday, August 6, 2025:
- 10:00 AM - 11:00 AM: Client Meeting
- 1:00 PM - 2:00 PM: Design Review
- 3:00 PM - 4:00 PM: Marketing Sync
  `,
  expectedResponse: {
    action: AshleyAction.BookTime,
    send_calendar_invite: true,
    meeting_duration_minutes: 60,
    participants_to_invite: 'alice@company.com'
  }
};

// @smoke - Time suggestions for busy calendar
const testSuggestTimesBusy: AshleyTestCase = {
  name: 'SuggestTimes - Busy Calendar',
  calendarIntent: {
    action_needed: true,
    requestor: "Mike",
    participants: "sarah@company.com",
    executive_assistants: "",
    silent_observers: "",
    timerange_start: "2025-07-29 00:00",
    timerange_end: "2025-07-29 23:59",
    request_details: "I'd like to schedule a 1-hour meeting with Sid on Tuesday, July 29th to discuss the quarterly budget review.",
    baseline_date: "2025-07-29"
  },
  sidCalendarData: `
Tuesday, July 29, 2025:
- 9:00 AM - 10:00 AM: Team Standup
- 11:00 AM - 12:30 PM: Product Review
- 1:00 PM - 2:00 PM: Lunch Meeting
- 2:30 PM - 4:00 PM: Strategy Session
- 4:30 PM - 5:30 PM: Client Call
  `,
  expectedResponse: {
    action: AshleyAction.SuggestTimes,
    send_calendar_invite: false
  }
};

const testAskForClarification: AshleyTestCase = {
  name: 'AskForClarification - Vague Request',
  calendarIntent: {
    action_needed: true,
    requestor: "Mike",
    participants: "",
    executive_assistants: "",
    silent_observers: "",
    timerange_start: "",
    timerange_end: "",
    request_details: "I need to meet with Sid sometime next week.",
    baseline_date: "2025-07-20"
  },
  sidCalendarData: `
Monday, July 21, 2025:
- 9:00 AM - 10:00 AM: Team Standup
- 2:00 PM - 3:00 PM: Client Meeting

Tuesday, July 22, 2025:
- 10:00 AM - 11:00 AM: Product Review
- 3:00 PM - 4:00 PM: Design Review
  `,
  expectedResponse: {
    action: AshleyAction.AskForClarification,
    send_calendar_invite: false
  }
};

// @smoke - Availability check functionality
const testCheckAvailability: AshleyTestCase = {
  name: 'CheckAvailability - Specific Time Query',
  calendarIntent: {
    action_needed: true,
    requestor: "Mike",
    participants: "",
    executive_assistants: "",
    silent_observers: "",
    timerange_start: "2025-08-05 14:00",
    timerange_end: "2025-08-05 15:00",
    request_details: "Does Tuesday, August 5th at 2pm work for a 1-hour meeting?",
    baseline_date: "2025-08-01"
  },
  sidCalendarData: `
Tuesday, August 5, 2025:
- 9:00 AM - 10:00 AM: Team Standup
- 11:00 AM - 12:00 PM: Product Review
- 2:00 PM - 3:00 PM: Client Meeting

Wednesday, August 6, 2025:
- 10:00 AM - 11:00 AM: Client Meeting
- 1:00 PM - 2:00 PM: Design Review
- 3:00 PM - 4:00 PM: Marketing Sync
  `,
  expectedResponse: {
    action: AshleyAction.SuggestTimes,
    send_calendar_invite: false
  }
};

const testMeetingWithSpecificConstraints: AshleyTestCase = {
  name: 'MeetingWithSpecificConstraints - Product Team',
  calendarIntent: {
    action_needed: true,
    requestor: "Mike",
    participants: "mike.chen@company.com",
    executive_assistants: "",
    silent_observers: "",
    timerange_start: "2025-07-29 00:00",
    timerange_end: "2025-07-29 23:59",
    request_details: "Need to schedule a 90-minute product strategy session for Tuesday, July 29th. Prefer afternoon but flexible.",
    baseline_date: "2025-07-29"
  },
  sidCalendarData: `
Tuesday, July 29, 2025:
- 9:00 AM - 10:00 AM: Team Standup
- 2:00 PM - 3:30 PM: Product Review
- 4:00 PM - 5:00 PM: Strategy Session
  `,
  expectedResponse: {
    action: AshleyAction.SuggestTimes,
    send_calendar_invite: false
  }
};

const testEABookingRequestAvailable: AshleyTestCase = {
  name: 'EA Booking Request - Sid Available',
  calendarIntent: {
    action_needed: true,
    requestor: "Samantha",
    participants: "karmen@company.com",
    executive_assistants: "samantha@company.com",
    silent_observers: "",
    timerange_start: "2025-07-31 14:00",
    timerange_end: "2025-07-31 16:00",
    request_details: "Please book a 90-minute strategy session between Karmen and Sid for Thursday afternoon if possible.",
    baseline_date: "2025-07-29"
  },
  sidCalendarData: `
Thursday, July 31, 2025:
- 9:00 AM - 10:00 AM: Team Standup
- 11:00 AM - 12:00 PM: Product Review
  `,
  expectedResponse: {
    action: AshleyAction.BookTime,
    send_calendar_invite: true,
    meeting_duration_minutes: 90,
    participants_to_invite: 'karmen@company.com'
  }
};

const testEABookingRequestBusy: AshleyTestCase = {
  name: 'EA Booking Request - Sid Busy',
  calendarIntent: {
    action_needed: true,
    requestor: "Samantha",
    participants: "karmen@company.com",
    executive_assistants: "samantha@company.com",
    silent_observers: "",
    timerange_start: "2025-07-31 00:00",
    timerange_end: "2025-07-31 23:59",
    request_details: "Karmen needs to meet with Sid sometime on Thursday for about an hour. Can you suggest some times that work for both of them?",
    baseline_date: "2025-07-29"
  },
  sidCalendarData: `
Thursday, July 31, 2025:
- 9:00 AM - 10:00 AM: Team Standup
- 10:30 AM - 12:00 PM: Product Review
- 1:00 PM - 2:30 PM: Client Meeting
- 3:00 PM - 4:00 PM: Design Review
- 4:30 PM - 5:30 PM: Marketing Sync
  `,
  expectedResponse: {
    action: AshleyAction.SuggestTimes,
    send_calendar_invite: false
  }
};

// Test cases array
const ashleyTestCases: AshleyTestCase[] = [
  testBookTimeAvailable,
  testSuggestTimesBusy,
  testAskForClarification,
  testCheckAvailability,
  testMeetingWithSpecificConstraints,
  testEABookingRequestAvailable,
  testEABookingRequestBusy
];

// Run the tests
runAllAshleyTests();