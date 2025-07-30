import * as dotenv from 'dotenv';
import { b } from './baml_client';
import { CalendarIntent } from './baml_client/types';

// Load environment variables from .env file
dotenv.config();

async function testCalendarIntent() {
  try {
    console.log('🧪 Testing BAML Calendar Intent Extraction...\n');
    
    const testCases = [
      'Can we meet Friday at 3?',
      'I need to schedule a 1-hour meeting with john@example.com next Tuesday at 2pm',
      'Are you available tomorrow morning?',
      'Thanks for the update on the project status'
    ];

    for (const testCase of testCases) {
      console.log(`📝 Input: "${testCase}"`);
      
      try {
        const result = await b.ExtractCalendarIntent(testCase);
        console.log('📊 Result:', JSON.stringify(result, null, 2));
        console.log('✅ Success!\n');
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : String(error));
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
  }
}

// Run the test
testCalendarIntent(); 