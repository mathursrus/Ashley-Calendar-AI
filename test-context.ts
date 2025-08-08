import * as dotenv from 'dotenv';
import { b } from './baml_client';
import { CalendarIntent, AshleyResponse, AshleyAction } from './baml_client/types';
import { setLogLevel } from './baml_client/config';
import { identities, dates, EmailMessage, sidCalendarData, emailToString, validateCalendarIntent, validateAshleyResponse, subjects } from './test-utils';

// Set BAML log level to error to reduce noise
setLogLevel('error');

// Load environment variables from .env file
dotenv.config();

// Context Memory Test Case interface
interface ContextMemoryTestCase {
  name: string;
  email: EmailMessage;
  sidCalendarData: string;
  expectedIntent?: Partial<CalendarIntent>;
  expectedAshleyResponse?: Partial<AshleyResponse>;
}


// Test runner function for context memory tests
async function runContextMemoryTest(testCase: ContextMemoryTestCase): Promise<boolean> {
  console.log(`📝 Context Memory Test: ${testCase.name}`)
  
  try {
    // Step 1: Create email thread with conversation history
    const emailThread = emailToString(testCase.email);
    console.log('   📧 Email Thread:');
    console.log('   ' + emailThread);
    
    // Step 2: Extract CalendarIntent from email thread
    console.log('   🔍 Extracting Calendar Intent...');
    const calendarIntent = await b.ExtractCalendarIntent(emailThread);
    console.log('   📊 Calendar Intent:', JSON.stringify(calendarIntent, null, 2));
    
    // Step 3: Pass CalendarIntent to Ashley with calendar data
    console.log('   🤖 Getting Ashley\'s Response...');
    console.log('   📅 Sid\'s Calendar Data:');
    console.log('   ' + testCase.sidCalendarData.split('\n').join('\n   '));
    
    const ashleyResponse = await b.AshleyCalendarAssistant(calendarIntent, testCase.sidCalendarData);
    console.log('   📧 Ashley\'s Response:');
    console.log('   ' + ashleyResponse.email_response.split('\n').join('\n   '));
    console.log('   📊 Ashley Response Structure:', JSON.stringify(ashleyResponse, null, 2));
    
    const intentValidationPassed = validateCalendarIntent(calendarIntent, testCase.expectedIntent || {});
    const ashleyValidationPassed = validateAshleyResponse(ashleyResponse, testCase.expectedAshleyResponse || {});
    
    return intentValidationPassed && ashleyValidationPassed;
    
  } catch (error) {
    console.error('   ❌ Error:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Run single test for now
async function runSingleContextTest(): Promise<void> {
  console.log('🧠 Testing Single Context Memory Test Case...\n');
  
  const testCase = testMultiMessagePlanning;
  const passed = await runContextMemoryTest(testCase);
  
  console.log('\n🏁 Single Test Result:');
  console.log('=======================');
  console.log(`${passed ? '✅' : '❌'} ${testCase.name}`);
}

// Main test runner
async function runAllContextMemoryTests(): Promise<void> {
  console.log('🧠 Testing Context Memory Functionality...\n');
  
  const results: { name: string; passed: boolean }[] = [];
  
  for (const testCase of contextMemoryTestCases) {
    const passed = await runContextMemoryTest(testCase);
    results.push({ name: testCase.name, passed });
    console.log('');
  }
  
  // Summary
  console.log('🏁 Context Memory Test Summary:');
  console.log('================================');
  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
  });
  
  const passedCount = results.filter(r => r.passed).length;
  console.log(`\n📊 Results: ${passedCount}/${results.length} tests passed`);
}

// Test Case 1: Basic Conversation Continuity
const testBasicConversationContinuity: ContextMemoryTestCase = {
  name: 'Basic Conversation Continuity',
  email: {
    from: identities.colleague,
    to: identities.ashley,
    date: dates.internalDate,
    subject: 'Re: Meeting with Sarah next week',
    content: 'Actually, please make that meeting 30 minutes and book it whenever Sid has time',
    conversationHistory: [
      {
        date: 'Tue, July 29, 2025 at 10:01 AM',
        from: identities.ashley,
        content: 'I\'d be happy to help schedule a 1-hour meeting with Sarah Johnson. I have several time slots available next week...',
      },
      {
        date: 'Tue, July 28, 2025 at 10:00 AM',
        from: identities.colleague,
        content: `Hi Ashley, can you schedule a 1-hour meeting with Sarah Johnson (sarah.j@company.com) sometime next week? I\'m flexible on timing. The subject is ${subjects.meetingTitle}. Thanks, Mike (EA to Sarah)`
      },
    ],
  },
  sidCalendarData: sidCalendarData.only30MinutesAvailable,
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike',
    participants: 'sarah.j@company.com',
    executive_assistants: 'mike.chen@company.com',
  },
  expectedAshleyResponse: {
    action: AshleyAction.BookTime,
    send_calendar_invite: true,
    meeting_duration_minutes: 30,
    participants_to_invite: 'sarah.j@company.com',
    meeting_start_time: sidCalendarData.only30MinutesAvailableStart,
    meeting_end_time: sidCalendarData.only30MinutesAvailableEnd
  }
};

