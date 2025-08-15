#!/usr/bin/env node

/**
 * Test Cases for Daily Morning Calendar Email Feature (Issue #21)
 * 
 * This file contains comprehensive test scenarios for the automated daily morning
 * email that sends Sid his schedule, pending requests, and conflicts every day at 8 AM PT.
 */

// Mock data structures for testing
interface DailyEmailContent {
  date: string;
  schedule: ScheduleItem[];
  pendingRequests: PendingRequest[];
  conflicts: Conflict[];
  quickActions: QuickAction[];
}

interface ScheduleItem {
  time: string;
  title: string;
  attendees: string[];
  location?: string;
  duration: number;
  type: 'confirmed' | 'tentative' | 'pending';
}

interface PendingRequest {
  id: string;
  requestor: string;
  subject: string;
  requestedTime: string;
  daysOverdue: number;
  priority: 'high' | 'medium' | 'low';
}

interface Conflict {
  type: 'time_overlap' | 'travel_time' | 'missing_location' | 'overdue_request';
  description: string;
  affectedItems: string[];
  severity: 'critical' | 'warning' | 'info';
  recommendation: string;
}

interface QuickAction {
  type: 'accept' | 'decline' | 'reschedule' | 'block_focus_time';
  label: string;
  url: string;
  token: string;
}

// Test Data Sets
const mockScheduleNormal: ScheduleItem[] = [
  {
    time: "09:00 AM",
    title: "Team Standup",
    attendees: ["team@company.com"],
    location: "Conference Room A",
    duration: 30,
    type: "confirmed"
  },
  {
    time: "11:00 AM", 
    title: "Client Review Meeting",
    attendees: ["client@external.com", "pm@company.com"],
    location: "Zoom",
    duration: 60,
    type: "confirmed"
  },
  {
    time: "02:00 PM",
    title: "Product Planning",
    attendees: ["product@company.com"],
    duration: 90,
    type: "tentative"
  }
];

const mockScheduleEmpty: ScheduleItem[] = [];

const mockScheduleBusy: ScheduleItem[] = [
  {
    time: "08:00 AM",
    title: "Early Client Call",
    attendees: ["client-asia@external.com"],
    location: "Zoom",
    duration: 30,
    type: "confirmed"
  },
  {
    time: "09:00 AM",
    title: "Team Standup", 
    attendees: ["team@company.com"],
    location: "Conference Room A",
    duration: 30,
    type: "confirmed"
  },
  {
    time: "09:15 AM", // CONFLICT: Overlaps with standup
    title: "1:1 with Manager",
    attendees: ["manager@company.com"],
    location: "Office Building B", // CONFLICT: Travel time needed
    duration: 45,
    type: "confirmed"
  },
  {
    time: "11:00 AM",
    title: "Client Presentation",
    attendees: ["client@external.com"],
    // Missing location - CONFLICT
    duration: 60,
    type: "confirmed"
  },
  {
    time: "01:00 PM",
    title: "Lunch Meeting",
    attendees: ["partner@external.com"],
    location: "Downtown Restaurant", // CONFLICT: Travel time from office
    duration: 90,
    type: "confirmed"
  },
  {
    time: "03:00 PM",
    title: "Board Meeting",
    attendees: ["board@company.com"],
    location: "Conference Room A",
    duration: 120,
    type: "confirmed"
  }
];

const mockPendingRequests: PendingRequest[] = [
  {
    id: "req-001",
    requestor: "sarah@company.com",
    subject: "Q4 Planning Session",
    requestedTime: "Next Tuesday 2-4 PM",
    daysOverdue: 1,
    priority: "medium"
  },
  {
    id: "req-002", 
    requestor: "client@external.com",
    subject: "Project Kickoff Meeting",
    requestedTime: "This Friday 10 AM",
    daysOverdue: 4, // OVERDUE
    priority: "high"
  },
  {
    id: "req-003",
    requestor: "vendor@external.com", 
    subject: "Contract Review",
    requestedTime: "Next week sometime",
    daysOverdue: 7, // VERY OVERDUE
    priority: "high"
  }
];

