import { CalendarIntent } from './baml_client/types';
import { b } from './baml_client';

interface IntentTestCase {
  name: string;
  emailContent: string;
  expectedIntent?: Partial<CalendarIntent>;
}

// Test runner for intent detection
export async function runIntentTest(testCase: IntentTestCase): Promise<boolean> {
  console.log(`📝 Test: ${testCase.name}`);
  
  // Print input email
  console.log('   📧 Input Email:');
  console.log('   ' + testCase.emailContent.split('\n').join('\n   '));
  
  try {
    const intent = await b.ExtractCalendarIntent(testCase.emailContent);
    console.log('   🎯 Extracted Intent:', JSON.stringify(intent, null, 2));
    
    if (testCase.expectedIntent) {
      const isValid = validateIntent(intent, testCase.expectedIntent);
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

// Validation helper
function validateIntent(actual: CalendarIntent, expected: Partial<CalendarIntent>): boolean {
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual[key as keyof CalendarIntent];
    if (actualValue !== expectedValue) {
      console.log(`   ❌ Mismatch in ${key}: expected "${expectedValue}", got "${actualValue}"`);
      return false;
    }
  }
  return true;
}

// Main test runner
async function runAllIntentTests(): Promise<void> {
  console.log('🧪 Testing Intent Extraction...\n');
  
  const results: { name: string; passed: boolean }[] = [];
  
  for (const testCase of intentTestCases) {
    const passed = await runIntentTest(testCase);
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

// @smoke
const testBasicBookingRequest: IntentTestCase = {
  name: 'Basic Booking Request',
  emailContent: `
Subject: Meeting Request - Project Discussion

Hi Sid,

I hope you're doing well. I'd like to schedule a 30-minute meeting with you next Tuesday at 2pm to discuss the new project proposal. Please let me know if this time works for you.

Best regards,
Sarah Johnson
sarah@company.com
  `,
  expectedIntent: {
    action_needed: true,
    requestor: "sarah@company.com",
    participants: "sarah@company.com"
  }
};

const testNoActionNeeded: IntentTestCase = {
  name: 'No Action Needed',
  emailContent: `
Subject: Thank you for yesterday's meeting

Hi Sid,

Thank you for the productive meeting yesterday. I'll follow up with the team and get back to you with our proposal by Friday.

Best,
Mike
mike@startup.com
  `,
  expectedIntent: {
    action_needed: false
  }
};

// @smoke
const testEABookingRequest: IntentTestCase = {
  name: 'EA Booking Request',
  emailContent: `
Subject: Meeting Request for Mr. Smith

Dear Sid,

I am writing on behalf of Mr. John Smith, CEO of TechCorp. He would like to schedule a 45-minute meeting with you next week to discuss potential partnership opportunities. 

Please let me know your availability.

Best regards,
Lisa Chen
Executive Assistant to John Smith
lisa.chen@techcorp.com
  `,
  expectedIntent: {
    action_needed: true,
    requestor: "lisa.chen@techcorp.com",
    executive_assistants: "lisa.chen@techcorp.com"
  }
};

const testMultiParticipantRequest: IntentTestCase = {
  name: 'Multi-Participant Request',
  emailContent: `
Subject: Team Meeting Request

Hi Sid,

Can we schedule a team meeting for next Thursday at 3pm? The attendees will be:
- myself (team-lead@company.com)
- John (john@company.com) 
- Mary (mary@company.com)

We need about 60 minutes to discuss the quarterly planning.

Thanks,
Team Lead
team-lead@company.com
  `,
  expectedIntent: {
    action_needed: true,
    requestor: "team-lead@company.com",
    participants: "team-lead@company.com, john@company.com, mary@company.com"
  }
};

const testTimeRangeExtraction: IntentTestCase = {
  name: 'Time Range Extraction',
  emailContent: `
Subject: Meeting Request - Urgent

Hi Sid,

I need to schedule a meeting with you sometime between Monday 2pm and Wednesday 4pm next week. It's regarding the client presentation. The meeting should be about 90 minutes.

Please confirm your availability.

Best,
Alex
alex@agency.com
  `,
  expectedIntent: {
    action_needed: true,
    requestor: "alex@agency.com",
    participants: "alex@agency.com"
  }
};

const testReschedulingRequest: IntentTestCase = {
  name: 'Rescheduling Request',
  emailContent: `
Subject: Need to Reschedule Tomorrow's Meeting

Hi Sid,

I need to reschedule our meeting that's planned for tomorrow at 10am. Can we move it to Thursday at the same time instead?

Sorry for the short notice.

Thanks,
David
david@consulting.com
  `,
  expectedIntent: {
    action_needed: true,
    requestor: "david@consulting.com"
  }
};

// @smoke
const testDateInterpretationFix: IntentTestCase = {
  name: 'Date Interpretation Fix',
  emailContent: `
Subject: Meeting for next week

Hi Sid,

Can we meet next Tuesday at 3pm? I'd like to discuss the quarterly results with you.

Best,
Jennifer
jennifer@finance.com
  `,
  expectedIntent: {
    action_needed: true,
    requestor: "jennifer@finance.com",
    participants: "jennifer@finance.com"
  }
};

const intentTestCases: IntentTestCase[] = [
  testBasicBookingRequest,
  testNoActionNeeded,
  testEABookingRequest,
  testMultiParticipantRequest,
  testTimeRangeExtraction,
  testReschedulingRequest,
  testDateInterpretationFix
];

// Run tests if this file is executed directly
if (require.main === module) {
  runAllIntentTests().catch(console.error);
}