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

test('Ashley should handle timezone conversion', async () => {
  const ashley = new AshleyCalendarAI();
  const converted = ashley.convertTimezone(
    '2024-12-25T14:00:00Z',
    'America/New_York'
  );
  
  expect(converted).toBeDefined();
  expect(typeof converted).toBe('string');
});

test('Ashley should parse complex meeting requests', async () => {
  const ashley = new AshleyCalendarAI();
  const result = await ashley.processEmailRequest(
    'Let\'s have a team standup every Monday at 9am starting next week with John, Sarah, and Mike',
    'manager@company.com'
  );
  
  expect(result).toBeDefined();
  expect(result.intent).toBe('schedule');
  expect(result.participants).toContain('John');
  expect(result.participants).toContain('Sarah');
  expect(result.participants).toContain('Mike');
});

test('Ashley should handle meeting conflicts', async () => {
  const ashley = new AshleyCalendarAI();
  
  // First meeting
  await ashley.processEmailRequest(
    'Schedule a meeting for tomorrow at 2pm',
    'user1@example.com'
  );
  
  // Conflicting meeting
  const result = await ashley.processEmailRequest(
    'Schedule another meeting for tomorrow at 2pm',
    'user2@example.com'
  );
  
  expect(result.hasConflict).toBe(true);
});

test('Ashley should generate meeting summaries', async () => {
  const ashley = new AshleyCalendarAI();
  const summary = await ashley.generateMeetingSummary({
    title: 'Team Standup',
    participants: ['Alice', 'Bob'],
    duration: 30,
    agenda: 'Weekly updates'
  });
  
  expect(summary).toBeDefined();
  expect(typeof summary).toBe('string');
  expect(summary.length).toBeGreaterThan(0);
});

test('Ashley should handle recurring meetings', async () => {
  const ashley = new AshleyCalendarAI();
  const result = await ashley.processEmailRequest(
    'Schedule a weekly team meeting every Friday at 3pm',
    'team-lead@company.com'
  );
  
  expect(result).toBeDefined();
  expect(result.isRecurring).toBe(true);
  expect(result.recurrencePattern).toContain('weekly');
});

test('Ashley should validate participant availability', async () => {
  const ashley = new AshleyCalendarAI();
  const availability = await ashley.checkParticipantAvailability(
    ['alice@company.com', 'bob@company.com'],
    '2024-12-25T14:00:00Z',
    60
  );
  
  expect(availability).toBeDefined();
  expect(Array.isArray(availability)).toBe(true);
});

test('Ashley should format calendar invites', async () => {
  const ashley = new AshleyCalendarAI();
  const invite = ashley.formatCalendarInvite({
    title: 'Project Review',
    startTime: '2024-12-25T14:00:00Z',
    endTime: '2024-12-25T15:00:00Z',
    participants: ['reviewer@company.com'],
    location: 'Conference Room A'
  });
  
  expect(invite).toBeDefined();
  expect(invite).toContain('Project Review');
  expect(invite).toContain('Conference Room A');
});

test('Ashley should handle cancellation requests', async () => {
  const ashley = new AshleyCalendarAI();
  const result = await ashley.processEmailRequest(
    'Please cancel the meeting scheduled for tomorrow at 2pm',
    'user@example.com'
  );
  
  expect(result).toBeDefined();
  expect(result.intent).toBe('cancel');
});

test('Ashley should suggest alternative meeting times', async () => {
  const ashley = new AshleyCalendarAI();
  const alternatives = await ashley.suggestAlternativeTimes(
    ['busy-person@company.com'],
    '2024-12-25T14:00:00Z',
    60
  );
  
  expect(alternatives).toBeDefined();
  expect(Array.isArray(alternatives)).toBe(true);
});

test('Ashley should handle meeting updates', async () => {
  const ashley = new AshleyCalendarAI();
  const result = await ashley.processEmailRequest(
    'Can we move the 2pm meeting to 3pm instead?',
    'user@example.com'
  );
  
  expect(result).toBeDefined();
  expect(result.intent).toBe('reschedule');
});