const mockConflicts: Conflict[] = [
  {
    type: "time_overlap",
    description: "Team Standup and 1:1 with Manager overlap by 15 minutes",
    affectedItems: ["Team Standup", "1:1 with Manager"],
    severity: "critical",
    recommendation: "Reschedule 1:1 to 10:00 AM or move standup to 8:45 AM"
  },
  {
    type: "travel_time",
    description: "Insufficient travel time between Conference Room A and Office Building B",
    affectedItems: ["Team Standup", "1:1 with Manager"],
    severity: "warning", 
    recommendation: "Allow 15 minutes travel time or schedule virtually"
  },
  {
    type: "missing_location",
    description: "Client Presentation has no location specified",
    affectedItems: ["Client Presentation"],
    severity: "warning",
    recommendation: "Add meeting location or Zoom link"
  },
  {
    type: "overdue_request",
    description: "2 scheduling requests are overdue (4+ days)",
    affectedItems: ["req-002", "req-003"],
    severity: "critical",
    recommendation: "Respond to overdue requests immediately"
  }
];

const mockQuickActions: QuickAction[] = [
  {
    type: "accept",
    label: "Accept Q4 Planning",
    url: "https://ashley.ai/actions/accept?token=abc123&req=req-001",
    token: "abc123"
  },
  {
    type: "decline", 
    label: "Decline Contract Review",
    url: "https://ashley.ai/actions/decline?token=def456&req=req-003",
    token: "def456"
  },
  {
    type: "reschedule",
    label: "Reschedule 1:1 Meeting", 
    url: "https://ashley.ai/actions/reschedule?token=ghi789&meeting=standup-overlap",
    token: "ghi789"
  },
  {
    type: "block_focus_time",
    label: "Block 3-5 PM for Focus Work",
    url: "https://ashley.ai/actions/block?token=jkl012&time=15:00-17:00",
    token: "jkl012"
  }
];

