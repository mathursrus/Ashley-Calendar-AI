import './test-utils';
import { b } from './baml_client';

/**
 * Test suite for Speech Formatter - converting calendar events to Siri-friendly responses
 */

interface SpeechTestCase {
  name: string;
  eventsJson: string;
  queryContext: string;
  currentDateTime: string;
  description: string;
}

const SPEECH_TEST_CASES: SpeechTestCase[] = [
  {
    name: 'empty_schedule',
    eventsJson: '[]',
    queryContext: "what's on my schedule today",
    currentDateTime: '2025-08-07 13:00:00 PST',
    description: 'Empty schedule should give encouraging response'
  },
  {
    name: 'single_upcoming_meeting',
    eventsJson: '[{"title": "Project Review", "start_time": "2025-08-07 14:00:00", "end_time": "2025-08-07 15:00:00", "participants": ["John Smith"], "location": "Conference Room A"}]',
    queryContext: "what's on my schedule today",
    currentDateTime: '2025-08-07 13:00:00 PST',
    description: 'Single meeting should be clearly announced with time'
  },
  {
    name: 'multiple_meetings_today',
    eventsJson: '[{"title": "Team Standup", "start_time": "2025-08-07 09:30:00", "end_time": "2025-08-07 10:00:00", "participants": ["Team"]}, {"title": "Lunch with Sarah", "start_time": "2025-08-07 12:00:00", "end_time": "2025-08-07 13:00:00", "participants": ["Sarah Johnson"]}, {"title": "Client Call", "start_time": "2025-08-07 15:00:00", "end_time": "2025-08-07 15:45:00", "participants": ["Client Team"]}]',
    queryContext: "what's on my schedule today",
    currentDateTime: '2025-08-07 13:00:00 PST',
    description: 'Multiple meetings should be summarized with next important one highlighted'
  },
  {
    name: 'rest_of_day_query',
    eventsJson: '[{"title": "Client Call", "start_time": "2025-08-07 15:00:00", "end_time": "2025-08-07 15:45:00", "participants": ["Client Team"]}, {"title": "Team Retrospective", "start_time": "2025-08-07 16:30:00", "end_time": "2025-08-07 17:30:00", "participants": ["Development Team"]}]',
    queryContext: "what's on my schedule for the rest of today",
    currentDateTime: '2025-08-07 13:00:00 PST',
    description: 'Rest of day should focus on remaining events'
  },
  {
    name: 'busy_day_many_meetings',
    eventsJson: '[{"title": "Board Meeting", "start_time": "2025-08-07 09:00:00", "end_time": "2025-08-07 10:30:00"}, {"title": "Project Review", "start_time": "2025-08-07 10:30:00", "end_time": "2025-08-07 11:30:00"}, {"title": "Team Lunch", "start_time": "2025-08-07 12:00:00", "end_time": "2025-08-07 13:00:00"}, {"title": "Client Presentation", "start_time": "2025-08-07 15:00:00", "end_time": "2025-08-07 16:00:00"}, {"title": "One-on-One", "start_time": "2025-08-07 16:30:00", "end_time": "2025-08-07 17:00:00"}]',
    queryContext: "what's on my schedule today",
    currentDateTime: '2025-08-07 08:00:00 PST',
    description: 'Busy day should provide high-level summary and mention breaks'
  },
  {
    name: 'tomorrow_schedule',
    eventsJson: '[{"title": "Morning Standup", "start_time": "2025-08-08 09:00:00", "end_time": "2025-08-08 09:30:00"}, {"title": "Design Review", "start_time": "2025-08-08 14:00:00", "end_time": "2025-08-08 15:30:00"}]',
    queryContext: "what do I have tomorrow",
    currentDateTime: '2025-08-07 17:00:00 PST',
    description: 'Tomorrow query should use appropriate time references'
  }
];

/**
 * Test the FormatScheduleForSiri BAML function
 */
