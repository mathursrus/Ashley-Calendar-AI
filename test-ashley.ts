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
    console.log(''); // Add spacing between tests
  }
  
  // Print summary
  console.log('\n📊 Test Summary:');
  results.forEach(result => {
    console.log(`   ${result.passed ? '✅' : '❌'} ${result.name}`);
  });
  
  const allPassed = results.every(r => r.passed);
  console.log(`\nOverall Result: ${allPassed ? '🎉 ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);
}

// @smoke - Core booking functionality
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

// @smoke - Conflict handling
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
  sidCalendarData: sidCalendarData.conflict,
  expectedResponse: {
    action: AshleyAction.ProposeAlternatives,
    send_calendar_invite: false
  }
};

const testBookTimeNoAction: AshleyTestCase = {
  name: 'BookTime - No Action Needed',
  calendarIntent: {
    action_needed: false,
    requestor: "info@company.com",
    participants: "",
    executive_assistants: "",
    silent_observers: "",
    timerange_start: "",
    timerange_end: "",
    request_details: "Thanks for the meeting yesterday. Looking forward to our next steps.",
    baseline_date: "2025-08-06"
  },
  sidCalendarData: sidCalendarData.available,
  expectedResponse: {
    action: AshleyAction.NoAction,
    send_calendar_invite: false
  }
};

// @smoke - External client meeting
const testExternalClientMeeting: AshleyTestCase = {
  name: 'External Client Meeting',
  calendarIntent: {
    action_needed: true,
    requestor: "client@external.com",
    participants: "client@external.com",
    executive_assistants: "",
    silent_observers: "",
    timerange_start: "2025-08-08 10:00",
    timerange_end: "2025-08-08 11:00",
    request_details: "Can we schedule a 30-minute call on Thursday at 10am to review the project proposal?",
    baseline_date: "2025-08-06"
  },
  sidCalendarData: sidCalendarData.available,
  expectedResponse: {
    action: AshleyAction.BookTime,
    send_calendar_invite: true,
    meeting_duration_minutes: 30,
    participants_to_invite: 'client@external.com'
  }
};

const testMultiParticipantMeeting: AshleyTestCase = {
  name: 'Multi-Participant Meeting',
  calendarIntent: {
    action_needed: true,
    requestor: "team-lead@company.com",
    participants: "team-lead@company.com, dev1@company.com, dev2@company.com",
    executive_assistants: "",
    silent_observers: "",
    timerange_start: "2025-08-09 14:00",
    timerange_end: "2025-08-09 15:30",
    request_details: "Let's schedule a 90-minute team planning session for Friday afternoon with the development team.",
    baseline_date: "2025-08-06"
  },
  sidCalendarData: sidCalendarData.available,
  expectedResponse: {
    action: AshleyAction.BookTime,
    send_calendar_invite: true,
    meeting_duration_minutes: 90,
    participants_to_invite: 'team-lead@company.com, dev1@company.com, dev2@company.com'
  }
};

const ashleyTestCases: AshleyTestCase[] = [
  testBookTimeAvailable,
  testBookTimeWithConflict,
  testBookTimeNoAction,
  testExternalClientMeeting,
  testMultiParticipantMeeting
];

// Run tests if this file is executed directly
if (require.main === module) {
  runAllAshleyTests().catch(console.error);
}