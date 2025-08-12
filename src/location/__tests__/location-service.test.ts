// Integration tests for LocationServiceImpl

import { LocationServiceImpl } from '../location-service';
import { LocationDetector } from '../location-detector';
import { GoogleMeetService } from '../google-meet-service';
import { MeetingLocation, CalendarEventDetails } from '../location-types';

// Mock the dependencies
jest.mock('../location-detector');
jest.mock('../google-meet-service');

const mockLocationDetector = LocationDetector as jest.Mocked<typeof LocationDetector>;
const mockGoogleMeetService = GoogleMeetService as jest.MockedClass<typeof GoogleMeetService>;

describe('LocationServiceImpl', () => {
  let locationService: LocationServiceImpl;
  let mockGoogleMeetInstance: jest.Mocked<GoogleMeetService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock GoogleMeetService instance
    mockGoogleMeetInstance = {
      generateGoogleMeetConfig: jest.fn(),
      createEventWithGoogleMeet: jest.fn(),
      createEventWithoutGoogleMeet: jest.fn(),
      validateService: jest.fn()
    } as any;

    mockGoogleMeetService.mockImplementation(() => mockGoogleMeetInstance);
    
    locationService = new LocationServiceImpl();
  });

  describe('detectLocation', () => {
    it('should delegate to LocationDetector', () => {
      const emailContent = 'Meet me at the office tomorrow';
      const mockResult = {
        location: { type: 'physical' as const, address: '123 Main St' },
        confidence: 85,
        detectedKeywords: ['office'],
        source: 'email_content' as const
      };

      mockLocationDetector.detectLocation.mockReturnValue(mockResult);

      const result = locationService.detectLocation(emailContent);

      expect(mockLocationDetector.detectLocation).toHaveBeenCalledWith(emailContent);
      expect(result).toEqual(mockResult);
    });
  });

  describe('generateGoogleMeetLink', () => {
    it('should delegate to GoogleMeetService', async () => {
      const mockConfig = {
        createRequest: {
          requestId: 'test-id',
          conferenceSolutionKey: { type: 'hangoutsMeet' as const }
        }
      };

      mockGoogleMeetInstance.generateGoogleMeetConfig.mockReturnValue(mockConfig);

      const result = await locationService.generateGoogleMeetLink();

      expect(mockGoogleMeetInstance.generateGoogleMeetConfig).toHaveBeenCalled();
      expect(result).toEqual(mockConfig);
    });
  });

  describe('createCalendarEventWithLocation', () => {
    const mockEventDetails = {
      summary: 'Test Meeting',
      description: 'Test description',
      start_time: '2025-08-13T10:00:00-07:00',
      end_time: '2025-08-13T11:00:00-07:00',
      attendees: ['test@example.com', 'user@company.com']
    };

    it('should create physical meeting without Google Meet', async () => {
      const physicalLocation: MeetingLocation = {
        type: 'physical',
        address: '123 Main Street, San Francisco, CA'
      };

      const result = await locationService.createCalendarEventWithLocation(
        mockEventDetails,
        physicalLocation
      );

      expect(result).toEqual({
        summary: mockEventDetails.summary,
        description: mockEventDetails.description,
        start: {
          dateTime: mockEventDetails.start_time,
          timeZone: 'America/Los_Angeles'
        },
        end: {
          dateTime: mockEventDetails.end_time,
          timeZone: 'America/Los_Angeles'
        },
        attendees: [
          { email: 'test@example.com', displayName: 'Test Example' },
          { email: 'user@company.com', displayName: 'User Company' }
        ],
        location: physicalLocation.address
      });

      expect(result.conferenceData).toBeUndefined();
    });

    it('should create virtual meeting with Google Meet', async () => {
      const virtualLocation: MeetingLocation = {
        type: 'virtual',
        notes: 'Google Meet link will be generated'
      };

      const mockMeetConfig = {
        createRequest: {
          requestId: 'test-id',
          conferenceSolutionKey: { type: 'hangoutsMeet' as const }
        }
      };

      mockGoogleMeetInstance.generateGoogleMeetConfig.mockReturnValue(mockMeetConfig);

      const result = await locationService.createCalendarEventWithLocation(
        mockEventDetails,
        virtualLocation
      );

      expect(result.location).toBe('Virtual Meeting');
      expect(result.conferenceData).toEqual(mockMeetConfig);
      expect(mockGoogleMeetInstance.generateGoogleMeetConfig).toHaveBeenCalled();
    });

    it('should handle custom timezone', async () => {
      const eventWithTimezone = {
        ...mockEventDetails,
        timezone: 'America/New_York'
      };

      const location: MeetingLocation = { type: 'virtual' };

      const result = await locationService.createCalendarEventWithLocation(
        eventWithTimezone,
        location
      );

      expect(result.start.timeZone).toBe('America/New_York');
      expect(result.end.timeZone).toBe('America/New_York');
    });
  });

  describe('determineBestLocation', () => {
    it('should use high-confidence physical location', async () => {
      const emailContent = 'Meet me at 123 Main Street tomorrow';
      
      mockLocationDetector.detectLocation.mockReturnValue({
        location: { type: 'physical', address: '123 Main Street' },
        confidence: 85,
        detectedKeywords: ['123 Main Street'],
        source: 'email_content'
      });

      const result = await locationService.determineBestLocation(emailContent, 2);

      expect(result.type).toBe('physical');
      expect(result.address).toBe('123 Main Street');
    });

    it('should default to virtual for low-confidence physical location', async () => {
      const emailContent = 'Let\'s meet somewhere downtown';
      
      mockLocationDetector.detectLocation.mockReturnValue({
        location: { type: 'physical', address: 'downtown' },
        confidence: 30,
        detectedKeywords: ['downtown'],
        source: 'email_content'
      });

      const result = await locationService.determineBestLocation(emailContent, 2);

      expect(result.type).toBe('virtual');
      expect(result.notes).toContain('Google Meet link will be generated');
    });

    it('should respect explicit virtual meeting requests', async () => {
      const emailContent = 'Let\'s do a Zoom call';
      
      mockLocationDetector.detectLocation.mockReturnValue({
        location: { type: 'virtual', notes: 'Zoom requested' },
        confidence: 90,
        detectedKeywords: ['zoom'],
        source: 'email_content'
      });

      const result = await locationService.determineBestLocation(emailContent, 2);

      expect(result.type).toBe('virtual');
      expect(result.notes).toBe('Zoom requested');
    });

    it('should default to virtual when no location detected', async () => {
      const emailContent = 'Let\'s discuss the project';
      
      mockLocationDetector.detectLocation.mockReturnValue({
        confidence: 50,
        detectedKeywords: [],
        source: 'default'
      });

      const result = await locationService.determineBestLocation(emailContent, 2);

      expect(result.type).toBe('virtual');
      expect(result.notes).toContain('Google Meet link will be generated');
    });
  });

  describe('detectLocationWithContext', () => {
    it('should enhance confidence for same-domain participants', async () => {
      const emailContent = 'Meet me at the office';
      const senderEmail = 'alice@company.com';
      const participantEmails = ['bob@company.com', 'charlie@company.com'];

      mockLocationDetector.detectLocation.mockReturnValue({
        location: { type: 'physical', address: 'office' },
        confidence: 60,
        detectedKeywords: ['office'],
        source: 'email_content'
      });

      const result = await locationService.detectLocationWithContext(
        emailContent,
        senderEmail,
        participantEmails
      );

      expect(result.confidence).toBeGreaterThan(60);
      expect(result.detectedKeywords).toContain('same-domain-participants');
    });

    it('should suggest virtual for large meetings', async () => {
      const emailContent = 'Team meeting next week';
      const senderEmail = 'alice@company.com';
      const participantEmails = ['bob@company.com', 'charlie@external.com', 'dave@other.com', 'eve@another.com'];

      mockLocationDetector.detectLocation.mockReturnValue({
        confidence: 50,
        detectedKeywords: [],
        source: 'default'
      });

      const result = await locationService.detectLocationWithContext(
        emailContent,
        senderEmail,
        participantEmails
      );

      expect(result.location?.type).toBe('virtual');
      expect(result.location?.notes).toContain('Large meeting - defaulting to virtual');
      expect(result.confidence).toBe(75);
    });

    it('should cap enhanced confidence at 95%', async () => {
      const emailContent = 'Meet at 123 Main Street with the team';
      const senderEmail = 'alice@company.com';
      const participantEmails = ['bob@company.com'];

      mockLocationDetector.detectLocation.mockReturnValue({
        location: { type: 'physical', address: '123 Main Street' },
        confidence: 90,
        detectedKeywords: ['123 Main Street'],
        source: 'email_content'
      });

      const result = await locationService.detectLocationWithContext(
        emailContent,
        senderEmail,
        participantEmails
      );

      expect(result.confidence).toBeLessThanOrEqual(95);
    });
  });

  describe('createCalendarEvent', () => {
    it('should create virtual event with Google Meet', async () => {
      const eventWithMeet = {
        summary: 'Virtual Meeting',
        start: { dateTime: '2025-08-13T10:00:00Z', timeZone: 'UTC' },
        end: { dateTime: '2025-08-13T11:00:00Z', timeZone: 'UTC' },
        attendees: [{ email: 'test@example.com' }],
        location: 'Virtual Meeting',
        conferenceData: {
          createRequest: {
            requestId: 'test-id',
            conferenceSolutionKey: { type: 'hangoutsMeet' as const }
          }
        }
      };

      const mockCreatedEvent = { id: 'created-event-id' };
      mockGoogleMeetInstance.createEventWithGoogleMeet.mockResolvedValue(mockCreatedEvent);

      const result = await locationService.createCalendarEvent(eventWithMeet);

      expect(mockGoogleMeetInstance.createEventWithGoogleMeet).toHaveBeenCalledWith({
        summary: eventWithMeet.summary,
        start: eventWithMeet.start,
        end: eventWithMeet.end,
        attendees: eventWithMeet.attendees,
        location: eventWithMeet.location
      });
      expect(result).toBe(mockCreatedEvent);
    });

    it('should create physical event without Google Meet', async () => {
      const physicalEvent = {
        summary: 'In-Person Meeting',
        start: { dateTime: '2025-08-13T10:00:00Z', timeZone: 'UTC' },
        end: { dateTime: '2025-08-13T11:00:00Z', timeZone: 'UTC' },
        attendees: [{ email: 'test@example.com' }],
        location: '123 Main Street'
      };

      const mockCreatedEvent = { id: 'created-event-id' };
      mockGoogleMeetInstance.createEventWithoutGoogleMeet.mockResolvedValue(mockCreatedEvent);

      const result = await locationService.createCalendarEvent(physicalEvent);

      expect(mockGoogleMeetInstance.createEventWithoutGoogleMeet).toHaveBeenCalledWith({
        summary: physicalEvent.summary,
        start: physicalEvent.start,
        end: physicalEvent.end,
        attendees: physicalEvent.attendees,
        location: physicalEvent.location
      });
      expect(result).toBe(mockCreatedEvent);
    });

    it('should handle missing location gracefully', async () => {
      const eventWithoutLocation = {
        summary: 'Meeting',
        start: { dateTime: '2025-08-13T10:00:00Z', timeZone: 'UTC' },
        end: { dateTime: '2025-08-13T11:00:00Z', timeZone: 'UTC' },
        attendees: [{ email: 'test@example.com' }]
      };

      const mockCreatedEvent = { id: 'created-event-id' };
      mockGoogleMeetInstance.createEventWithoutGoogleMeet.mockResolvedValue(mockCreatedEvent);

      const result = await locationService.createCalendarEvent(eventWithoutLocation);

      expect(mockGoogleMeetInstance.createEventWithoutGoogleMeet).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'TBD'
        })
      );
    });
  });

  describe('validateService', () => {
    it('should delegate to GoogleMeetService validation', async () => {
      mockGoogleMeetInstance.validateService.mockResolvedValue(true);

      const result = await locationService.validateService();

      expect(mockGoogleMeetInstance.validateService).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle validation failures', async () => {
      mockGoogleMeetInstance.validateService.mockResolvedValue(false);

      const result = await locationService.validateService();

      expect(result).toBe(false);
    });
  });

  describe('extractDisplayName', () => {
    it('should extract display name from email', () => {
      // This tests the private method indirectly through createCalendarEventWithLocation
      const eventDetails = {
        summary: 'Test',
        start_time: '2025-08-13T10:00:00Z',
        end_time: '2025-08-13T11:00:00Z',
        attendees: ['john.doe@example.com', 'jane.smith@company.co.uk']
      };

      const location: MeetingLocation = { type: 'physical', address: '123 Main St' };

      const result = locationService.createCalendarEventWithLocation(eventDetails, location);

      return result.then(event => {
        expect(event.attendees).toEqual([
          { email: 'john.doe@example.com', displayName: 'John Doe' },
          { email: 'jane.smith@company.co.uk', displayName: 'Jane Smith' }
        ]);
      });
    });
  });
});