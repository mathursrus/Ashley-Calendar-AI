import { test } from 'node:test';
import assert from 'node:assert';
import { b } from '../baml_client';
import 'dotenv/config';

// @smoke - Core intent detection
test('should detect meeting creation intent', async () => {
  const email = `
    Subject: Meeting Request
    
    Hi team,
    
    I'd like to schedule a meeting with the engineering team for next Tuesday at 2 PM to discuss the new project requirements.
    
    Best regards,
    John
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.strictEqual(result.intent, 'create_meeting');
  assert.strictEqual(result.participants.length, 1);
  assert.strictEqual(result.participants[0], 'engineering team');
});

test('should detect meeting cancellation intent', async () => {
  const email = `
    Subject: Cancel Tomorrow's Meeting
    
    Hi everyone,
    
    I need to cancel our meeting scheduled for tomorrow at 3 PM due to a conflict.
    
    Thanks,
    Sarah
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.strictEqual(result.intent, 'cancel_meeting');
});

test('should detect meeting rescheduling intent', async () => {
  const email = `
    Subject: Reschedule Friday Meeting
    
    Hi team,
    
    Can we move our Friday 10 AM meeting to Monday at the same time?
    
    Best,
    Mike
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.strictEqual(result.intent, 'reschedule_meeting');
});

test('should extract participants correctly', async () => {
  const email = `
    Subject: Team Sync
    
    Hi Alice, Bob, and Charlie,
    
    Let's have a team sync next week. I'll send out calendar invites.
    
    Thanks,
    David
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.ok(result.participants.length >= 3);
  assert.ok(result.participants.includes('Alice'));
  assert.ok(result.participants.includes('Bob'));
  assert.ok(result.participants.includes('Charlie'));
});

test('should handle emails with no calendar intent', async () => {
  const email = `
    Subject: Project Update
    
    Hi team,
    
    Just wanted to give you an update on the project status. Everything is going well.
    
    Best,
    Jane
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.strictEqual(result.intent, 'no_action');
});

// @smoke - Date and time extraction
test('should extract date and time information', async () => {
  const email = `
    Subject: Meeting Tomorrow
    
    Hi team,
    
    Let's meet tomorrow at 2:30 PM in the conference room.
    
    Thanks,
    Alex
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.strictEqual(result.intent, 'create_meeting');
  assert.ok(result.datetime);
  assert.ok(result.datetime.includes('2:30'));
});

test('should handle relative dates', async () => {
  const email = `
    Subject: Next Week Meeting
    
    Hi everyone,
    
    Can we schedule a meeting for next Monday at 9 AM?
    
    Best,
    Lisa
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.strictEqual(result.intent, 'create_meeting');
  assert.ok(result.datetime);
  assert.ok(result.datetime.toLowerCase().includes('monday') || result.datetime.includes('9'));
});

test('should extract location information', async () => {
  const email = `
    Subject: Office Meeting
    
    Hi team,
    
    Let's meet in Conference Room A tomorrow at 3 PM.
    
    Thanks,
    Mark
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.strictEqual(result.intent, 'create_meeting');
  assert.ok(result.location);
  assert.ok(result.location.toLowerCase().includes('conference room a'));
});

test('should handle virtual meeting requests', async () => {
  const email = `
    Subject: Zoom Call
    
    Hi everyone,
    
    Let's have a Zoom call tomorrow at 4 PM to discuss the quarterly results.
    
    Best,
    Emma
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.strictEqual(result.intent, 'create_meeting');
  assert.ok(result.location);
  assert.ok(result.location.toLowerCase().includes('zoom') || result.location.toLowerCase().includes('virtual'));
});

// @smoke - Complex scenarios
test('should handle meeting updates', async () => {
  const email = `
    Subject: Update: Tomorrow's Meeting
    
    Hi team,
    
    Quick update - tomorrow's meeting will now include the design team as well.
    
    Thanks,
    Ryan
  `;

  const result = await b.ExtractCalendarIntent(email);
  
  assert.ok(['update_meeting', 'create_meeting'].includes(result.intent));
  assert.ok(result.participants.includes('design team'));
});