test('Ashley should parse natural language dates', async () => {
  const ashley = new AshleyCalendarAI();
  const parsed = ashley.parseNaturalDate('next Tuesday at 3pm');
  
  expect(parsed).toBeDefined();
  expect(parsed instanceof Date).toBe(true);
});

test('Ashley should handle meeting room booking', async () => {
  const ashley = new AshleyCalendarAI();
  const result = await ashley.processEmailRequest(
    'Book the large conference room for our team meeting tomorrow at 10am',
    'admin@company.com'
  );
  
  expect(result).toBeDefined();
  expect(result.location).toContain('conference room');
});

test('Ashley should generate meeting agendas', async () => {
  const ashley = new AshleyCalendarAI();
  const agenda = await ashley.generateAgenda({
    meetingType: 'standup',
    participants: ['dev1@company.com', 'dev2@company.com'],
    duration: 30
  });
  
  expect(agenda).toBeDefined();
  expect(typeof agenda).toBe('string');
  expect(agenda.length).toBeGreaterThan(0);
});

test('Ashley should handle multi-day events', async () => {
  const ashley = new AshleyCalendarAI();
  const result = await ashley.processEmailRequest(
    'Schedule a 3-day conference from Monday to Wednesday',
    'events@company.com'
  );
  
  expect(result).toBeDefined();
  expect(result.isMultiDay).toBe(true);
  expect(result.duration).toBeGreaterThan(1440); // More than 24 hours
});

test('Ashley should integrate with external calendars', async () => {
  const ashley = new AshleyCalendarAI();
  const integration = await ashley.testExternalCalendarIntegration('google');
  
  expect(typeof integration).toBe('boolean');
});

test('Ashley should handle priority levels', async () => {
  const ashley = new AshleyCalendarAI();
  const result = await ashley.processEmailRequest(
    'URGENT: Schedule an emergency meeting for today at 4pm',
    'ceo@company.com'
  );
  
  expect(result).toBeDefined();
  expect(result.priority).toBe('high');
});

test('Ashley should validate business hours', async () => {
  const ashley = new AshleyCalendarAI();
  const isBusinessHours = ashley.isWithinBusinessHours('2024-12-25T14:00:00Z');
  
  expect(typeof isBusinessHours).toBe('boolean');
});

test('Ashley should handle meeting reminders', async () => {
  const ashley = new AshleyCalendarAI();
  const result = await ashley.processEmailRequest(
    'Set a reminder for the meeting tomorrow at 2pm - remind me 15 minutes before',
    'user@example.com'
  );
  
  expect(result).toBeDefined();
  expect(result.hasReminder).toBe(true);
  expect(result.reminderTime).toBe(15);
});

test('Ashley should process meeting follow-ups', async () => {
  const ashley = new AshleyCalendarAI();
  const followUp = await ashley.generateFollowUp({
    meetingTitle: 'Project Planning',
    actionItems: ['Review requirements', 'Update timeline'],
    participants: ['pm@company.com', 'dev@company.com']
  });
  
  expect(followUp).toBeDefined();
  expect(typeof followUp).toBe('string');
  expect(followUp).toContain('action items');
});

test('Ashley should handle meeting templates', async () => {
  const ashley = new AshleyCalendarAI();
  const template = ashley.getMeetingTemplate('standup');
  
  expect(template).toBeDefined();
  expect(template.duration).toBeDefined();
  expect(template.agenda).toBeDefined();
});

test('Ashley should calculate meeting costs', async () => {
  const ashley = new AshleyCalendarAI();
  const cost = ashley.calculateMeetingCost({
    participants: 5,
    duration: 60,
    averageHourlyRate: 50
  });
  
  expect(cost).toBeDefined();
  expect(typeof cost).toBe('number');
  expect(cost).toBeGreaterThan(0);
});