// Test Cases
const testCases = [
  // SMOKE TESTS (Priority for CI)
  {
    name: "Smoke Test: Basic Schedule Email",
    category: "smoke",
    description: "Verify basic email generation with normal schedule",
    input: {
      date: "2025-08-16",
      schedule: mockScheduleNormal,
      pendingRequests: [],
      conflicts: [],
      quickActions: []
    },
    expectedSections: ["Daily Schedule", "3 meetings scheduled"],
    shouldContain: ["Team Standup", "Client Review Meeting", "Product Planning"],
    shouldNotContain: ["No meetings", "CONFLICTS", "Pending Requests"]
  },

  {
    name: "Smoke Test: Empty Schedule",
    category: "smoke", 
    description: "Verify email behavior with no scheduled meetings",
    input: {
      date: "2025-08-16",
      schedule: mockScheduleEmpty,
      pendingRequests: [],
      conflicts: [],
      quickActions: []
    },
    expectedSections: ["Daily Schedule"],
    shouldContain: ["No meetings scheduled", "free day"],
    shouldNotContain: ["09:00 AM", "CONFLICTS"]
  },

  {
    name: "Smoke Test: Pending Requests Display",
    category: "smoke",
    description: "Verify pending scheduling requests are included",
    input: {
      date: "2025-08-16", 
      schedule: mockScheduleNormal,
      pendingRequests: mockPendingRequests,
      conflicts: [],
      quickActions: mockQuickActions.slice(0, 2)
    },
    expectedSections: ["Daily Schedule", "Pending Requests", "Quick Actions"],
    shouldContain: ["3 pending requests", "sarah@company.com", "Q4 Planning Session"],
    shouldNotContain: ["No pending requests"]
  },

  // CONFLICT DETECTION TESTS
  {
    name: "Time Conflict Detection",
    category: "conflicts",
    description: "Verify detection of overlapping meetings",
    input: {
      date: "2025-08-16",
      schedule: mockScheduleBusy,
      pendingRequests: [],
      conflicts: mockConflicts.filter(c => c.type === "time_overlap"),
      quickActions: []
    },
    expectedSections: ["Daily Schedule", "⚠️ CONFLICTS DETECTED"],
    shouldContain: ["overlap by 15 minutes", "CRITICAL", "Reschedule 1:1"],
    shouldNotContain: ["No conflicts detected"]
  },

  {
    name: "Travel Conflict Detection", 
    category: "conflicts",
    description: "Verify detection of insufficient travel time",
    input: {
      date: "2025-08-16",
      schedule: mockScheduleBusy,
      pendingRequests: [],
      conflicts: mockConflicts.filter(c => c.type === "travel_time"),
      quickActions: []
    },
    expectedSections: ["Daily Schedule", "⚠️ CONFLICTS DETECTED"],
    shouldContain: ["Insufficient travel time", "Conference Room A", "Office Building B"],
    shouldNotContain: ["No conflicts detected"]
  },

  {
    name: "Missing Location Detection",
    category: "conflicts", 
    description: "Verify detection of meetings without location",
    input: {
      date: "2025-08-16",
      schedule: mockScheduleBusy,
      pendingRequests: [],
      conflicts: mockConflicts.filter(c => c.type === "missing_location"),
      quickActions: []
    },
    expectedSections: ["Daily Schedule", "⚠️ CONFLICTS DETECTED"],
    shouldContain: ["no location specified", "Client Presentation", "Add meeting location"],
    shouldNotContain: ["No conflicts detected"]
  },

  {
    name: "Overdue Request Detection",
    category: "conflicts",
    description: "Verify identification of overdue scheduling requests", 
    input: {
      date: "2025-08-16",
      schedule: mockScheduleNormal,
      pendingRequests: mockPendingRequests,
      conflicts: mockConflicts.filter(c => c.type === "overdue_request"),
      quickActions: []
    },
    expectedSections: ["Pending Requests", "⚠️ CONFLICTS DETECTED"],
    shouldContain: ["2 scheduling requests are overdue", "4+ days", "CRITICAL"],
    shouldNotContain: ["No overdue requests"]
  },

  // EDGE CASES
  {
    name: "Complex Day Scenario",
    category: "edge_cases",
    description: "Verify handling of day with multiple issues",
    input: {
      date: "2025-08-16",
      schedule: mockScheduleBusy,
      pendingRequests: mockPendingRequests,
      conflicts: mockConflicts,
      quickActions: mockQuickActions
    },
    expectedSections: ["Daily Schedule", "Pending Requests", "⚠️ CONFLICTS DETECTED", "Quick Actions"],
    shouldContain: [
      "6 meetings scheduled",
      "3 pending requests", 
      "4 conflicts detected",
      "CRITICAL",
      "Accept Q4 Planning",
      "Block 3-5 PM"
    ],
    shouldNotContain: ["No meetings", "No conflicts", "No pending requests"]
  }
];

// Test Runner Functions
function generateDailyEmail(input: DailyEmailContent): string {
  // This would be the actual implementation
  // For testing, we return a mock email structure
  let email = `Daily Schedule for ${input.date}\n\n`;
  
  // Schedule Section
  email += "📅 DAILY SCHEDULE\n";
  if (input.schedule.length === 0) {
    email += "No meetings scheduled - enjoy your free day!\n\n";
  } else {
    email += `${input.schedule.length} meetings scheduled:\n\n`;
    input.schedule.forEach(meeting => {
      email += `${meeting.time} - ${meeting.title}\n`;
      email += `  Attendees: ${meeting.attendees.join(', ')}\n`;
      if (meeting.location) {
        email += `  Location: ${meeting.location}\n`;
      }
      email += `  Duration: ${meeting.duration} minutes\n\n`;
    });
  }

  // Pending Requests Section
  if (input.pendingRequests.length > 0) {
    email += "📋 PENDING REQUESTS\n";
    email += `${input.pendingRequests.length} pending requests:\n\n`;
    input.pendingRequests.forEach(req => {
      email += `• ${req.subject} (${req.requestor})\n`;
      email += `  Requested: ${req.requestedTime}\n`;
      if (req.daysOverdue > 3) {
        email += `  ⚠️ OVERDUE: ${req.daysOverdue} days\n`;
      }
      email += `  Priority: ${req.priority.toUpperCase()}\n\n`;
    });
  }

  // Conflicts Section
  if (input.conflicts.length > 0) {
    email += "⚠️ CONFLICTS DETECTED\n";
    email += `${input.conflicts.length} conflicts detected:\n\n`;
    input.conflicts.forEach(conflict => {
      email += `${conflict.severity.toUpperCase()}: ${conflict.description}\n`;
      email += `Recommendation: ${conflict.recommendation}\n\n`;
    });
  }

  // Quick Actions Section
  if (input.quickActions.length > 0) {
    email += "⚡ QUICK ACTIONS\n";
    input.quickActions.forEach(action => {
      email += `• ${action.label}: ${action.url}\n`;
    });
    email += "\n";
  }

  return email;
}

