// Unit tests for GoogleMeetService

import { GoogleMeetService } from '../google-meet-service';
import { google } from 'googleapis';

// Mock the googleapis module
jest.mock('googleapis');
const mockGoogle = google as jest.Mocked<typeof google>;

describe('GoogleMeetService', () => {
  let googleMeetService: GoogleMeetService;
  let mockCalendar: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock the calendar API
    mockCalendar = {
      events: {
        insert: jest.fn(),
      },
      calendarList: {
        list: jest.fn(),
      }
    };

    // Mock google.calendar to return our mock
    mockGoogle.calendar.mockReturnValue(mockCalendar);

    // Mock OAuth2
    const mockAuth = {
      setCredentials: jest.fn(),
    };
    mockGoogle.auth.OAuth2.mockReturnValue(mockAuth as any);

    // Set up environment variables for testing
    process.env.ASHLEY_GMAIL_CLIENT_ID = 'test-client-id';
    process.env.ASHLEY_GMAIL_CLIENT_SECRET = 'test-client-secret';
    process.env.ASHLEY_GMAIL_REFRESH_TOKEN = 'test-refresh-token';

    googleMeetService = new GoogleMeetService();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.ASHLEY_GMAIL_CLIENT_ID;
    delete process.env.ASHLEY_GMAIL_CLIENT_SECRET;
    delete process.env.ASHLEY_GMAIL_REFRESH_TOKEN;
  });

  describe('generateGoogleMeetConfig', () => {
    it('should generate valid Google Meet configuration', () => {
      const config = googleMeetService.generateGoogleMeetConfig();
      
      expect(config).toHaveProperty('createRequest');
      expect(config.createRequest).toHaveProperty('requestId');
      expect(config.createRequest).toHaveProperty('conferenceSolutionKey');
      expect(config.createRequest.conferenceSolutionKey.type).toBe('hangoutsMeet');
      expect(typeof config.createRequest.requestId).toBe('string');
      expect(config.createRequest.requestId.length).toBeGreaterThan(0);
    });

    it('should generate unique request IDs', () => {
      const config1 = googleMeetService.generateGoogleMeetConfig();
      const config2 = googleMeetService.generateGoogleMeetConfig();
      
      expect(config1.createRequest.requestId).not.toBe(config2.createRequest.requestId);
    });
  });

  describe('createEventWithGoogleMeet', () => {
    const mockEventDetails = {
      summary: 'Test Meeting',
      description: 'Test meeting description',
      start: { dateTime: '2025-08-13T10:00:00-07:00', timeZone: 'America/Los_Angeles' },
      end: { dateTime: '2025-08-13T11:00:00-07:00', timeZone: 'America/Los_Angeles' },
      attendees: [
        { email: 'test@example.com', displayName: 'Test User' }
      ],
      location: 'Virtual Meeting'
    };

    it('should create calendar event with Google Meet successfully', async () => {
      const mockResponse = {
        data: {
          id: 'test-event-id',
          conferenceData: {
            entryPoints: [
              { uri: 'https://meet.google.com/test-meeting' }
            ]
          }
        }
      };

      mockCalendar.events.insert.mockResolvedValue(mockResponse);

      const result = await googleMeetService.createEventWithGoogleMeet(mockEventDetails);

      expect(mockCalendar.events.insert).toHaveBeenCalledWith({
        calendarId: 'primary',
        resource: expect.objectContaining({
          summary: mockEventDetails.summary,
          description: mockEventDetails.description,
          start: mockEventDetails.start,
          end: mockEventDetails.end,
          attendees: expect.arrayContaining([
            expect.objectContaining({ email: 'test@example.com' })
          ]),
          location: mockEventDetails.location,
          conferenceData: expect.objectContaining({
            createRequest: expect.objectContaining({
              conferenceSolutionKey: { type: 'hangoutsMeet' }
            })
          }),
          reminders: expect.any(Object)
        }),
        conferenceDataVersion: 1,
        sendUpdates: 'all'
      });

      expect(result).toBe(mockResponse.data);
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Calendar API error');
      mockCalendar.events.insert.mockRejectedValue(mockError);

      await expect(googleMeetService.createEventWithGoogleMeet(mockEventDetails))
        .rejects.toThrow('Calendar API error');
    });

    it('should include proper reminders in the event', async () => {
      const mockResponse = { data: { id: 'test-event-id' } };
      mockCalendar.events.insert.mockResolvedValue(mockResponse);

      await googleMeetService.createEventWithGoogleMeet(mockEventDetails);

      expect(mockCalendar.events.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: expect.objectContaining({
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 24 * 60 },
                { method: 'popup', minutes: 15 }
              ]
            }
          })
        })
      );
    });
  });

  describe('createEventWithoutGoogleMeet', () => {
    const mockEventDetails = {
      summary: 'In-Person Meeting',
      description: 'Meeting at the office',
      start: { dateTime: '2025-08-13T10:00:00-07:00', timeZone: 'America/Los_Angeles' },
      end: { dateTime: '2025-08-13T11:00:00-07:00', timeZone: 'America/Los_Angeles' },
      attendees: [
        { email: 'test@example.com', displayName: 'Test User' }
      ],
      location: '123 Main Street, San Francisco, CA'
    };

    it('should create calendar event without Google Meet successfully', async () => {
      const mockResponse = {
        data: {
          id: 'test-event-id'
        }
      };

      mockCalendar.events.insert.mockResolvedValue(mockResponse);

      const result = await googleMeetService.createEventWithoutGoogleMeet(mockEventDetails);

      expect(mockCalendar.events.insert).toHaveBeenCalledWith({
        calendarId: 'primary',
        resource: expect.objectContaining({
          summary: mockEventDetails.summary,
          description: mockEventDetails.description,
          start: mockEventDetails.start,
          end: mockEventDetails.end,
          attendees: expect.arrayContaining([
            expect.objectContaining({ email: 'test@example.com' })
          ]),
          location: mockEventDetails.location,
          reminders: expect.any(Object)
        }),
        sendUpdates: 'all'
      });

      // Should NOT include conferenceDataVersion for physical meetings
      expect(mockCalendar.events.insert).not.toHaveBeenCalledWith(
        expect.objectContaining({
          conferenceDataVersion: expect.any(Number)
        })
      );

      expect(result).toBe(mockResponse.data);
    });

    it('should handle missing attendees gracefully', async () => {
      const eventWithoutAttendees = {
        ...mockEventDetails,
        attendees: undefined
      };

      const mockResponse = { data: { id: 'test-event-id' } };
      mockCalendar.events.insert.mockResolvedValue(mockResponse);

      await googleMeetService.createEventWithoutGoogleMeet(eventWithoutAttendees);

      expect(mockCalendar.events.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: expect.objectContaining({
            attendees: undefined
          })
        })
      );
    });
  });

  describe('validateService', () => {
    it('should return true when calendar access is successful', async () => {
      mockCalendar.calendarList.list.mockResolvedValue({ data: { items: [] } });

      const isValid = await googleMeetService.validateService();

      expect(isValid).toBe(true);
      expect(mockCalendar.calendarList.list).toHaveBeenCalledWith({ maxResults: 1 });
    });

    it('should return false when calendar access fails', async () => {
      mockCalendar.calendarList.list.mockRejectedValue(new Error('Access denied'));

      const isValid = await googleMeetService.validateService();

      expect(isValid).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      mockCalendar.calendarList.list.mockRejectedValue(new Error('Network error'));

      const isValid = await googleMeetService.validateService();

      expect(isValid).toBe(false);
    });
  });

  describe('authentication handling', () => {
    it('should initialize with OAuth2 credentials when available', () => {
      expect(mockGoogle.auth.OAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        'http://localhost:3000/oauth/callback'
      );
    });

    it('should handle missing environment variables', () => {
      delete process.env.ASHLEY_GMAIL_REFRESH_TOKEN;
      
      // Create new service instance without refresh token
      const serviceWithoutAuth = new GoogleMeetService();
      
      // Should still create the service but without setting credentials
      expect(mockGoogle.auth.OAuth2).toHaveBeenCalled();
    });
  });

  describe('error scenarios', () => {
    it('should handle malformed event details', async () => {
      const malformedDetails = {
        summary: '',
        start: { dateTime: 'invalid-date', timeZone: 'Invalid/Timezone' },
        end: { dateTime: 'invalid-date', timeZone: 'Invalid/Timezone' }
      } as any;

      mockCalendar.events.insert.mockRejectedValue(new Error('Invalid event data'));

      await expect(googleMeetService.createEventWithGoogleMeet(malformedDetails))
        .rejects.toThrow('Invalid event data');
    });

    it('should handle quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded');
      (quotaError as any).code = 403;
      
      mockCalendar.events.insert.mockRejectedValue(quotaError);

      await expect(googleMeetService.createEventWithGoogleMeet({
        summary: 'Test',
        start: { dateTime: '2025-08-13T10:00:00Z', timeZone: 'UTC' },
        end: { dateTime: '2025-08-13T11:00:00Z', timeZone: 'UTC' },
        location: 'Test'
      })).rejects.toThrow('Quota exceeded');
    });
  });
});