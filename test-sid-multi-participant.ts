import { b } from './baml_client';
import { CalendarIntent, AshleyAction, AshleyResponse } from './baml_client/types';
import { validateAshleyResponse, sidCalendarData, identities, EmailMessage, createEmailThread } from './test-utils';

// Multi-participant test case interface
interface MultiParticipantTestCase {
  name: string;
  emailThread: string;
  sidCalendarData: string;
  expectedResponse: Partial<AshleyResponse>;
  description: string;
}

// Email templates for multi-participant scenarios
const emailTemplates = {
  sidInitialRequest: (participants: string[], subject: string, content: string) => `
From: sid.mathur@gmail.com
To: ${participants.join(',')}
Cc: ashley.sidsai@gmail.com
Date: 2025-08-04 09:00:00
Subject: ${subject}
Content: ${content}
`,

  ashleyCoordinationResponse: (participants: string[], subject: string, timeSlots: string[]) => `
From: ashley.sidsai@gmail.com
To: ${participants.join(',')}
Cc: sid.mathur@gmail.com
Date: 2025-08-04 09:15:00
Subject: Re: ${subject}
Content: Hi ${participants.map(p => p.split('@')[0]).join(', ')},

I'm coordinating a 1-hour strategy meeting for Sid on Tuesday, August 5th. Here are the times when Sid is available:

| Time Slot | Sid | ${participants.map(p => p.split('@')[0]).join(' | ')} |
|-----------|-----|${participants.map(() => '-------|').join('')}
${timeSlots.map(slot => `| ${slot} | ✓ | ${participants.map(() => 'Please confirm |').join('')}`).join('\n')}

Could you please indicate your availability for these options?

Best Regards,
Ashley
`,

  participantConfirmation: (from: string, subject: string, confirmations: { slot: string; available: boolean; reason?: string }[]) => `
From: ${from}
To: ashley.sidsai@gmail.com
Cc: sid.mathur@gmail.com
Date: 2025-08-04 ${Math.floor(Math.random() * 12) + 10}:30:00
Subject: Re: ${subject}
Content: Hi Ashley,

Here's my availability:
${confirmations.map(c => `- ${c.slot}: ${c.available ? 'Available ✓' : `Not available${c.reason ? ` (${c.reason})` : ''}`}`).join('\n')}

Thanks!
${from.split('@')[0]}
`
};

// Reusable calendar data for multi-participant tests
const multiParticipantCalendarData = {
  available: `
Tuesday, August 5, 2025:
- 9:00 AM - 10:00 AM: Team Standup
- 11:00 AM - 12:00 PM: Available
- 2:00 PM - 3:00 PM: Available
- 4:00 PM - 5:00 PM: Available
  `,
  
  busy: `
Tuesday, August 5, 2025:
- 9:00 AM - 10:00 AM: Team Standup
- 11:00 AM - 12:00 PM: Client Meeting
- 2:00 PM - 3:00 PM: Product Review
- 4:00 PM - 5:00 PM: Strategy Session
  `
};

