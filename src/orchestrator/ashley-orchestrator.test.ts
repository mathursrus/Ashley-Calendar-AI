import { AshleyOrchestrator } from './ashley-orchestrator';
import { TimezoneDetector, TimezoneConverter } from '../timezone/timezone-utils';
import { ExtractCalendarIntent, GenerateEmailResponse } from '../../baml_client';

// Mock BAML functions
jest.mock('../../baml_client', () => ({
  ExtractCalendarIntent: jest.fn(),
  GenerateEmailResponse: jest.fn(),
}));

// Mock Google Calendar API
jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({})),
    },
    calendar: jest.fn().mockImplementation(() => ({
      events: {
        list: jest.fn(),
        insert: jest.fn(),
      },
    })),
  },
}));

describe('AshleyOrchestrator Integration Tests', () => {
  let orchestrator: AshleyOrchestrator;
  let mockExtractCalendarIntent: jest.MockedFunction<typeof ExtractCalendarIntent>;
  let mockGenerateEmailResponse: jest.MockedFunction<typeof GenerateEmailResponse>;

  beforeEach(() => {
    orchestrator = new AshleyOrchestrator();
    mockExtractCalendarIntent = ExtractCalendarIntent as jest.MockedFunction<typeof ExtractCalendarIntent>;
    mockGenerateEmailResponse = GenerateEmailResponse as jest.MockedFunction<typeof GenerateEmailResponse>;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Timezone-Aware Email Processing', () => {
    it('should process email with PST timezone detection and convert to Sid timezone', async () => {
      // Arrange
      const email = {
        from: 'john@example.com',
        to: 'ashley@sidmathur.com',
        subject: 'Meeting Request',
        body: 'Let\'s meet tomorrow at 2 PM PST to discuss the project.',
        headers: {
          'Date': 'Mon, 12 Aug 2024 14:00:00 -0800',
          'From': 'john@example.com',
        },
        timestamp: new Date('2024-08-12T14:00:00-08:00'),
      };

      const mockCalendarIntent = {
        action: 'SCHEDULE',
        timerange_start: '2024-08-13 14:00',
        timerange_end: '2024-08-13 15:00',
        title: 'Project Discussion',
        description: 'Discuss the project',
        location: 'Google Meet',
        attendees: ['john@example.com'],
        response_tone: 'PROFESSIONAL',
        meeting_type: 'VIRTUAL',
        priority: 'MEDIUM',
        requires_preparation: false,
        estimated_duration_minutes: 60,
        recurring_pattern: null,
        requestor_timezone: 'America/Los_Angeles',
        timezone_confidence: 0.8,
        timezone_source: 'content',
        explicit_timezone_mentioned: true,
        participant_timezones: ['America/Los_Angeles'],
        timezone_aware_times: ['2024-08-13 14:00 PST'],
      };

      mockExtractCalendarIntent.mockResolvedValue(mockCalendarIntent);
      mockGenerateEmailResponse.mockResolvedValue('Meeting scheduled for 2:00 PM PST (2:00 PM PST)');

      // Mock calendar API response
      const mockCalendar = (orchestrator as any).calendar;
      mockCalendar.events.list.mockResolvedValue({
        data: { items: [] }
      });
      mockCalendar.events.insert.mockResolvedValue({
        data: { id: 'event123' }
      });

      // Act
      await orchestrator.processEmail(email);

      // Assert
      expect(mockExtractCalendarIntent).toHaveBeenCalledWith(
        email.body,
        email.from,
        email.subject
      );

      // Verify timezone detection was applied to BAML intent
      expect(mockCalendarIntent.requestor_timezone).toBe('America/Los_Angeles');
      expect(mockCalendarIntent.timezone_confidence).toBe(0.8);
      expect(mockCalendarIntent.timezone_source).toBe('content');
      expect(mockCalendarIntent.explicit_timezone_mentioned).toBe(true);

      // Verify calendar event was created with correct timezone
      expect(mockCalendar.events.insert).toHaveBeenCalledWith({
        calendarId: 'primary',
        resource: expect.objectContaining({
          summary: 'Project Discussion',
          start: expect.objectContaining({
            timeZone: 'America/Los_Angeles',
          }),
          end: expect.objectContaining({
            timeZone: 'America/Los_Angeles',
          }),
        }),
      });
    });

    it('should handle EST timezone and convert times correctly', async () => {
      // Arrange
      const email = {
        from: 'sarah@eastcoast.com',
        to: 'ashley@sidmathur.com',
        subject: 'Quarterly Review',
        body: 'Can we schedule our quarterly review for Thursday at 3 PM EST?',
        headers: {
          'Date': 'Mon, 12 Aug 2024 15:00:00 -0500',
          'From': 'sarah@eastcoast.com',
        },
        timestamp: new Date('2024-08-12T15:00:00-05:00'),
      };

      const mockCalendarIntent = {
        action: 'SCHEDULE',
        timerange_start: '2024-08-15 15:00', // 3 PM EST
        timerange_end: '2024-08-15 16:00',   // 4 PM EST
        title: 'Quarterly Review',
        description: 'Quarterly review meeting',
        location: null,
        attendees: ['sarah@eastcoast.com'],
        response_tone: 'PROFESSIONAL',
        meeting_type: 'VIRTUAL',
        priority: 'HIGH',
        requires_preparation: true,
        estimated_duration_minutes: 60,
        recurring_pattern: null,
        requestor_timezone: 'America/New_York',
        timezone_confidence: 0.8,
        timezone_source: 'content',
        explicit_timezone_mentioned: true,
        participant_timezones: ['America/New_York'],
        timezone_aware_times: ['2024-08-15 15:00 EST'],
      };

      mockExtractCalendarIntent.mockResolvedValue(mockCalendarIntent);
      mockGenerateEmailResponse.mockResolvedValue('Meeting scheduled for 3:00 PM EST (12:00 PM PST)');

      // Mock calendar API
      const mockCalendar = (orchestrator as any).calendar;
      mockCalendar.events.list.mockResolvedValue({ data: { items: [] } });
      mockCalendar.events.insert.mockResolvedValue({ data: { id: 'event456' } });

      // Act
      await orchestrator.processEmail(email);

      // Assert - Verify timezone conversion occurred
      const expectedPSTStartTime = '2024-08-15 12:00'; // 3 PM EST = 12 PM PST
      const expectedPSTEndTime = '2024-08-15 13:00';   // 4 PM EST = 1 PM PST

      // Check that calendar lookup used converted times
      expect(mockCalendar.events.list).toHaveBeenCalledWith({
        calendarId: 'primary',
        timeMin: new Date(expectedPSTStartTime).toISOString(),
        timeMax: new Date(expectedPSTEndTime).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      // Check that event was created with Sid's timezone
      expect(mockCalendar.events.insert).toHaveBeenCalledWith({
        calendarId: 'primary',
        resource: expect.objectContaining({
          start: expect.objectContaining({
            timeZone: 'America/Los_Angeles',
          }),
          end: expect.objectContaining({
            timeZone: 'America/Los_Angeles',
          }),
          description: expect.stringContaining('Sender\'s time: 2024-08-15 15:00 - 2024-08-15 16:00 (America/New_York)'),
        }),
      });
    });

    it('should handle multi-participant timezone coordination', async () => {
      // Arrange
      const email = {
        from: 'manager@company.com',
        to: 'ashley@sidmathur.com',
        subject: 'Team Standup',
        body: 'Let\'s have our team standup tomorrow at 10 AM my time. CC\'ing the team.',
        headers: {
          'Date': 'Mon, 12 Aug 2024 10:00:00 +0000',
          'From': 'manager@company.com',
          'Cc': 'alice@company.com, bob@company.com',
        },
        timestamp: new Date('2024-08-12T10:00:00Z'),
      };

      const mockCalendarIntent = {
        action: 'SCHEDULE',
        timerange_start: '2024-08-13 10:00',
        timerange_end: '2024-08-13 10:30',
        title: 'Team Standup',
        description: 'Daily team standup',
        location: 'Google Meet',
        attendees: ['manager@company.com', 'alice@company.com', 'bob@company.com'],
        response_tone: 'PROFESSIONAL',
        meeting_type: 'VIRTUAL',
        priority: 'MEDIUM',
        requires_preparation: false,
        estimated_duration_minutes: 30,
        recurring_pattern: 'daily',
        requestor_timezone: 'Europe/London',
        timezone_confidence: 0.6,
        timezone_source: 'header',
        explicit_timezone_mentioned: false,
        participant_timezones: ['Europe/London', 'Europe/London', 'Europe/London'],
        timezone_aware_times: ['2024-08-13 10:00 GMT'],
      };

      mockExtractCalendarIntent.mockResolvedValue(mockCalendarIntent);
      mockGenerateEmailResponse.mockResolvedValue(
        'Team standup scheduled for 10:00 AM GMT (2:00 AM PST). I\'ve coordinated across all participant timezones.'
      );

      // Mock calendar API
      const mockCalendar = (orchestrator as any).calendar;
      mockCalendar.events.list.mockResolvedValue({ data: { items: [] } });
      mockCalendar.events.insert.mockResolvedValue({ data: { id: 'event789' } });

      // Act
      await orchestrator.processEmail(email);

      // Assert
      expect(mockExtractCalendarIntent).toHaveBeenCalled();
      
      // Verify multi-participant timezone handling
      expect(mockGenerateEmailResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          attendees: expect.arrayContaining(['manager@company.com', 'alice@company.com', 'bob@company.com']),
          requestor_timezone: 'Europe/London',
        }),
        expect.any(String),
        'Europe/London',
        expect.arrayContaining(['Europe/London'])
      );

      // Verify calendar event includes timezone information
      expect(mockCalendar.events.insert).toHaveBeenCalledWith({
        calendarId: 'primary',
        resource: expect.objectContaining({
          attendees: expect.arrayContaining([
            { email: 'manager@company.com' },
            { email: 'alice@company.com' },
            { email: 'bob@company.com' },
          ]),
          description: expect.stringContaining('Timezone Information'),
        }),
      });
    });

    it('should fallback to Sid timezone when detection fails', async () => {
      // Arrange
      const email = {
        from: 'unknown@example.com',
        to: 'ashley@sidmathur.com',
        subject: 'Quick Chat',
        body: 'Can we chat tomorrow at 2 PM?', // No timezone specified
        headers: {
          'From': 'unknown@example.com',
        },
        timestamp: new Date(),
      };

      const mockCalendarIntent = {
        action: 'SCHEDULE',
        timerange_start: '2024-08-13 14:00',
        timerange_end: '2024-08-13 14:30',
        title: 'Quick Chat',
        description: null,
        location: null,
        attendees: ['unknown@example.com'],
        response_tone: 'FRIENDLY',
        meeting_type: 'VIRTUAL',
        priority: 'LOW',
        requires_preparation: false,
        estimated_duration_minutes: 30,
        recurring_pattern: null,
        requestor_timezone: 'America/Los_Angeles', // Fallback timezone
        timezone_confidence: 0.0,
        timezone_source: 'fallback',
        explicit_timezone_mentioned: false,
        participant_timezones: ['America/Los_Angeles'],
        timezone_aware_times: [],
      };

      mockExtractCalendarIntent.mockResolvedValue(mockCalendarIntent);
      mockGenerateEmailResponse.mockResolvedValue('Chat scheduled for 2:00 PM PST');

      // Mock calendar API
      const mockCalendar = (orchestrator as any).calendar;
      mockCalendar.events.list.mockResolvedValue({ data: { items: [] } });
      mockCalendar.events.insert.mockResolvedValue({ data: { id: 'event999' } });

      // Act
      await orchestrator.processEmail(email);

      // Assert
      expect(mockCalendarIntent.requestor_timezone).toBe('America/Los_Angeles');
      expect(mockCalendarIntent.timezone_confidence).toBe(0.0);
      expect(mockCalendarIntent.timezone_source).toBe('fallback');
      
      // No timezone conversion should occur since both are in Sid's timezone
      expect(mockCalendar.events.list).toHaveBeenCalledWith({
        calendarId: 'primary',
        timeMin: new Date('2024-08-13 14:00').toISOString(),
        timeMax: new Date('2024-08-13 14:30').toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
    });

    it('should handle query actions without creating calendar events', async () => {
      // Arrange
      const email = {
        from: 'colleague@work.com',
        to: 'ashley@sidmathur.com',
        subject: 'Availability Check',
        body: 'What does Sid\'s schedule look like next Tuesday afternoon?',
        headers: {
          'From': 'colleague@work.com',
        },
        timestamp: new Date(),
      };

      const mockCalendarIntent = {
        action: 'QUERY',
        timerange_start: '2024-08-20 12:00',
        timerange_end: '2024-08-20 18:00',
        title: null,
        description: null,
        location: null,
        attendees: [],
        response_tone: 'PROFESSIONAL',
        meeting_type: 'VIRTUAL',
        priority: 'LOW',
        requires_preparation: false,
        estimated_duration_minutes: null,
        recurring_pattern: null,
        requestor_timezone: 'America/Los_Angeles',
        timezone_confidence: 0.0,
        timezone_source: 'fallback',
        explicit_timezone_mentioned: false,
        participant_timezones: [],
        timezone_aware_times: [],
      };

      mockExtractCalendarIntent.mockResolvedValue(mockCalendarIntent);

      // Act
      await orchestrator.processEmail(email);

      // Assert
      expect(mockExtractCalendarIntent).toHaveBeenCalled();
      
      // Should not create calendar events for QUERY actions
      const mockCalendar = (orchestrator as any).calendar;
      expect(mockCalendar.events.insert).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle BAML extraction errors gracefully', async () => {
      // Arrange
      const email = {
        from: 'test@example.com',
        to: 'ashley@sidmathur.com',
        subject: 'Test',
        body: 'Test email',
        headers: {},
        timestamp: new Date(),
      };

      mockExtractCalendarIntent.mockRejectedValue(new Error('BAML extraction failed'));

      // Act & Assert
      await expect(orchestrator.processEmail(email)).resolves.not.toThrow();
    });

    it('should handle calendar API errors gracefully', async () => {
      // Arrange
      const email = {
        from: 'test@example.com',
        to: 'ashley@sidmathur.com',
        subject: 'Meeting',
        body: 'Let\'s meet tomorrow at 2 PM',
        headers: {},
        timestamp: new Date(),
      };

      const mockCalendarIntent = {
        action: 'SCHEDULE',
        timerange_start: '2024-08-13 14:00',
        timerange_end: '2024-08-13 15:00',
        title: 'Meeting',
        description: null,
        location: null,
        attendees: ['test@example.com'],
        response_tone: 'PROFESSIONAL',
        meeting_type: 'VIRTUAL',
        priority: 'MEDIUM',
        requires_preparation: false,
        estimated_duration_minutes: 60,
        recurring_pattern: null,
        requestor_timezone: 'America/Los_Angeles',
        timezone_confidence: 0.0,
        timezone_source: 'fallback',
        explicit_timezone_mentioned: false,
        participant_timezones: ['America/Los_Angeles'],
        timezone_aware_times: [],
      };

      mockExtractCalendarIntent.mockResolvedValue(mockCalendarIntent);
      mockGenerateEmailResponse.mockResolvedValue('Error response');

      // Mock calendar API to throw error
      const mockCalendar = (orchestrator as any).calendar;
      mockCalendar.events.list.mockResolvedValue({ data: { items: [] } });
      mockCalendar.events.insert.mockRejectedValue(new Error('Calendar API error'));

      // Act & Assert
      await expect(orchestrator.processEmail(email)).resolves.not.toThrow();
    });
  });

  describe('Timezone Conversion Integration', () => {
    it('should properly integrate timezone utilities with orchestrator', () => {
      // Test that timezone utilities are properly imported and used
      expect(TimezoneDetector).toBeDefined();
      expect(TimezoneConverter).toBeDefined();
      
      // Test timezone detection
      const headers = { 'Date': 'Mon, 12 Aug 2024 14:00:00 -0800' };
      const content = 'Meeting at 2 PM PST';
      const timezone = TimezoneDetector.detectTimezone(headers, content);
      
      expect(timezone.detectedTimezone).toBeDefined();
      expect(timezone.confidence).toBeGreaterThan(0);
      expect(timezone.source).toBeDefined();
    });

    it('should convert times correctly between timezones', () => {
      // Test timezone conversion
      const pstTime = '2024-08-13 14:00';
      const estTime = TimezoneConverter.convertTime(pstTime, 'America/Los_Angeles', 'America/New_York');
      
      expect(estTime).toBe('2024-08-13 17:00'); // 2 PM PST = 5 PM EST
    });
  });
});