// Test Case 2: Duplicate Request Prevention
const testDuplicateRequestPrevention: ContextMemoryTestCase = {
  name: 'Duplicate Request Prevention',
  email: {
    from: identities.colleague,
    to: identities.ashley,
    date: dates.internalDate,
    subject: 'Team standup scheduling',
    content: 'Please schedule our weekly team standup for Mondays at 10 AM with the engineering team (5 people).',
    conversationHistory: [
      {
        date: 'Mon, Aug 4, 2025 at 10:01 AM',
        from: identities.ashley,
        content: 'I\'ll schedule the weekly team standup for Mondays at 10 AM with the engineering team. I\'ve sent calendar invites to all 5 team members.'
      },
      {
        date: 'Mon, Aug 4, 2025 at 10:00 AM',
        from: identities.colleague,
        content: 'Please schedule our weekly team standup for Mondays at 10 AM with the engineering team (5 people).'
      }
    ],
  },
  sidCalendarData: sidCalendarData.available,
  expectedIntent: {
    action_needed: false // Should detect duplicate and not need action
  },
  expectedAshleyResponse: {
    action: AshleyAction.NoAction
  }
};

// Test Case 3: Multi-Message Meeting Planning
const testMultiMessagePlanning: ContextMemoryTestCase = {
  name: 'Multi-Message Meeting Planning',
  email: {
    from: identities.colleague,
    to: identities.ashley,
    date: 'Tue, Aug 5, 2025 at 11:00 AM',
    subject: 'Re: Q4 Planning Meeting',
    content: 'Actually, can we make it next Friday afternoon?',
    conversationHistory: [
      {
        date: 'Sun, Aug 4, 2025 at 11:30 AM',
        from: identities.colleague,
        content: 'We\'ll need 2 hours.'
      },
      {
        date: 'Sun, Aug 4, 2025 at 11:01 AM',
        from: identities.ashley,
        content: 'Sure thing. Could you provide more details about timing?'
      },
      {
        date: 'Sun, Aug 4, 2025 at 11:00 AM',
        from: identities.colleague,
        content: 'I need to schedule a Q4 planning meeting with the leadership team. What times work for Sid?'
      }
    ],
  },
  sidCalendarData: sidCalendarData.busy,
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike',
    timerange_start: '2025-08-15 00:00',
    timerange_end: '2025-08-15 23:59',
    baseline_date: '2025-08-05'
  },
  expectedAshleyResponse: {
    action: AshleyAction.SuggestTimes
  }
};

