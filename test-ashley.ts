import { sidCalendarData, validateAshleyResponse } from './test-utils';
import { CalendarIntent, AshleyAction, AshleyResponse } from './baml_client/types';
import { b } from './baml_client';

interface AshleyTestCase {
  name: string;
  calendarIntent: CalendarIntent;
  sidCalendarData: string;
  expectedResponse?: Partial<AshleyResponse>;
}

// Test runner for Ashley responses
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
  console.log('🧪 Testing Ashley Calendar Assistant...\n');
  
  const results: { name: string; passed: boolean }[] = [];
  
  for (const testCase of ashleyTestCases) {
    const passed = await runAshleyTest(testCase);
    results.push({ name: testCase.name, passed });
    console.log('');
  }
  
  // Summary
  console.log('🏁 Test Summary:');
  console.log('==================');
  results.forEach(result => {
    console.log(`${result.name}: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
  });
  
  const allPassed = results.every(r => r.passed);
  console.log(`\nOverall Result: ${allPassed ? '🎉 ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);
}

// @smoke - Basic meeting booking with available calendar
const testBookTimeAvailable: AshleyTestCase = {
  name: 'BookTime - Available Calendar',
  calendarIntent: {
    action_needed: true,
    requestor: "sarah@company.com",
    participants: "sarah@company.com",
    executive_assistants: "",
    silent_observers: "",
    timerange_start: "2025-08-05 15:00",
    timerange_end: "2025-08-07 15:00",
    request_details: "Please schedule a 45-minute meeting with Sid on either Tuesday, Wednesday or Thursday next week at 2pm to discuss the quarterly budget review.",
    baseline_date: "2025-07-05"
  },
  sidCalendarData: sidCalendarData.available,
  expectedResponse: {
    action: AshleyAction.BookTime,
    send_calendar_invite: true,
    meeting_duration_minutes: 45,
    participants_to_invite: 'sarah@company.com'
  }
};

const testBookTimeWithConflict: AshleyTestCase = {
  name: 'BookTime - With Conflict',
  calendarIntent: {
    action_needed: true,
    requestor: "mike@startup.com",
    participants: "mike@startup.com",
    executive_assistants: "",
    silent_observers: "",
    timerange_start: "2025-08-06 15:00",
    timerange_end: "2025-08-06 16:00",
    request_details: "I'd like to schedule a 1-hour meeting with Sid on Wednesday at 3pm to discuss our partnership.",
    baseline_date: "2025-08-06"
  },
  sidCalendarData: `
Wednesday, August 6, 2025:
- 9:00 AM - 10:00 AM: Team Standup
- 2:30 PM - 4:00 PM: Product Review Meeting
- 4:30 PM - 5:30 PM: Strategy Session
  `,
  expectedResponse: {
    action: AshleyAction.SuggestTimes,
    send_calendar_invite: false
  }
};

// @smoke - Time suggestions for busy calendar
const testSuggestTimesBusy: AshleyTestCase = {
  name: 'SuggestTimes - Busy Calendar',
  calendarIntent: {
    action_needed: true,
    requestor: "sarah@company.com",
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
    requestor: "sarah@company.com",
    participants: "sarah@company.com",
    executive_assistants: "",
    silent_observers: "",
    timerange_start: "2025-07-29 00:00",
    timerange_end: "2025-07-29 23:59",
    request_details: "I'd like to catch up.",
    baseline_date: "2025-07-29"
  },
  sidCalendarData: sidCalendarData.available,
  expectedResponse: {
    action: AshleyAction.AskForClarification,
    send_calendar_invite: false
  }
};

// @smoke - Availability check functionality
const testAvailabilityCheck: AshleyTestCase = {
  name: 'DoesTimeWork - Availability Check',
  calendarIntent: {
    action_needed: true,
    requestor: "alice@company.com",
    participants: "alice@company.com",
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

const testTeamMeetingWithMultipleEAs: AshleyTestCase = {
  name: 'TeamMeetingWithMultipleEAs - Marketing Team',
  calendarIntent: {
    action_needed: true,
    requestor: "Mike",
    participants: "mike.chen@company.com",
    executive_assistants: "sarah@company.com,lisa@company.com",
    silent_observers: "",
    timerange_start: "2025-07-29 00:00",
    timerange_end: "2025-07-29 23:59",
    request_details: "Marketing team meeting request for 30 mins next Tuesday (July 29). Need to coordinate with Sarah (Mike's EA) and Lisa (John's EA) for scheduling.",
    baseline_date: "2025-07-02"
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

const testExternalClientMeeting: AshleyTestCase = {
  name: 'ExternalClientMeeting - Acme Corp',
  calendarIntent: {
    action_needed: true,
    requestor: "Mike",
    participants: "client@acme.com,mike.chen@company.com",
    executive_assistants: "",
    silent_observers: "",
    timerange_start: "2025-07-31 12:00",
    timerange_end: "2025-07-31 17:00",
    request_details: "Request to send invite with following parameters:\n- Duration: 1.5 hours\n- Date: Next Thursday (July 31, 2025)\n- Time preference: Afternoon\n- Participants: Mike Chen and Acme Corp client\n\nAshley needs to find an afternoon slot on Thursday, July 31st for a 1.5-hour meeting.",
    baseline_date: "2025-07-16"
  },
  sidCalendarData: `
Thursday, July 31, 2025:
- 9:00 AM - 10:00 AM: Team Standup
- 1:00 PM - 2:00 PM: Lunch Meeting
- 3:30 PM - 4:30 PM: Focus Time
  `,
  expectedResponse: {
    action: AshleyAction.BookTime,
    send_calendar_invite: true,
    meeting_duration_minutes: 90,
    participants_to_invite: 'client@acme.com,mike.chen@company.com',
    meeting_start_time: "2025-07-31 14:00",
    meeting_end_time: "2025-07-31 15:30"
  }
};

const testEABookingRequestAvailable: AshleyTestCase = {
  name: 'EA Booking Request - Sid Available',
  calendarIntent: {
    action_needed: false,
    requestor: "Samantha",
    participants: "karmen@company.com",
    executive_assistants: "samantha@company.com",
    silent_observers: "",
    timerange_start: "2025-08-06 14:00",
    timerange_end: "2025-08-06 15:00",
    request_details: "I am sending an invite for a 1-hour meeting with Sid on Wednesday, August 6th at 2pm PT. ",
    baseline_date: "2025-08-02"
  },
  sidCalendarData: `
Wednesday, August 6, 2025:
- 9:00 AM - 10:00 AM: Team Standup
- 11:00 AM - 12:00 PM: Product Review
- 3:00 PM - 4:00 PM: Client Meeting
  `,
  expectedResponse: {
    action: AshleyAction.NoAction,
    send_calendar_invite: false
  }
};

const testEABookingRequestUnavailable: AshleyTestCase = {
  name: 'EA Booking Request - Sid Unavailable',
  calendarIntent: {
    action_needed: false,
    requestor: "Samantha",
    participants: "karmen@company.com",
    executive_assistants: "samantha@company.com",
    silent_observers: "",
    timerange_start: "2025-08-06 14:00",
    timerange_end: "2025-08-06 15:00",
    request_details: "I am sending an invite for a 1-hour meeting with Sid on Wednesday, August 6th at 2pm PT.",
    baseline_date: "2025-08-02"
  },
  sidCalendarData: `
Wednesday, August 6, 2025:
- 9:00 AM - 10:00 AM: Team Standup
- 11:00 AM - 12:00 PM: Product Review
- 1:30 PM - 3:30 PM: Strategy Session
- 4:00 PM - 5:00 PM: Client Meeting
  `,
  expectedResponse: {
    action: AshleyAction.SuggestTimes,
    send_calendar_invite: false
  }
};

// Test cases - composed from individual test definitions
const ashleyTestCases: AshleyTestCase[] = [
  testBookTimeAvailable,
  testBookTimeWithConflict,
  testSuggestTimesBusy,
  testAskForClarification,
  testAvailabilityCheck,
  testMeetingWithSpecificConstraints,
  testTeamMeetingWithMultipleEAs,
  testExternalClientMeeting,
  testEABookingRequestAvailable,
  testEABookingRequestUnavailable
];

// Run the tests
runAllAshleyTests();