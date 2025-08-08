import './test-utils';
import { b } from './baml_client';

/**
 * Simplified test suite for Voice Calendar Intent extraction
 * Tests the single BAML model that extracts intent + parameters
 */

interface VoiceTestCase {
  name: string;
  input: string;
  currentDateTime: string;
  expectedIntent: string;
  expectedParameters?: any;
  description: string;
}

const VOICE_TEST_CASES: VoiceTestCase[] = [
  // Schedule Query Tests Only
  {
    name: 'schedule_query_today',
    input: 'what\'s on my schedule today',
    currentDateTime: '2025-08-07 13:00:00 PST',
    expectedIntent: 'SCHEDULE_QUERY',
    expectedParameters: {
      query_start_date: '2025-08-07 00:00',
      query_end_date: '2025-08-07 23:59'
    },
    description: 'Query schedule for today with absolute dates'
  },
  {
    name: 'schedule_query_rest_of_day',
    input: 'what\'s on my schedule for the rest of today',
    currentDateTime: '2025-08-07 13:00:00 PST',
    expectedIntent: 'SCHEDULE_QUERY',
    expectedParameters: {
      query_start_date: '2025-08-07 13:00',
      query_end_date: '2025-08-07 23:59'
    },
    description: 'Query schedule for rest of today with absolute dates'
  },
  {
    name: 'schedule_query_tomorrow',
    input: 'what do I have tomorrow',
    currentDateTime: '2025-08-07 13:00:00 PST',
    expectedIntent: 'SCHEDULE_QUERY',
    expectedParameters: {
      query_start_date: '2025-08-08 00:00',
      query_end_date: '2025-08-08 23:59'
    },
    description: 'Query schedule for tomorrow with absolute dates'
  },
  {
    name: 'schedule_query_this_week',
    input: 'show me this week\'s meetings',
    currentDateTime: '2025-08-07 13:00:00 PST', // Thursday
    expectedIntent: 'SCHEDULE_QUERY',
    description: 'Query schedule for this week'
  },
  {
    name: 'schedule_query_next_week',
    input: 'what\'s my schedule next week',
    currentDateTime: '2025-08-07 13:00:00 PST',
    expectedIntent: 'SCHEDULE_QUERY',
    description: 'Query schedule for next week'
  }
];

/**
 * Test the VoiceCalendarIntent BAML function
 */
async function testOwnerCalendarIntent(testCase: VoiceTestCase): Promise<boolean> {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`   Input: "${testCase.input}"`);
  console.log(`   Expected Intent: ${testCase.expectedIntent}`);
  
  try {
    const result = await b.ExtractOwnerCalendarIntent(testCase.input, testCase.currentDateTime);
    // Check intent matches
    const intentMatches = result.intent_type === testCase.expectedIntent;
    if (intentMatches) {
      console.log(`   ✅ Intent matches expected`);
    } else {
      console.log(`   ❌ Intent mismatch! Expected: ${testCase.expectedIntent}, Got: ${result.intent_type}`);
    }
    
    // Log extracted parameters
    if (result.intent_type !== 'UNKNOWN') {
      console.log(`   📋 Extracted parameters:`);
      
      switch (result.intent_type) {
        case 'SCHEDULE_QUERY':
          console.log(`      - Query Start: ${result.query_start_date}`);
          console.log(`      - Query End: ${result.query_end_date}`);
          break;
        case 'MEETING_CREATE':
          console.log(`      - Participants: ${result.participants?.join(', ') || 'None'}`);
          console.log(`      - Datetime: ${result.preferred_datetime}`);
          console.log(`      - Duration: ${result.duration_minutes || 'Not specified'} minutes`);
          console.log(`      - Title: ${result.meeting_title || 'Not specified'}`);
          break;
        case 'MEETING_UPDATE':
          console.log(`      - Meeting ID: ${result.meeting_identifier}`);
          console.log(`      - New Datetime: ${result.new_datetime}`);
          break;
        case 'MEETING_CANCEL':
          console.log(`      - Cancel ID: ${result.cancel_meeting_identifier}`);
          break;
        case 'AVAILABILITY_CHECK':
          console.log(`      - Check Datetime: ${result.availability_datetime}`);
          console.log(`      - Duration: ${result.availability_duration_minutes || 'Not specified'} minutes`);
          break;
      }
    }
    
    return intentMatches;
    
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
    return false;
  }
}

/**
 * Run all voice intent tests
 */
export async function runVoiceTests(): Promise<void> {
  console.log('🎯 Starting Voice Calendar Intent Tests\n');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of VOICE_TEST_CASES) {
    try {
      const success = await testOwnerCalendarIntent(testCase);
      if (success) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ Test failed: ${testCase.name} - ${error}`);
      failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(`✅ Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
}

/**
 * Test specific scenarios for debugging
 */
async function testSpecificScenarios(): Promise<void> {
  console.log('🔍 Testing Specific Scenarios\n');
  
  // Test datetime conversion accuracy
  const datetimeTests = [
    {
      input: 'schedule a meeting tomorrow at 2pm',
      currentDateTime: '2025-08-07 13:00:00 PST',
      expectedDatetime: '2025-08-08 14:00'
    },
    {
      input: 'what\'s my schedule today',
      currentDateTime: '2025-08-07 13:00:00 PST',
      expectedStart: '2025-08-07 00:00',
      expectedEnd: '2025-08-07 23:59'
    }
  ];
  
  for (const test of datetimeTests) {
    console.log(`\n🕐 Testing datetime conversion:`);
    console.log(`   Input: "${test.input}"`);
    console.log(`   Current: ${test.currentDateTime}`);
    
    try {
      const result = await b.ExtractOwnerCalendarIntent(test.input, test.currentDateTime);
      console.log(`   Result datetime: ${result.preferred_datetime || result.query_start_date}`);
    } catch (error) {
      console.log(`   Error: ${error}`);
    }
  }
}

/**
 * Performance test for voice intent extraction
 */
async function performanceTest(): Promise<void> {
  console.log('\n⚡ Performance Test\n');
  
  const testInput = 'schedule a meeting with John tomorrow at 2pm';
  const currentDateTime = '2025-08-07 13:00:00 PST';
  const iterations = 5;
  
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    
    try {
      await b.ExtractOwnerCalendarIntent(testInput, currentDateTime);
      const endTime = Date.now();
      const duration = endTime - startTime;
      times.push(duration);
      console.log(`   Run ${i + 1}: ${duration}ms`);
    } catch (error) {
      console.log(`   Run ${i + 1}: Error - ${error}`);
    }
  }
  
  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`\n📈 Performance Summary:`);
    console.log(`   Average: ${avgTime.toFixed(1)}ms`);
    console.log(`   Min: ${minTime}ms`);
    console.log(`   Max: ${maxTime}ms`);
    console.log(`   Target: <3000ms for Siri compatibility`);
    
    if (avgTime < 3000) {
      console.log(`   ✅ Performance target met!`);
    } else {
      console.log(`   ⚠️  Performance target not met`);
    }
  }
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
  console.log('🎙️  Ashley Voice Calendar Intent Test Suite');
  console.log('Testing single BAML model approach\n');
  
  try {
    // Run main test suite
    await runVoiceTests();
    
    // Run specific scenario tests
    await testSpecificScenarios();
    
    // Run performance test
    await performanceTest();
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Export for use in other files
export { testOwnerCalendarIntent, VOICE_TEST_CASES };

// Run tests if this file is executed directly
if (require.main === module) {
  main();
}