// Test Case 4: Pending Meeting Requests Status
const testPendingMeetingStatus: ContextMemoryTestCase = {
  name: 'Pending Meeting Requests Status',
  email: {
    from: identities.colleague,
    to: identities.ashley,
    date: dates.internalDate,
    subject: 'Meeting status check',
    content: 'Ashley, which meetings have we discussed that haven\'t made it to my calendar yet?',
    conversationHistory: [
      {
        date: 'Sat, Aug 3, 2025 at 2:00 PM',
        from: identities.ashley,
        content: 'I\'ve scheduled your weekly 1:1 with your direct report for Thursday at 2 PM.'
      },
      {
        date: 'Sat, Aug 3, 2025 at 10:00 AM',
        from: identities.colleague,
        content: 'The vendor wants to do a demo - waiting for their availability.'
      },
      {
        date: 'Fri, Aug 2, 2025 at 4:30 PM',
        from: identities.colleague,
        content: 'We should schedule a team retrospective soon, but no specific date yet.'
      },
      {
        date: 'Thu, Aug 1, 2025 at 2:00 PM',
        from: identities.colleague,
        content: 'I need to set up a client presentation with Acme Corp - still waiting for their time confirmation.'
      }
    ],
  },
  sidCalendarData: sidCalendarData.busy,
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike'
  },
  expectedAshleyResponse: {
    action: AshleyAction.AskForClarification
  }
};

// Test Case 5: Failed Action Recovery
const testFailedActionRecovery: ContextMemoryTestCase = {
  name: 'Failed Action Recovery',
  email: {
    from: identities.colleague,
    to: identities.ashley,
    date: dates.internalDate,
    subject: 'Did that client meeting get scheduled?',
    content: 'Hi Ashley, I haven\'t seen the calendar invite for the meeting with Acme Corp we discussed yesterday. Did something go wrong?',
    conversationHistory: [
      {
        date: 'Sat, Aug 3, 2025 at 3:02 PM',
        from: identities.ashley,
        content: 'ERROR: Calendar API failed during scheduling - meeting not created'
      },
      {
        date: 'Sat, Aug 3, 2025 at 3:01 PM',
        from: identities.ashley,
        content: 'I\'ll schedule the meeting with Acme Corp for tomorrow.'
      },
      {
        date: 'Sat, Aug 3, 2025 at 3:00 PM',
        from: identities.colleague,
        content: 'Please schedule a meeting with our external client from Acme Corp for tomorrow.'
      }
    ],
  },
  sidCalendarData: sidCalendarData.available,
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike',
    participants: 'mike.chen@company.com'
  },
  expectedAshleyResponse: {
    action: AshleyAction.SuggestTimes
  }
};

// Test Case 6: Cross-Reference Related Meetings
const testCrossReferenceRelatedMeetings: ContextMemoryTestCase = {
  name: 'Cross-Reference Related Meetings',
  email: {
    from: identities.colleague,
    to: identities.ashley,
    date: dates.internalDate,
    subject: 'Mobile app design review',
    content: 'We need a design review meeting for the mobile app project. Should be after the kickoff meeting.',
    conversationHistory: [
      {
        date: 'Sun, Aug 4, 2025 at 1:01 PM',
        from: identities.ashley,
        content: 'I\'ve scheduled the mobile app project kickoff for Tuesday at 2 PM.'
      },
      {
        date: 'Sun, Aug 4, 2025 at 1:00 PM',
        from: identities.colleague,
        content: 'Schedule project kickoff for the new mobile app project next Tuesday at 2 PM.'
      }
    ],
  },
  sidCalendarData: sidCalendarData.available,
  expectedIntent: {
    action_needed: true,
    requestor: 'Mike',
    participants: 'mike.chen@company.com'
  },
  expectedAshleyResponse: {
    action: AshleyAction.SuggestTimes,
    meeting_duration_minutes: 60
  }
};

