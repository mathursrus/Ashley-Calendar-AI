import { test } from 'node:test';
import assert from 'node:assert';
import { b } from './baml_client';
import 'dotenv/config';

// @smoke - Core intent detection
test('should detect meeting creation intent', async () => {
  const email = `
    From: john@company.com
    To: sid.mathur@gmail.com
    Subject: Meeting Request
    Date: 2025-01-15
    
    Hi Sid,
    
    I'd like to schedule a meeting with the engineering team for next Tuesday at 2 PM to discuss the new project requirements.
    
    Best regards,
    John
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.strictEqual(result.action_needed, true);
  assert.strictEqual(result.requestor, 'john@company.com');
  assert.ok(result.participants.includes('engineering team'));
});

test('should detect no action needed for informational emails', async () => {
  const email = `
    From: sarah@company.com
    To: sid.mathur@gmail.com
    Subject: Project Update
    Date: 2025-01-15
    
    Hi Sid,
    
    Just wanted to give you an update on the project status. Everything is going well.
    
    Best,
    Sarah
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.strictEqual(result.action_needed, false);
});

test('should extract meeting participants correctly', async () => {
  const email = `
    From: david@company.com
    To: sid.mathur@gmail.com
    Subject: Team Sync
    Date: 2025-01-15
    
    Hi Sid,
    
    Let's have a team sync next week with Alice, Bob, and Charlie. I'll coordinate the timing.
    
    Thanks,
    David
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.strictEqual(result.action_needed, true);
  assert.strictEqual(result.requestor, 'david@company.com');
  assert.ok(result.participants.includes('Alice'));
  assert.ok(result.participants.includes('Bob'));
  assert.ok(result.participants.includes('Charlie'));
});

test('should extract requestor information', async () => {
  const email = `
    From: mike@company.com
    To: sid.mathur@gmail.com
    Subject: Reschedule Friday Meeting
    Date: 2025-01-15
    
    Hi Sid,
    
    Can we move our Friday 10 AM meeting to Monday at the same time?
    
    Best,
    Mike
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.strictEqual(result.action_needed, true);
  assert.strictEqual(result.requestor, 'mike@company.com');
});

// @smoke - Date and time extraction
test('should extract time range information', async () => {
  const email = `
    From: alex@company.com
    To: sid.mathur@gmail.com
    Subject: Meeting Tomorrow
    Date: 2025-01-15
    
    Hi Sid,
    
    Let's meet tomorrow at 2:30 PM in the conference room.
    
    Thanks,
    Alex
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.strictEqual(result.action_needed, true);
  assert.ok(result.timerange_start);
  assert.ok(result.timerange_start.includes('2025-01-16'));
});

test('should handle relative dates', async () => {
  const email = `
    From: lisa@company.com
    To: sid.mathur@gmail.com
    Subject: Next Week Meeting
    Date: 2025-01-15
    
    Hi Sid,
    
    Can we schedule a meeting for next Monday at 9 AM?
    
    Best,
    Lisa
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.strictEqual(result.action_needed, true);
  assert.ok(result.timerange_start);
  assert.ok(result.baseline_date === '2025-01-15');
});

test('should extract request details', async () => {
  const email = `
    From: mark@company.com
    To: sid.mathur@gmail.com
    Subject: Office Meeting
    Date: 2025-01-15
    
    Hi Sid,
    
    Let's meet in Conference Room A tomorrow at 3 PM to discuss the quarterly results.
    
    Thanks,
    Mark
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.strictEqual(result.action_needed, true);
  assert.ok(result.request_details);
  assert.ok(result.request_details.toLowerCase().includes('quarterly results'));
});

test('should handle virtual meeting requests', async () => {
  const email = `
    From: emma@company.com
    To: sid.mathur@gmail.com
    Subject: Zoom Call
    Date: 2025-01-15
    
    Hi Sid,
    
    Let's have a Zoom call tomorrow at 4 PM to discuss the quarterly results.
    
    Best,
    Emma
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.strictEqual(result.action_needed, true);
  assert.ok(result.request_details);
  assert.ok(result.request_details.toLowerCase().includes('zoom'));
});

// @smoke - Complex scenarios
test('should handle meeting updates', async () => {
  const email = `
    From: ryan@company.com
    To: sid.mathur@gmail.com
    Subject: Update: Tomorrow's Meeting
    Date: 2025-01-15
    
    Hi Sid,
    
    Quick update - tomorrow's meeting will now include the design team as well.
    
    Thanks,
    Ryan
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.strictEqual(result.action_needed, true);
  assert.ok(result.participants.includes('design team'));
});