import { AshleyOrchestrator } from './ashley-orchestrator';
import { TimezoneDetector, TimezoneConverter } from '../timezone/timezone-utils';

// Mock the BAML client
jest.mock('../../baml_client', () => ({
  b: {
    ExtractCalendarIntent: jest.fn(),
    GenerateEmailResponse: jest.fn(),
  },
}));

// Mock Gmail API
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        on: jest.fn(),
      })),
    },
    gmail: jest.fn().mockImplementation(() => ({
      users: {
        messages: {
          list: jest.fn(),
          get: jest.fn(),
          send: jest.fn(),
          modify: jest.fn(),
        },
      },
    })),
  },
}));

// Mock CalendarDataService
jest.mock('../calendar-services/calendar-data-service', () => ({
  CalendarDataService: jest.fn().mockImplementation(() => ({
    getSidCalendarData: jest.fn().mockResolvedValue('Sid is available'),
  })),
}));

describe('AshleyOrchestrator Timezone Integration', () => {
  let orchestrator: AshleyOrchestrator;

  beforeEach(() => {
    orchestrator = new AshleyOrchestrator();
    jest.clearAllMocks();
  });

  describe('Timezone Detection Integration', () => {
    it('should detect timezone and integrate with BAML intent', () => {
      // Test that timezone utilities are properly integrated
      const headers = { 'Date': 'Mon, 12 Aug 2024 14:00:00 -0800' };
      const content = 'Let\'s meet at 2 PM PST tomorrow';
      
      const timezone = TimezoneDetector.detectTimezone(headers, content);
      
      expect(timezone.detectedTimezone).toBeDefined();
      expect(timezone.confidence).toBeGreaterThan(0);
      expect(timezone.source).toBeDefined();
    });

    it('should convert times between timezones correctly', () => {
      const pstTime = '2024-08-13 14:00';
      const estTime = TimezoneConverter.convertTime(pstTime, 'America/Los_Angeles', 'America/New_York');
      
      expect(estTime).toBe('2024-08-13 17:00'); // 2 PM PST = 5 PM EST
    });

    it('should convert to Sid timezone for calendar operations', () => {
      const estTime = '2024-08-13 15:00'; // 3 PM EST
      const sidTime = TimezoneConverter.convertToSidTimezone(estTime, 'America/New_York');
      
      expect(sidTime).toBe('2024-08-13 12:00'); // 3 PM EST = 12 PM PST
    });
  });

  describe('Explicit Timezone Detection', () => {
    it('should detect explicit timezone mentions', () => {
      const orchestratorInstance = orchestrator as any;
      
      expect(orchestratorInstance.hasExplicitTimezone('Meeting at 2 PM PST')).toBe(true);
      expect(orchestratorInstance.hasExplicitTimezone('Meeting at 2 PM Eastern time')).toBe(true);
      expect(orchestratorInstance.hasExplicitTimezone('Meeting at 2 PM')).toBe(false);
    });
  });
});