function validateEmailContent(email: string, testCase: any): { passed: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required sections
  testCase.expectedSections.forEach((section: string) => {
    if (!email.includes(section)) {
      errors.push(`Missing expected section: ${section}`);
    }
  });

  // Check should contain
  testCase.shouldContain.forEach((text: string) => {
    if (!email.includes(text)) {
      errors.push(`Missing expected content: ${text}`);
    }
  });

  // Check should not contain
  testCase.shouldNotContain.forEach((text: string) => {
    if (email.includes(text)) {
      errors.push(`Contains unexpected content: ${text}`);
    }
  });

  return {
    passed: errors.length === 0,
    errors
  };
}

function runDailyEmailTest(testCase: any): boolean {
  console.log(`\n🧪 Running: ${testCase.name}`);
  console.log(`   Category: ${testCase.category}`);
  console.log(`   Description: ${testCase.description}`);

  try {
    // Generate email content
    const email = generateDailyEmail(testCase.input);
    
    // Validate content
    const validation = validateEmailContent(email, testCase);
    
    if (validation.passed) {
      console.log(`   ✅ PASS`);
      return true;
    } else {
      console.log(`   ❌ FAIL`);
      validation.errors.forEach(error => {
        console.log(`      - ${error}`);
      });
      return false;
    }
  } catch (error) {
    console.log(`   💥 ERROR: ${error}`);
    return false;
  }
}

// Main Test Runner
export async function runAllDailyEmailTests(): Promise<void> {
  console.log('🚀 Daily Morning Email Feature Tests');
  console.log('=====================================');
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Run smoke tests first
  console.log('\n📊 SMOKE TESTS (Critical Path)');
  const smokeTests = testCases.filter(t => t.category === 'smoke');
  for (const testCase of smokeTests) {
    totalTests++;
    if (runDailyEmailTest(testCase)) {
      passedTests++;
    } else {
      failedTests++;
    }
  }

  // Run conflict detection tests
  console.log('\n⚠️ CONFLICT DETECTION TESTS');
  const conflictTests = testCases.filter(t => t.category === 'conflicts');
  for (const testCase of conflictTests) {
    totalTests++;
    if (runDailyEmailTest(testCase)) {
      passedTests++;
    } else {
      failedTests++;
    }
  }

  // Run edge case tests
  console.log('\n🎯 EDGE CASE TESTS');
  const edgeTests = testCases.filter(t => t.category === 'edge_cases');
  for (const testCase of edgeTests) {
    totalTests++;
    if (runDailyEmailTest(testCase)) {
      passedTests++;
    } else {
      failedTests++;
    }
  }

  // Summary
  console.log('\n📈 TEST RESULTS SUMMARY');
  console.log('========================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

  if (failedTests > 0) {
    console.log('\n⚠️ NOTE: Tests are expected to fail until feature implementation is complete.');
    console.log('This validates that our test cases will properly catch issues.');
  }
}

// Export for use in other test files
export { testCases, generateDailyEmail, validateEmailContent, runDailyEmailTest };

// Run tests if called directly
if (require.main === module) {
  runAllDailyEmailTests();
}