// Test runner for multi-participant test cases
async function runMultiParticipantTest(testCase: MultiParticipantTestCase): Promise<boolean> {
  console.log('');
  console.log(`🧪 Testing: ${testCase.name}`);
  console.log('='.repeat(60));
  console.log(`📋 ${testCase.description}`);
  console.log('');

  try {
    // Extract calendar intent from email thread
    const calendarIntent = await b.ExtractCalendarIntent(testCase.emailThread);
    
    console.log('📥 Input Analysis:');
    console.log('   Email Thread: Multi-participant coordination scenario');
    console.log('   Expected Action:', testCase.expectedResponse.action);
    console.log('   Expected Calendar Invite:', testCase.expectedResponse.send_calendar_invite);
    console.log('');

    console.log('🤖 Testing Ashley...');
    const response = await b.AshleyCalendarAssistant(calendarIntent, testCase.sidCalendarData);

    console.log('📧 Ashley\'s Response:');
    console.log('   Action:', response.action);
    console.log('   Send Calendar Invite:', response.send_calendar_invite);
    console.log('   Email Response:');
    console.log('   ' + response.email_response.split('\n').join('\n   '));
    console.log('');

    // Validate Ashley's response
    const isValid = validateAshleyResponse(response, testCase.expectedResponse);
    console.log(`✅ Test Result: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    return isValid;

  } catch (error) {
    console.error('❌ Error running test:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Test case definitions using templates
const testSidInitialCoordination: MultiParticipantTestCase = {
  name: 'Sid Initial Multi-Participant Coordination',
  description: 'Sid requests meeting with multiple participants - should trigger coordination',
  emailThread: emailTemplates.sidInitialRequest(
    ['alice@company.com', 'bob@company.com', 'carol@company.com'],
    'Strategy Meeting Coordination',
    'I need to schedule a 1-hour strategy meeting with Alice, Bob, and Carol for Tuesday. Please coordinate with everyone to find a time that works.'
  ),
  sidCalendarData: multiParticipantCalendarData.available,
  expectedResponse: {
    action: AshleyAction.SuggestTimes,
    send_calendar_invite: false
  }
};

const testConsensusBooking: MultiParticipantTestCase = {
  name: 'Participant Consensus and Booking',
  description: 'All participants confirm availability - Ashley should book the meeting',
  emailThread: emailTemplates.sidInitialRequest(
    ['alice@company.com', 'bob@company.com', 'carol@company.com'],
    'Strategy Meeting Coordination',
    'I need to schedule a 1-hour strategy meeting with Alice, Bob, and Carol for Tuesday. Please coordinate with everyone to find a time that works.'
  ) + 
  emailTemplates.ashleyCoordinationResponse(
    ['alice@company.com', 'bob@company.com', 'carol@company.com'],
    'Strategy Meeting Coordination',
    ['Tue 11am-12pm', 'Tue 2-3pm', 'Tue 4-5pm']
  ) +
  emailTemplates.participantConfirmation(
    'alice@company.com',
    'Strategy Meeting Coordination',
    [
      { slot: 'Tue 11am-12pm', available: false, reason: 'client call' },
      { slot: 'Tue 2-3pm', available: true },
      { slot: 'Tue 4-5pm', available: true }
    ]
  ) +
  emailTemplates.participantConfirmation(
    'bob@company.com', 
    'Strategy Meeting Coordination',
    [
      { slot: 'Tue 11am-12pm', available: true },
      { slot: 'Tue 2-3pm', available: true },
      { slot: 'Tue 4-5pm', available: false, reason: 'another meeting' }
    ]
  ) +
  emailTemplates.participantConfirmation(
    'carol@company.com',
    'Strategy Meeting Coordination', 
    [
      { slot: 'Tue 11am-12pm', available: false, reason: 'unavailable' },
      { slot: 'Tue 2-3pm', available: true },
      { slot: 'Tue 4-5pm', available: true }
    ]
  ),
  sidCalendarData: multiParticipantCalendarData.available,
  expectedResponse: {
    action: AshleyAction.BookTime,
    send_calendar_invite: true
  }
};

const testPartialResponses: MultiParticipantTestCase = {
  name: 'Partial Participant Responses',
  description: 'Only some participants responded - Ashley should wait for all confirmations',
  emailThread: emailTemplates.sidInitialRequest(
    ['alice@company.com', 'bob@company.com', 'carol@company.com'],
    'Strategy Meeting Coordination',
    'I need to schedule a 1-hour strategy meeting with Alice, Bob, and Carol for Tuesday. Please coordinate with everyone to find a time that works.'
  ) +
  emailTemplates.ashleyCoordinationResponse(
    ['alice@company.com', 'bob@company.com', 'carol@company.com'],
    'Strategy Meeting Coordination',
    ['Tue 11am-12pm', 'Tue 2-3pm', 'Tue 4-5pm']
  ) +
  emailTemplates.participantConfirmation(
    'alice@company.com',
    'Strategy Meeting Coordination',
    [
      { slot: 'Tue 11am-12pm', available: false, reason: 'client call' },
      { slot: 'Tue 2-3pm', available: true },
      { slot: 'Tue 4-5pm', available: true }
    ]
  ) +
  emailTemplates.participantConfirmation(
    'bob@company.com',
    'Strategy Meeting Coordination',
    [
      { slot: 'Tue 11am-12pm', available: true },
      { slot: 'Tue 2-3pm', available: true },
      { slot: 'Tue 4-5pm', available: false, reason: 'another meeting' }
    ]
  ) +
  '\n\n(NOTE: Carol has not responded yet)',
  sidCalendarData: multiParticipantCalendarData.available,
  expectedResponse: {
    action: AshleyAction.NoAction,
    send_calendar_invite: false
  }
};

const testControlCase: MultiParticipantTestCase = {
  name: 'Control Case - Others Request Meeting with Sid',
  description: 'External person requests meeting with Sid - should use normal booking behavior',
  emailThread: `
From: alice@company.com
To: sid.mathur@gmail.com
Cc: ashley.sidsai@gmail.com
Date: 2025-08-04 09:00:00
Subject: Meeting Request
Content: Hi Sid, I'd like to schedule a 1-hour meeting with you for Tuesday at 2pm to discuss the project updates. Please let me know if this works.
`,
  sidCalendarData: multiParticipantCalendarData.available,
  expectedResponse: {
    action: AshleyAction.BookTime,
    send_calendar_invite: true
  }
};

const testNoCommonTime: MultiParticipantTestCase = {
  name: 'No Common Time - Escalation to Sid',
  description: 'All participants respond but no overlap - Ashley should escalate to Sid for guidance',
  emailThread: emailTemplates.sidInitialRequest(
    ['alice@company.com', 'bob@company.com', 'carol@company.com'],
    'Strategy Meeting Coordination',
    'I need to schedule a 1-hour strategy meeting with Alice, Bob, and Carol for Tuesday. Please coordinate with everyone to find a time that works.'
  ) +
  emailTemplates.ashleyCoordinationResponse(
    ['alice@company.com', 'bob@company.com', 'carol@company.com'],
    'Strategy Meeting Coordination',
    ['Tue 11am-12pm', 'Tue 2-3pm', 'Tue 4-5pm']
  ) +
  emailTemplates.participantConfirmation(
    'alice@company.com',
    'Strategy Meeting Coordination',
    [
      { slot: 'Tue 11am-12pm', available: true },
      { slot: 'Tue 2-3pm', available: false, reason: 'client call' },
      { slot: 'Tue 4-5pm', available: false, reason: 'another meeting' }
    ]
  ) +
  emailTemplates.participantConfirmation(
    'bob@company.com',
    'Strategy Meeting Coordination',
    [
      { slot: 'Tue 11am-12pm', available: false, reason: 'team standup' },
      { slot: 'Tue 2-3pm', available: true },
      { slot: 'Tue 4-5pm', available: false, reason: 'focus time' }
    ]
  ) +
  emailTemplates.participantConfirmation(
    'carol@company.com',
    'Strategy Meeting Coordination',
    [
      { slot: 'Tue 11am-12pm', available: false, reason: 'dentist appointment' },
      { slot: 'Tue 2-3pm', available: false, reason: 'project review' },
      { slot: 'Tue 4-5pm', available: true }
    ]
  ),
  sidCalendarData: multiParticipantCalendarData.available,
  expectedResponse: {
    action: AshleyAction.AskForClarification,
    send_calendar_invite: false
  }
};

const testSidFollowUpAfterEscalation: MultiParticipantTestCase = {
  name: 'Sid Follow-Up After Escalation',
  description: 'Sid responds to escalation with new times - Ashley should resume coordination',
  emailThread: emailTemplates.sidInitialRequest(
    ['alice@company.com', 'bob@company.com', 'carol@company.com'],
    'Strategy Meeting Coordination',
    'I need to schedule a 1-hour strategy meeting with Alice, Bob, and Carol for Tuesday. Please coordinate with everyone to find a time that works.'
  ) +
  emailTemplates.ashleyCoordinationResponse(
    ['alice@company.com', 'bob@company.com', 'carol@company.com'],
    'Strategy Meeting Coordination',
    ['Tue 11am-12pm', 'Tue 2-3pm', 'Tue 4-5pm']
  ) +
  emailTemplates.participantConfirmation(
    'alice@company.com',
    'Strategy Meeting Coordination',
    [
      { slot: 'Tue 11am-12pm', available: true },
      { slot: 'Tue 2-3pm', available: false, reason: 'client call' },
      { slot: 'Tue 4-5pm', available: false, reason: 'another meeting' }
    ]
  ) +
  emailTemplates.participantConfirmation(
    'bob@company.com',
    'Strategy Meeting Coordination',
    [
      { slot: 'Tue 11am-12pm', available: false, reason: 'team standup' },
      { slot: 'Tue 2-3pm', available: true },
      { slot: 'Tue 4-5pm', available: false, reason: 'focus time' }
    ]
  ) +
  emailTemplates.participantConfirmation(
    'carol@company.com',
    'Strategy Meeting Coordination',
    [
      { slot: 'Tue 11am-12pm', available: false, reason: 'dentist appointment' },
      { slot: 'Tue 2-3pm', available: false, reason: 'project review' },
      { slot: 'Tue 4-5pm', available: true }
    ]
  ) +
  `\n\n---\n\nFrom: ashley.sidsai@gmail.com\nTo: sid.mathur@gmail.com\nCc: \nDate: 2025-08-04 14:00:00\nSubject: Re: Strategy Meeting Coordination\nContent: Hi Sid,\n\nI've coordinated with Alice, Bob, and Carol regarding the strategy meeting, but unfortunately none of the proposed time slots work for everyone. Here's the summary:\n\n- Alice: Available 11am only\n- Bob: Available 2-3pm only\n- Carol: Available 4-5pm only\n\nNo overlapping availability found. How would you like me to proceed?\n\nBest Regards,\nAshley\n\n---\n\nFrom: sid.mathur@gmail.com\nTo: ashley.sidsai@gmail.com\nCc: alice@company.com,bob@company.com,carol@company.com\nDate: 2025-08-04 14:30:00\nSubject: Re: Strategy Meeting Coordination\nContent: Thanks Ashley. Let's try some different times. Please coordinate with everyone for these Wednesday options:\n\n- Wed 10am-11am\n- Wed 1pm-2pm\n- Wed 3pm-4pm\n\nI'm available for all of these. Please send them a new coordination table.`,
  sidCalendarData: `\nWednesday, August 6, 2025:\n- 9:00 AM - 10:00 AM: Team Standup\n- 10:00 AM - 11:00 AM: Available\n- 1:00 PM - 2:00 PM: Available\n- 3:00 PM - 4:00 PM: Available\n  `,
  expectedResponse: {
    action: AshleyAction.SuggestTimes,
    send_calendar_invite: false
  }
};

// Test case where someone else requests a meeting with Sid (should NOT use multi-participant logic)
async function testOthersRequestWithSid(): Promise<void> {
  console.log('');
  console.log('🔄 Testing Others Requesting Meeting with Sid (Control Test)...');
  console.log('==============================================================');

  const calendarIntent: CalendarIntent = {
    action_needed: true,
    requestor: "alice@company.com", // Alice is the requestor (not Sid)
    participants: "alice@company.com,bob@company.com", // Multiple participants
    executive_assistants: "",
    silent_observers: "",
    timerange_start: "2025-08-05 14:00",
    timerange_end: "2025-08-05 15:00",
    request_details: "Can we schedule a meeting with Sid, Alice, and Bob for Tuesday at 2pm?",
    baseline_date: "2025-08-04"
  };

  const sidCalendarData = `
Tuesday, August 5, 2025:
- 9:00 AM - 10:00 AM: Team Standup
- 11:00 AM - 12:00 PM: Available
- 2:00 PM - 3:00 PM: Available
- 4:00 PM - 5:00 PM: Available
  `;

  try {
    const response = await b.AshleyCalendarAssistant(calendarIntent, sidCalendarData);
    
    console.log('📧 Control Test Response:');
    console.log('   Action:', response.action);
    console.log('   Send Calendar Invite:', response.send_calendar_invite);
    
    const hasTable = response.email_response.includes('|') && response.email_response.includes('Time Slot');
    
    if (!hasTable && response.action === AshleyAction.BookTime) {
      console.log('   ✅ CORRECT: No coordination table (Alice is requestor, not Sid)');
      console.log('   ✅ CORRECT: Normal booking behavior for external requests');
    } else if (hasTable) {
      console.log('   ❌ ISSUE: Should not use coordination table when Sid is not the requestor');
    }
  } catch (error) {
    console.error('❌ Error in control test:', error instanceof Error ? error.message : String(error));
  }
}

// Test case array for clean execution
const multiParticipantTestCases: MultiParticipantTestCase[] = [
  testSidInitialCoordination,
  testConsensusBooking, 
  testPartialResponses,
  testControlCase,
  testNoCommonTime,
  testSidFollowUpAfterEscalation
];

// Main test runner
async function runSidMultiParticipantTests(): Promise<void> {
  console.log('🧪 Testing Ashley Multi-Participant Coordination...');
  console.log('='.repeat(60));
  console.log('');
  
  const results: { name: string; passed: boolean }[] = [];
  
  for (const testCase of multiParticipantTestCases) {
    const passed = await runMultiParticipantTest(testCase);
    results.push({ name: testCase.name, passed });
    console.log('');
  }
  
  // Summary
  console.log('🏁 Multi-Participant Test Summary:');
  console.log('='.repeat(40));
  results.forEach(result => {
    console.log(`${result.name}: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
  });
  
  const allPassed = results.every(r => r.passed);
  console.log(`\nOverall Result: ${allPassed ? '🎉 ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('');
    console.log('🎉 SUCCESS! Multi-Participant Coordination is working:');
    console.log('  ✅ Initial coordination when Sid requests with multiple participants');
    console.log('  ✅ Consensus detection and automatic booking');
    console.log('  ✅ Proper handling of partial responses');
    console.log('  ✅ Control case validation (normal booking for external requests)');
  }
}

// Export for use in other files
export { runMultiParticipantTest, multiParticipantTestCases };

// Run if executed directly
if (require.main === module) {
  // Run all multi-participant tests
  runSidMultiParticipantTests().catch(console.error);
}