// Test cases array
const contextMemoryTestCases: ContextMemoryTestCase[] = [
  testBasicConversationContinuity,
  testDuplicateRequestPrevention,
  testMultiMessagePlanning,
  testPendingMeetingStatus,
  testFailedActionRecovery,
  testCrossReferenceRelatedMeetings
];

// Function to run individual tests with minimal output
async function runIndividualTests(): Promise<void> {
  console.log('🧠 Running Individual Context Memory Tests...\n');
  
  const testCases: ContextMemoryTestCase[] = [
    testBasicConversationContinuity,
    testDuplicateRequestPrevention,
    testMultiMessagePlanning,
    testPendingMeetingStatus,
    testFailedActionRecovery,
    testCrossReferenceRelatedMeetings
  ];
  
  const results: { name: string; passed: boolean }[] = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]!;
    console.log(`\n📝 Test ${i + 1}/6: ${testCase.name}`);
    
    try {
      const emailThread = emailToString(testCase.email);
      const calendarIntent = await b.ExtractCalendarIntent(emailThread);
      const ashleyResponse = await b.AshleyCalendarAssistant(calendarIntent, testCase.sidCalendarData);
      
      const intentValid = validateCalendarIntent(calendarIntent, testCase.expectedIntent || {});
      const ashleyValid = validateAshleyResponse(ashleyResponse, testCase.expectedAshleyResponse || {});
      const passed = intentValid && ashleyValid;
      
      results.push({ name: testCase.name, passed });
      console.log(`   ${passed ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (!passed) {
        console.log(`   Expected Ashley Action: ${testCase.expectedAshleyResponse?.action || 'N/A'}`);
        console.log(`   Actual Ashley Action: ${ashleyResponse.action}`);
      }
      
    } catch (error) {
      results.push({ name: testCase.name, passed: false });
      console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  console.log('\n🏁 Final Results:');
  console.log('==================');
  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.passed ? '✅' : '❌'} ${result.name}`);
  });
  
  const passedCount = results.filter(r => r.passed).length;
  console.log(`\n📊 Summary: ${passedCount}/${results.length} tests passed`);
}

