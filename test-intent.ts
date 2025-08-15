import { test, expect } from 'bun:test';
import { ExtractCalendarIntent } from './baml_client';

// @smoke - Core intent extraction
test('should extract meeting intent from simple request', async () => {
  const result = await ExtractCalendarIntent('Can we schedule a meeting for tomorrow at 2pm?');
  
  expect(result).toBeDefined();
  expect(result.action_needed).toBe('schedule');
});

// @smoke - Basic participant detection
test('should detect participants in meeting request', async () => {
  const result = await ExtractCalendarIntent('Schedule a meeting with John and Sarah for next week');
  
  expect(result).toBeDefined();
  expect(result.participants).toContain('John');
  expect(result.participants).toContain('Sarah');
});

test('should handle complex scheduling requests', async () => {
  const result = await ExtractCalendarIntent(
    'Let\'s set up a quarterly review meeting with the entire team next Friday at 3pm in the conference room'
  );
  
  expect(result).toBeDefined();
  expect(result.action_needed).toBe('schedule');
  expect(result.participants).toContain('team');
});

test('should extract cancellation intent', async () => {
  const result = await ExtractCalendarIntent('Please cancel the meeting scheduled for tomorrow');
  
  expect(result).toBeDefined();
  expect(result.action_needed).toBe('cancel');
});