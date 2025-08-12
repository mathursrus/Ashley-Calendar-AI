// Simple test for calendar data gathering - demonstrates clean BAML integration

import * as dotenv from 'dotenv';
import { CalendarDataService } from './src/calendar-services/calendar-data-service';

// Load environment variables
dotenv.config();

async function testSimpleCalendarDataGathering(): Promise<void> {
  console.log('🧪 Testing Simple Calendar Data Gathering for BAML');
  console.log('='.repeat(60));
  
  // Check for Google Calendar API credentials
  const hasApiKey = !!process.env.GOOGLE_CALENDAR_API_KEY;
  const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  
  if (!hasApiKey && !hasServiceAccount) {
    console.log('⚠️  No Google Calendar API credentials found!');
    console.log('   Create a .env file with either:');
    console.log('   GOOGLE_CALENDAR_API_KEY=your_api_key');
    console.log('   OR');
    console.log('   GOOGLE_SERVICE_ACCOUNT_PATH=/path/to/service-account.json');
    console.log('   ');
    console.log('   Testing will continue with mock data only.');
    console.log('');
  } else {
    console.log('✅ Google Calendar API credentials found!');
    console.log(`   Using: ${hasApiKey ? 'API Key' : 'Service Account'}`);
    console.log('');
  }
  console.log('');

  const calendarDataService = new CalendarDataService();

  // Test scenarios
  const testScenarios = [
    {
      name: 'Mixed Access Scenario',
      participants: [
        'alice@company.com',           // Should have API access (mock)
        'bob@company.com',             // Should have API access (mock)
        'carol@external.com',          // Should need manual coordination
        'rentingourhouse2022@gmail.com' // Real Gmail account for testing
      ]
    },
    {
      name: 'All External Participants',
      participants: [
        'alice@external.com',
        'bob@contractor.com'
      ]
    }
  ];

  const startTime = new Date('2025-08-13T09:00:00-07:00');
  const endTime = new Date('2025-08-13T17:00:00-07:00');

  for (const scenario of testScenarios) {
    console.log(`📋 Testing: ${scenario.name}`);
    console.log(`   Participants: ${scenario.participants.join(', ')}`);
    console.log('');

    try {
      // This is all we need - simple data gathering
      const calendarData = await calendarDataService.gatherParticipantCalendarData(
        scenario.participants,
        startTime,
        endTime
      );

      console.log('📝 Calendar Data for BAML Input:');
      console.log('='.repeat(50));
      console.log(calendarData);
      console.log('='.repeat(50));

      console.log('');
      console.log('💡 How this would work with BAML:');
      console.log('   1. Pass this calendar data to AshleyCalendarAssistant()');
      console.log('   2. BAML decides whether to use API data or manual coordination');
      console.log('   3. BAML decides when/how to include consent messaging');
      console.log('   4. BAML generates appropriate email responses');
      console.log('   5. No complex business logic in TypeScript code!');
      
    } catch (error) {
      console.log('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    }

    console.log('\n' + '-'.repeat(60) + '\n');
  }

  console.log('🎯 Key Benefits of This Approach:');
  console.log('✅ Simple, clean code - just data gathering');
  console.log('✅ BAML makes all intelligent decisions');
  console.log('✅ Easy to maintain and extend');
  console.log('✅ Clear separation of concerns');
  console.log('✅ Raw calendar data + access status passed to LLM');
}

// Export for use in other test files
export { testSimpleCalendarDataGathering };

// Run if executed directly
if (require.main === module) {
  testSimpleCalendarDataGathering().catch(console.error);
}
