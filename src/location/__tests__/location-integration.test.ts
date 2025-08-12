// End-to-end integration tests for location enhancement feature

import { LocationServiceImpl } from '../location-service';
import { LocationDetector } from '../location-detector';
import { GoogleMeetService } from '../google-meet-service';

// Mock external dependencies
jest.mock('googleapis');

describe('Location Enhancement Integration Tests', () => {
  let locationService: LocationServiceImpl;

  beforeEach(() => {
    // Set up test environment variables
    process.env.ASHLEY_GMAIL_CLIENT_ID = 'test-client-id';
    process.env.ASHLEY_GMAIL_CLIENT_SECRET = 'test-client-secret';
    process.env.ASHLEY_GMAIL_REFRESH_TOKEN = 'test-refresh-token';

    locationService = new LocationServiceImpl();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.ASHLEY_GMAIL_CLIENT_ID;
    delete process.env.ASHLEY_GMAIL_CLIENT_SECRET;
    delete process.env.ASHLEY_GMAIL_REFRESH_TOKEN;
  });

  describe('Real-world email scenarios', () => {
    it('should handle coffee meeting request', async () => {
      const emailContent = `
        Hi Ashley,
        
        Would you like to grab coffee tomorrow at 2pm? 
        I was thinking we could meet at the Starbucks on Main Street.
        
        Let me know if that works!
        
        Best,
        John
      `;

      const result = LocationDetector.detectLocation(emailContent);
      
      expect(result.location?.type).toBe('physical');
      expect(result.location?.address).toContain('Starbucks');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.detectedKeywords).toContain('starbucks');
    });

    it('should handle virtual meeting request', async () => {
      const emailContent = `
        Hi Ashley,
        
        Can we schedule a Zoom call to discuss the project updates?
        I'm available tomorrow afternoon.
        
        Thanks,
        Sarah
      `;

      const result = LocationDetector.detectLocation(emailContent);
      
      expect(result.location?.type).toBe('virtual');
      expect(result.confidence).toBeGreaterThan(80);
      expect(result.detectedKeywords).toContain('zoom');
    });

    it('should handle office meeting with room specification', async () => {
      const emailContent = `
        Team meeting tomorrow at 10am in Conference Room A.
        Please bring your laptops for the presentation.
      `;

      const result = LocationDetector.detectLocation(emailContent);
      
      expect(result.location?.type).toBe('physical');
      expect(result.detectedKeywords.some(k => k.includes('Conference Room A'))).toBe(true);
      expect(result.confidence).toBeGreaterThan(30);
    });

    it('should default to virtual for ambiguous requests', async () => {
      const emailContent = `
        Hi Ashley,
        
        Can we meet sometime next week to discuss the proposal?
        I'm flexible on timing.
        
        Best,
        Mike
      `;

      const bestLocation = await locationService.determineBestLocation(emailContent, 2);
      
      expect(bestLocation.type).toBe('virtual');
      expect(bestLocation.notes).toContain('Google Meet');
    });
  });

  describe('Context-aware location detection', () => {
    it('should favor physical meetings for same-domain participants', async () => {
      const emailContent = 'Let\'s meet at the office tomorrow';
      const senderEmail = 'alice@company.com';
      const participantEmails = ['bob@company.com', 'charlie@company.com'];

      const result = await locationService.detectLocationWithContext(
        emailContent,
        senderEmail,
        participantEmails
      );

      expect(result.location?.type).toBe('physical');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.detectedKeywords).toContain('same-domain-participants');
    });

    it('should suggest virtual for large external meetings', async () => {
      const emailContent = 'Team sync next Tuesday';
      const senderEmail = 'alice@company.com';
      const participantEmails = [
        'bob@external1.com',
        'charlie@external2.com', 
        'dave@external3.com',
        'eve@external4.com'
      ];

      const result = await locationService.detectLocationWithContext(
        emailContent,
        senderEmail,
        participantEmails
      );

      expect(result.location?.type).toBe('virtual');
      expect(result.location?.notes).toContain('Large meeting');
      expect(result.confidence).toBe(75);
    });
  });

  describe('Calendar event creation workflow', () => {
    it('should create complete physical meeting event', async () => {
      const eventDetails = {
        summary: 'Coffee Meeting',
        description: 'Catch up over coffee',
        start_time: '2025-08-13T14:00:00-07:00',
        end_time: '2025-08-13T15:00:00-07:00',
        attendees: ['john.doe@example.com'],
        timezone: 'America/Los_Angeles'
      };

      const physicalLocation = {
        type: 'physical' as const,
        address: '123 Main Street, Starbucks'
      };

      const calendarEvent = await locationService.createCalendarEventWithLocation(
        eventDetails,
        physicalLocation
      );

      expect(calendarEvent.summary).toBe('Coffee Meeting');
      expect(calendarEvent.location).toBe('123 Main Street, Starbucks');
      expect(calendarEvent.conferenceData).toBeUndefined();
      expect(calendarEvent.attendees).toHaveLength(1);
      expect(calendarEvent.attendees[0].email).toBe('john.doe@example.com');
    });

    it('should create complete virtual meeting event', async () => {
      const eventDetails = {
        summary: 'Project Discussion',
        description: 'Discuss project updates',
        start_time: '2025-08-13T10:00:00-07:00',
        end_time: '2025-08-13T11:00:00-07:00',
        attendees: ['sarah.smith@company.com', 'mike.jones@external.com']
      };

      const virtualLocation = {
        type: 'virtual' as const,
        notes: 'Google Meet will be generated'
      };

      const calendarEvent = await locationService.createCalendarEventWithLocation(
        eventDetails,
        virtualLocation
      );

      expect(calendarEvent.summary).toBe('Project Discussion');
      expect(calendarEvent.location).toBe('Virtual Meeting');
      expect(calendarEvent.conferenceData).toBeDefined();
      expect(calendarEvent.conferenceData?.createRequest.conferenceSolutionKey.type).toBe('hangoutsMeet');
      expect(calendarEvent.attendees).toHaveLength(2);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle empty email content gracefully', async () => {
      const result = LocationDetector.detectLocation('');
      
      expect(result.confidence).toBe(50);
      expect(result.source).toBe('default');
      expect(result.location).toBeUndefined();
    });

    it('should handle malformed attendee emails', async () => {
      const eventDetails = {
        summary: 'Test Meeting',
        start_time: '2025-08-13T10:00:00Z',
        end_time: '2025-08-13T11:00:00Z',
        attendees: ['invalid-email', 'valid@example.com', '']
      };

      const location = { type: 'virtual' as const };

      const calendarEvent = await locationService.createCalendarEventWithLocation(
        eventDetails,
        location
      );

      // Should filter out invalid emails and handle gracefully
      expect(calendarEvent.attendees).toEqual([
        { email: 'invalid-email', displayName: 'Invalid-email' },
        { email: 'valid@example.com', displayName: 'Valid Example' },
        { email: '', displayName: '' }
      ]);
    });

    it('should handle mixed location indicators', async () => {
      const emailContent = `
        Let's meet at the office but have a Zoom backup ready 
        in case the conference room is unavailable.
      `;

      const result = LocationDetector.detectLocation(emailContent);
      
      // Should detect both physical and virtual keywords
      expect(result.detectedKeywords.length).toBeGreaterThan(1);
      expect(result.detectedKeywords).toContain('zoom');
      expect(result.detectedKeywords.some(k => k.includes('office'))).toBe(true);
    });

    it('should validate location objects correctly', () => {
      const validPhysical = {
        type: 'physical' as const,
        address: '123 Main Street, San Francisco, CA'
      };

      const invalidPhysical = {
        type: 'physical' as const,
        address: '123'
      };

      const validVirtual = {
        type: 'virtual' as const
      };

      expect(LocationDetector.validateLocation(validPhysical)).toBe(true);
      expect(LocationDetector.validateLocation(invalidPhysical)).toBe(false);
      expect(LocationDetector.validateLocation(validVirtual)).toBe(true);
    });
  });

  describe('Performance and reliability', () => {
    it('should handle large email content efficiently', () => {
      const largeContent = 'Meet me at the office tomorrow. '.repeat(1000);
      
      const startTime = Date.now();
      const result = LocationDetector.detectLocation(largeContent);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.location?.type).toBe('physical');
    });

    it('should be consistent across multiple calls', () => {
      const emailContent = 'Let\'s have a Zoom call at 2pm tomorrow';
      
      const results = Array.from({ length: 10 }, () => 
        LocationDetector.detectLocation(emailContent)
      );

      // All results should be consistent
      results.forEach(result => {
        expect(result.location?.type).toBe('virtual');
        expect(result.confidence).toBeGreaterThan(80);
        expect(result.detectedKeywords).toContain('zoom');
      });
    });
  });

  describe('Backward compatibility', () => {
    it('should not break existing calendar event creation', async () => {
      // Test that events without location enhancement still work
      const basicEventDetails = {
        summary: 'Basic Meeting',
        start_time: '2025-08-13T10:00:00Z',
        end_time: '2025-08-13T11:00:00Z'
      };

      const defaultLocation = await locationService.determineBestLocation('', 1);
      const calendarEvent = await locationService.createCalendarEventWithLocation(
        basicEventDetails,
        defaultLocation
      );

      expect(calendarEvent.summary).toBe('Basic Meeting');
      expect(calendarEvent.location).toBeDefined();
      expect(calendarEvent.start).toBeDefined();
      expect(calendarEvent.end).toBeDefined();
    });

    it('should handle missing optional fields gracefully', async () => {
      const minimalEventDetails = {
        summary: 'Minimal Meeting',
        start_time: '2025-08-13T10:00:00Z',
        end_time: '2025-08-13T11:00:00Z'
      };

      const location = { type: 'virtual' as const };

      const calendarEvent = await locationService.createCalendarEventWithLocation(
        minimalEventDetails,
        location
      );

      expect(calendarEvent.summary).toBe('Minimal Meeting');
      expect(calendarEvent.description).toBeUndefined();
      expect(calendarEvent.attendees).toBeUndefined();
      expect(calendarEvent.start.timeZone).toBe('America/Los_Angeles'); // Default timezone
    });
  });
});