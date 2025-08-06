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
  
  const testCase = testBasicConversationContinuity;
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
    content: 'Actually, can we make that meeting 30 minutes instead of the hour we discussed? Please book it if Sid has time',
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
  sidCalendarData: sidCalendarData.available,
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
    participants_to_invite: 'sarah.j@company.com'
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
    date: dates.internalDate,
    subject: 'Re: Q4 Planning Meeting',
    content: 'Actually, let\'s also invite the Head of Product. And can we make it next Friday afternoon?',
    conversationHistory: [
      {
        date: 'Sun, Aug 4, 2025 at 11:31 AM',
        from: identities.ashley,
        content: 'Got it - Q4 planning meeting for 2 hours with CEO, CTO, VP Sales, VP Marketing, and yourself. When would you like to schedule this?'
      },
      {
        date: 'Sun, Aug 4, 2025 at 11:30 AM',
        from: identities.colleague,
        content: 'The attendees should be: CEO, CTO, VP Sales, VP Marketing, and myself. We\'ll need 2 hours.'
      },
      {
        date: 'Sun, Aug 4, 2025 at 11:01 AM',
        from: identities.ashley,
        content: 'I\'ll help you schedule the Q4 planning meeting. Could you provide more details about attendees and timing?'
      },
      {
        date: 'Sun, Aug 4, 2025 at 11:00 AM',
        from: identities.colleague,
        content: 'I need to schedule a Q4 planning meeting with the leadership team.'
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
    meeting_duration_minutes: 120
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

// Run the single test
runSingleContextTest();