test('Ashley should handle meeting analytics', async () => {
  const ashley = new AshleyCalendarAI();
  const analytics = await ashley.getMeetingAnalytics('2024-12-01', '2024-12-31');
  
  expect(analytics).toBeDefined();
  expect(analytics.totalMeetings).toBeDefined();
  expect(analytics.averageDuration).toBeDefined();
});

test('Ashley should support meeting polls', async () => {
  const ashley = new AshleyCalendarAI();
  const result = await ashley.processEmailRequest(
    'Create a poll for the best time to meet: Monday 2pm, Tuesday 3pm, or Wednesday 1pm',
    'organizer@company.com'
  );
  
  expect(result).toBeDefined();
  expect(result.isPoll).toBe(true);
  expect(result.pollOptions.length).toBe(3);
});

test('Ashley should handle meeting transcription', async () => {
  const ashley = new AshleyCalendarAI();
  const transcription = await ashley.processMeetingTranscription(
    'audio-file-url.mp3',
    'meeting-id-123'
  );
  
  expect(transcription).toBeDefined();
  expect(typeof transcription).toBe('string');
});

test('Ashley should manage meeting permissions', async () => {
  const ashley = new AshleyCalendarAI();
  const hasPermission = ashley.checkMeetingPermission(
    'user@company.com',
    'meeting-id-123',
    'edit'
  );
  
  expect(typeof hasPermission).toBe('boolean');
});

test('Ashley should handle meeting attachments', async () => {
  const ashley = new AshleyCalendarAI();
  const result = await ashley.processEmailRequest(
    'Schedule a review meeting and attach the project document',
    'reviewer@company.com'
  );
  
  expect(result).toBeDefined();
  expect(result.hasAttachments).toBe(true);
});

test('Ashley should support meeting workflows', async () => {
  const ashley = new AshleyCalendarAI();
  const workflow = ashley.createMeetingWorkflow({
    type: 'interview',
    stages: ['screening', 'technical', 'final']
  });
  
  expect(workflow).toBeDefined();
  expect(workflow.stages.length).toBe(3);
});

test('Ashley should handle meeting feedback', async () => {
  const ashley = new AshleyCalendarAI();
  const feedback = await ashley.processMeetingFeedback(
    'meeting-id-123',
    {
      rating: 4,
      comments: 'Great discussion, well organized'
    }
  );
  
  expect(feedback).toBeDefined();
  expect(feedback.processed).toBe(true);
});

test('Ashley should manage meeting series', async () => {
  const ashley = new AshleyCalendarAI();
  const series = ashley.createMeetingSeries({
    title: 'Weekly Standup',
    frequency: 'weekly',
    duration: 30,
    participants: ['team@company.com']
  });
  
  expect(series).toBeDefined();
  expect(series.seriesId).toBeDefined();
});

test('Ashley should handle meeting escalation', async () => {
  const ashley = new AshleyCalendarAI();
  const escalation = await ashley.escalateMeeting(
    'meeting-id-123',
    'urgent-priority',
    'manager@company.com'
  );
  
  expect(escalation).toBeDefined();
  expect(escalation.escalated).toBe(true);
});

test('Ashley should support meeting delegation', async () => {
  const ashley = new AshleyCalendarAI();
  const result = await ashley.processEmailRequest(
    'Please have my assistant schedule the client meeting for next week',
    'executive@company.com'
  );
  
  expect(result).toBeDefined();
  expect(result.isDelegated).toBe(true);
});

test('Ashley should handle meeting compliance', async () => {
  const ashley = new AshleyCalendarAI();
  const compliance = ashley.checkMeetingCompliance({
    duration: 60,
    participants: 5,
    hasAgenda: true,
    isRecorded: false
  });
  
  expect(compliance).toBeDefined();
  expect(compliance.isCompliant).toBeDefined();
});