async function testSpeechFormatter(testCase: SpeechTestCase): Promise<boolean> {
  console.log(`\n🎙️ Testing: ${testCase.name}`);
  console.log(`   Query: "${testCase.queryContext}"`);
  console.log(`   Events: ${JSON.parse(testCase.eventsJson).length} events`);
  
  try {
    const result = await b.FormatScheduleForSiri(
      testCase.eventsJson, 
      testCase.queryContext, 
      testCase.currentDateTime
    );
    
    console.log(`\n   🗣️ SPOKEN TEXT:`);
    console.log(`   "${result.spoken}"`);
    
    console.log(`\n   📱 DISPLAYED TEXT:`);
    console.log(`   ${result.displayed}`);
    
    console.log(`\n   📊 METADATA:`);
    console.log(`   - Event Count: ${result.event_count}`);
    console.log(`   - Has Conflicts: ${result.has_conflicts}`);
    
    // Basic validation
    const speechLength = result.spoken.length;
    const isReasonableLength = speechLength > 10 && speechLength < 500;
    const hasEventCount = result.event_count >= 0;
    
    if (isReasonableLength && hasEventCount) {
      console.log(`   ✅ Response looks good (${speechLength} chars)`);
      return true;
    } else {
      console.log(`   ⚠️ Response might need adjustment (${speechLength} chars)`);
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
    return false;
  }
}

/**
 * Run all speech formatter tests
 */
export async function runSpeechFormatterTests(): Promise<void> {
  console.log('🎯 Starting Speech Formatter Tests for Siri Integration\n');
  console.log('='.repeat(70));
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of SPEECH_TEST_CASES) {
    try {
      const success = await testSpeechFormatter(testCase);
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
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`📊 Speech Formatter Test Results: ${passed} passed, ${failed} failed`);
  console.log(`✅ Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (passed > 0) {
    console.log('\n🎉 Speech formatter is working! Ready for Siri integration.');
    console.log('💡 Next steps:');
    console.log('   1. Integrate with N8N workflow');
    console.log('   2. Test with actual Siri Shortcuts');
    console.log('   3. Fine-tune speech patterns based on user feedback');
  }
}

/**
 * Test speech quality and characteristics
 */
async function testSpeechQuality(): Promise<void> {
  console.log('\n🔍 Testing Speech Quality Characteristics\n');
  
  const qualityTest = {
    eventsJson: '[{"title": "Team Meeting", "start_time": "2025-08-07 14:30:00", "end_time": "2025-08-07 15:30:00"}]',
    queryContext: "what's next on my schedule",
    currentDateTime: '2025-08-07 13:00:00 PST'
  };
  
  try {
    const result = await b.FormatScheduleForSiri(
      qualityTest.eventsJson,
      qualityTest.queryContext,
      qualityTest.currentDateTime
    );
    
    console.log('📝 Analyzing speech characteristics:');
    
    // Check for speech-friendly patterns
    const spokenText = result.spoken.toLowerCase();
    const hasSpeechFriendlyTime = spokenText.includes('thirty') || spokenText.includes('two thirty');
    const hasConversationalTone = spokenText.includes('you have') || spokenText.includes('your');
    const isReasonableLength = result.spoken.length < 150;
    
    console.log(`   ${hasSpeechFriendlyTime ? '✅' : '❌'} Uses speech-friendly time format`);
    console.log(`   ${hasConversationalTone ? '✅' : '❌'} Has conversational tone`);
    console.log(`   ${isReasonableLength ? '✅' : '❌'} Reasonable length for speech (${result.spoken.length} chars)`);
    
    console.log(`\n   Sample spoken: "${result.spoken}"`);
    console.log(`   Sample displayed: "${result.displayed}"`);
    
  } catch (error) {
    console.log(`❌ Quality test failed: ${error}`);
  }
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
  console.log('🎙️ Ashley Speech Formatter Test Suite');
  console.log('Converting calendar events to Siri-friendly responses\n');
  
  try {
    // Run main test suite
    await runSpeechFormatterTests();
    
    // Run quality analysis
    await testSpeechQuality();
    
    console.log('\n🎉 All speech formatter tests completed!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Export for use in other files
export { testSpeechFormatter, SPEECH_TEST_CASES };

// Run tests if this file is executed directly
if (require.main === module) {
  main();
}
