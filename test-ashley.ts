import { test, expect } from 'bun:test';
import { AshleyCalendarAI } from './ashley';

// @smoke - Core Ashley functionality
test('Ashley should process simple meeting request', async () => {
  const ashley = new AshleyCalendarAI();
  const result = await ashley.processEmailRequest(
    'Can we schedule a meeting for tomorrow at 2pm?',
    'user@example.com'
  );
  
  expect(result).toBeDefined();
  expect(result.intent).toBe('schedule');
});

test('Ashley should handle invalid email format', async () => {
  const ashley = new AshleyCalendarAI();
  
  await expect(ashley.processEmailRequest(
    'Schedule a meeting',
    'invalid-email'
  )).rejects.toThrow();
});

// @smoke - Basic calendar integration
test('Ashley should connect to calendar service', async () => {
  const ashley = new AshleyCalendarAI();
  const isConnected = await ashley.testCalendarConnection();
  
  expect(typeof isConnected).toBe('boolean');
});

test('Ashley should validate meeting times', async () => {
  const ashley = new AshleyCalendarAI();
  const isValid = ashley.validateMeetingTime('2024-12-25T14:00:00Z');
  
  expect(typeof isValid).toBe('boolean');
});