test('Ashley should manage meeting resources', async () => {
  const ashley = new AshleyCalendarAI();
  const resources = await ashley.allocateMeetingResources({
    roomSize: 'large',
    equipment: ['projector', 'whiteboard'],
    catering: true
  });
  
  expect(resources).toBeDefined();
  expect(resources.allocated).toBe(true);
});

test('Ashley should handle meeting notifications', async () => {
  const ashley = new AshleyCalendarAI();
  const notification = ashley.sendMeetingNotification({
    type: 'reminder',
    meetingId: 'meeting-123',
    recipients: ['attendee@company.com'],
    timing: 15 // minutes before
  });
  
  expect(notification).toBeDefined();
  expect(notification.sent).toBe(true);
});

test('Ashley should support meeting integration APIs', async () => {
  const ashley = new AshleyCalendarAI();
  const integration = await ashley.testAPIIntegration('slack');
  
  expect(typeof integration).toBe('boolean');
});

test('Ashley should handle meeting version control', async () => {
  const ashley = new AshleyCalendarAI();
  const version = ashley.createMeetingVersion('meeting-123', {
    title: 'Updated Project Review',
    time: '2024-12-25T15:00:00Z'
  });
  
  expect(version).toBeDefined();
  expect(version.versionId).toBeDefined();
});

test('Ashley should manage meeting archives', async () => {
  const ashley = new AshleyCalendarAI();
  const archived = ashley.archiveMeeting('old-meeting-123');
  
  expect(archived).toBeDefined();
  expect(archived.archived).toBe(true);
});

test('Ashley should handle meeting search', async () => {
  const ashley = new AshleyCalendarAI();
  const results = await ashley.searchMeetings({
    query: 'project review',
    dateRange: {
      start: '2024-12-01',
      end: '2024-12-31'
    }
  });
  
  expect(results).toBeDefined();
  expect(Array.isArray(results)).toBe(true);
});

test('Ashley should support meeting export', async () => {
  const ashley = new AshleyCalendarAI();
  const exported = ashley.exportMeetingData('meeting-123', 'ical');
  
  expect(exported).toBeDefined();
  expect(exported.format).toBe('ical');
  expect(exported.data).toBeDefined();
});

test('Ashley should handle meeting backup', async () => {
  const ashley = new AshleyCalendarAI();
  const backup = await ashley.backupMeetingData('2024-12-25');
  
  expect(backup).toBeDefined();
  expect(backup.backed_up).toBe(true);
});

test('Ashley should manage meeting security', async () => {
  const ashley = new AshleyCalendarAI();
  const security = ashley.applyMeetingSecurity('meeting-123', {
    encryption: true,
    accessControl: 'restricted',
    auditLog: true
  });
  
  expect(security).toBeDefined();
  expect(security.secured).toBe(true);
});

test('Ashley should handle meeting performance metrics', async () => {
  const ashley = new AshleyCalendarAI();
  const metrics = await ashley.getMeetingPerformanceMetrics('team-id-123');
  
  expect(metrics).toBeDefined();
  expect(metrics.efficiency).toBeDefined();
  expect(metrics.satisfaction).toBeDefined();
});

test('Ashley should support meeting customization', async () => {
  const ashley = new AshleyCalendarAI();
  const customized = ashley.customizeMeetingExperience('user-123', {
    theme: 'dark',
    notifications: 'minimal',
    defaultDuration: 45
  });
  
  expect(customized).toBeDefined();
  expect(customized.applied).toBe(true);
});

test('Ashley should handle meeting load balancing', async () => {
  const ashley = new AshleyCalendarAI();
  const balanced = ashley.balanceMeetingLoad('team-123', '2024-12-25');
  
  expect(balanced).toBeDefined();
  expect(balanced.optimized).toBe(true);
});

test('Ashley should manage meeting health checks', async () => {
  const ashley = new AshleyCalendarAI();
  const health = await ashley.performMeetingHealthCheck();
  
  expect(health).toBeDefined();
  expect(health.status).toBeDefined();
  expect(health.issues).toBeDefined();
});