// Function to debug single test
async function debugSingleTest(): Promise<void> {
  console.log('🔍 Debugging Multi-Message Planning Test...\n');
  
  const testCase = testMultiMessagePlanning;
  console.log(`📝 Test: ${testCase.name}`);
  console.log(`📧 Email Content: "${testCase.email.content}"`);
  console.log(`📅 Calendar Data: ${testCase.sidCalendarData.includes('Friday') ? 'Includes Friday' : 'No Friday data'}`);
  
  try {
    const emailThread = emailToString(testCase.email);
    console.log('\n📧 Full Email Thread:');
    console.log(emailThread);
    
    const calendarIntent = await b.ExtractCalendarIntent(emailThread);
    console.log('\n📊 Calendar Intent:');
    console.log(JSON.stringify(calendarIntent, null, 2));
    
    const ashleyResponse = await b.AshleyCalendarAssistant(calendarIntent, testCase.sidCalendarData);
    console.log('\n🤖 Ashley Response:');
    console.log(JSON.stringify(ashleyResponse, null, 2));
    
    console.log('\n📋 Comparison:');
    console.log(`Expected Action: ${testCase.expectedAshleyResponse?.action}`);
    console.log(`Actual Action: ${ashleyResponse.action}`);
    console.log(`Match: ${testCase.expectedAshleyResponse?.action === ashleyResponse.action ? '✅' : '❌'}`);
    
  } catch (error) {
    console.log(`❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Function to debug basic conversation continuity test
async function debugBasicConversationTest(): Promise<void> {
  console.log('🔍 Debugging Basic Conversation Continuity Test...\n');
  
  const testCase = testBasicConversationContinuity;
  console.log(`📝 Test: ${testCase.name}`);
  console.log(`📧 Email Content: "${testCase.email.content}"`);
  console.log(`🎯 Expected Action: ${testCase.expectedAshleyResponse?.action}`);
  
  try {
    const emailThread = emailToString(testCase.email);
    console.log('\n📧 Full Email Thread:');
    console.log(emailThread);
    
    const calendarIntent = await b.ExtractCalendarIntent(emailThread);
    console.log('\n📊 Calendar Intent:');
    console.log(JSON.stringify(calendarIntent, null, 2));
    
    console.log('\n📅 Calendar Data:');
    console.log(testCase.sidCalendarData);
    
    const ashleyResponse = await b.AshleyCalendarAssistant(calendarIntent, testCase.sidCalendarData);
    console.log('\n🤖 Ashley Response:');
    console.log(JSON.stringify(ashleyResponse, null, 2));
    
    console.log('\n📋 Comparison:');
    console.log(`Expected Action: ${testCase.expectedAshleyResponse?.action}`);
    console.log(`Actual Action: ${ashleyResponse.action}`);
    console.log(`Match: ${testCase.expectedAshleyResponse?.action === ashleyResponse.action ? '✅' : '❌'}`);
    
  } catch (error) {
    console.log(`❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Function to debug calendar intent extraction specifically
async function debugCalendarIntentExtraction(): Promise<void> {
  console.log('🔍 Debugging Calendar Intent Extraction...\n');
  
  const testCase = testBasicConversationContinuity;
  const emailThread = emailToString(testCase.email);
  
  console.log('📧 Email Thread Being Sent to AI:');
  console.log('=' + '='.repeat(50));
  console.log(emailThread);
  console.log('=' + '='.repeat(50));
  
  console.log('\n🔍 Key Phrases to Look For:');
  console.log('- "book it whenever Sid has time" (should indicate BookTime)');
  console.log('- "make that meeting 30 minutes" (duration change)');
  console.log('- "please" (polite command)');
  
  try {
    const calendarIntent = await b.ExtractCalendarIntent(emailThread);
    console.log('\n📊 Extracted Calendar Intent:');
    console.log(JSON.stringify(calendarIntent, null, 2));
    
    console.log('\n📋 Analysis:');
    console.log(`Action Needed: ${calendarIntent.action_needed}`);
    console.log(`Request Details: "${calendarIntent.request_details}"`);
    console.log(`Requestor: ${calendarIntent.requestor}`);
    console.log(`Participants: ${calendarIntent.participants}`);
    console.log(`Executive Assistants: ${calendarIntent.executive_assistants}`);
    
  } catch (error) {
    console.log(`❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Function to test multi-message planning stability
async function testMultiMessageStability(): Promise<void> {
  console.log('🔍 Testing Multi-Message Planning Stability...\n');
  
  const testCase = testMultiMessagePlanning;
  console.log(`📝 Test: ${testCase.name}`);
  console.log(`📧 Email Content: "${testCase.email.content}"`);
  console.log(`🎯 Expected Action: ${testCase.expectedAshleyResponse?.action}`);
  
  try {
    const emailThread = emailToString(testCase.email);
    const calendarIntent = await b.ExtractCalendarIntent(emailThread);
    console.log('\n📊 Calendar Intent Action Needed:', calendarIntent.action_needed);
    console.log('Request Details:', calendarIntent.request_details);
    
    const ashleyResponse = await b.AshleyCalendarAssistant(calendarIntent, testCase.sidCalendarData);
    console.log('\n🤖 Ashley Response Action:', ashleyResponse.action);
    
    const passed = ashleyResponse.action === testCase.expectedAshleyResponse?.action;
    console.log(`\n📋 Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!passed) {
      console.log(`Expected: ${testCase.expectedAshleyResponse?.action}`);
      console.log(`Actual: ${ashleyResponse.action}`);
      console.log('\nEmail response:', ashleyResponse.email_response);
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Run stability test
testMultiMessageStability();
