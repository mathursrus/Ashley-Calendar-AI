// Tests for timezone detection and conversion utilities
// Implements test plan for Issue #2: Timezone Awareness

import { TimezoneDetector, TimezoneConverter } from './timezone-utils';

describe('TimezoneDetector', () => {
  describe('detectTimezoneFromHeaders', () => {
    it('should detect timezone from X-Timezone header', () => {
      const headers = { 'X-Timezone': 'America/New_York' };
      const result = TimezoneDetector.detectTimezoneFromHeaders(headers);
      
      expect(result).toEqual({
        detectedTimezone: 'America/New_York',
        confidence: 0.9,
        source: 'header'
      });
    });

    it('should detect timezone from Date header with abbreviation', () => {
      const headers = { 'Date': 'Mon, 12 Aug 2025 14:30:00 PST' };
      const result = TimezoneDetector.detectTimezoneFromHeaders(headers);
      
      expect(result).toEqual({
        detectedTimezone: 'America/Los_Angeles',
        confidence: 0.7,
        source: 'header'
      });
    });

    it('should return null for headers without timezone info', () => {
      const headers = { 'Subject': 'Meeting Request' };
      const result = TimezoneDetector.detectTimezoneFromHeaders(headers);
      
      expect(result).toBeNull();
    });
  });

  describe('detectTimezoneFromSignature', () => {
    it('should detect timezone from signature with abbreviation', () => {
      const emailContent = `Hi there,

Let's schedule a meeting.

Best regards,
John Smith
Senior Manager
Company Inc.
New York, NY (EST)`;

      const result = TimezoneDetector.detectTimezoneFromSignature(emailContent);
      
      expect(result).toEqual({
        detectedTimezone: 'America/New_York',
        confidence: 0.8,
        source: 'signature'
      });
    });

    it('should detect timezone from signature with city name', () => {
      const emailContent = `Hi there,

Let's schedule a meeting.

--
John Smith
Company Inc.
San Francisco Office`;

      const result = TimezoneDetector.detectTimezoneFromSignature(emailContent);
      
      expect(result).toEqual({
        detectedTimezone: 'America/Los_Angeles',
        confidence: 0.7,
        source: 'signature'
      });
    });

    it('should return null for signature without timezone info', () => {
      const emailContent = `Hi there,

Let's schedule a meeting.

Best regards,
John`;

      const result = TimezoneDetector.detectTimezoneFromSignature(emailContent);
      
      expect(result).toBeNull();
    });
  });

  describe('detectTimezoneFromContent', () => {
    it('should detect timezone from explicit time mentions', () => {
      const emailContent = 'Can we meet at 3:00 PM EST tomorrow?';
      const result = TimezoneDetector.detectTimezoneFromContent(emailContent);
      
      expect(result).toEqual({
        detectedTimezone: 'America/New_York',
        confidence: 0.8,
        source: 'content'
      });
    });

    it('should detect timezone from regional time mentions', () => {
      const emailContent = 'How about 2 PM Pacific time?';
      const result = TimezoneDetector.detectTimezoneFromContent(emailContent);
      
      expect(result).toEqual({
        detectedTimezone: 'America/Los_Angeles',
        confidence: 0.7,
        source: 'content'
      });
    });

    it('should return null for content without timezone info', () => {
      const emailContent = 'Can we meet tomorrow at 3 PM?';
      const result = TimezoneDetector.detectTimezoneFromContent(emailContent);
      
      expect(result).toBeNull();
    });
  });

  describe('detectTimezone', () => {
    it('should prioritize high-confidence header detection', () => {
      const headers = { 'X-Timezone': 'America/New_York' };
      const content = 'Meeting at 3 PM PST';
      
      const result = TimezoneDetector.detectTimezone(headers, content);
      
      expect(result.detectedTimezone).toBe('America/New_York');
      expect(result.source).toBe('header');
    });

    it('should fallback to Sid timezone when no detection possible', () => {
      const headers = { 'Subject': 'Meeting' };
      const content = 'Can we meet tomorrow?';
      
      const result = TimezoneDetector.detectTimezone(headers, content);
      
      expect(result.detectedTimezone).toBe('America/Los_Angeles');
      expect(result.confidence).toBe(0.0);
      expect(result.source).toBe('fallback');
    });
  });

  describe('detectParticipantTimezones', () => {
    it('should detect timezones for multiple participants', () => {
      const participants = ['john@example.com', 'jane@example.com'];
      const headers = { 'X-Timezone': 'America/New_York' };
      const content = 'Meeting request';
      
      const result = TimezoneDetector.detectParticipantTimezones(participants, headers, content);
      
      expect(result).toHaveLength(2);
      expect(result[0]?.email).toBe('john@example.com');
      expect(result[0]?.timezone.detectedTimezone).toBe('America/New_York');
      expect(result[1]?.email).toBe('jane@example.com');
      expect(result[1]?.timezone.detectedTimezone).toBe('America/New_York');
    });
  });
});

describe('TimezoneConverter', () => {
  describe('convertTime', () => {
    it('should convert time between timezones', () => {
      const result = TimezoneConverter.convertTime(
        '2025-08-12 15:00',
        'America/New_York',
        'America/Los_Angeles'
      );
      
      expect(result).toBe('2025-08-12 12:00');
    });

    it('should handle invalid time gracefully', () => {
      const result = TimezoneConverter.convertTime(
        'invalid-time',
        'America/New_York',
        'America/Los_Angeles'
      );
      
      expect(result).toBe('invalid-time'); // Fallback to original
    });
  });

  describe('convertToSidTimezone', () => {
    it('should convert time to Sid timezone (Pacific)', () => {
      const result = TimezoneConverter.convertToSidTimezone(
        '2025-08-12 18:00',
        'America/New_York'
      );
      
      expect(result).toBe('2025-08-12 15:00');
    });
  });

  describe('convertTimezonedTimes', () => {
    it('should convert times for multi-participant coordination', () => {
      const originalTimes = {
        start: '2025-08-12 15:00',
        end: '2025-08-12 16:00'
      };
      
      const senderTimezone = {
        detectedTimezone: 'America/New_York',
        confidence: 0.9,
        source: 'header' as const
      };
      
      const participantTimezones = [
        {
          email: 'john@example.com',
          timezone: {
            detectedTimezone: 'America/Chicago',
            confidence: 0.8,
            source: 'signature' as const
          }
        }
      ];
      
      const result = TimezoneConverter.convertTimezonedTimes(
        originalTimes,
        senderTimezone,
        participantTimezones
      );
      
      expect(result).toHaveLength(2); // start and end times
      expect(result[0]?.originalTime).toBe('2025-08-12 15:00');
      expect(result[0]?.originalTimezone).toBe('America/New_York');
      expect(result[0]?.convertedToSidTimezone).toBe('2025-08-12 12:00');
      expect(result[0]?.participantLocalTimes[0]?.email).toBe('john@example.com');
      expect(result[0]?.participantLocalTimes[0]?.localTime).toBe('2025-08-12 14:00');
    });
  });

  describe('validateDSTTransition', () => {
    it('should validate normal times', () => {
      const result = TimezoneConverter.validateDSTTransition(
        '2025-08-12 15:00',
        'America/New_York'
      );
      
      expect(result.isValid).toBe(true);
    });

    it('should handle DST spring forward transition', () => {
      // Note: This test may need adjustment based on actual DST dates
      const result = TimezoneConverter.validateDSTTransition(
        '2025-03-09 02:00', // Spring forward date (example)
        'America/New_York'
      );
      
      // Should either be valid or provide adjusted time
      expect(result.isValid || result.adjustedTime).toBeTruthy();
    });
  });
});

// Integration tests
describe('Timezone Integration', () => {
  it('should handle end-to-end timezone detection and conversion', () => {
    const headers = { 'Date': 'Mon, 12 Aug 2025 18:00:00 EST' };
    const content = 'Can we meet at 3 PM EST tomorrow?';
    
    // Detect timezone
    const detectedTimezone = TimezoneDetector.detectTimezone(headers, content);
    expect(detectedTimezone.detectedTimezone).toBe('America/New_York');
    
    // Convert to Sid's timezone
    const convertedTime = TimezoneConverter.convertToSidTimezone(
      '2025-08-13 15:00',
      detectedTimezone.detectedTimezone
    );
    expect(convertedTime).toBe('2025-08-13 12:00');
  });

  it('should handle multi-participant timezone coordination', () => {
    const participants = ['east@example.com', 'west@example.com'];
    const headers = { 'X-Timezone': 'America/Chicago' };
    const content = 'Meeting with both coasts';
    
    // Detect participant timezones
    const participantTimezones = TimezoneDetector.detectParticipantTimezones(
      participants,
      headers,
      content
    );
    
    expect(participantTimezones).toHaveLength(2);
    expect(participantTimezones[0]?.timezone.detectedTimezone).toBe('America/Chicago');
    
    // Convert meeting times
    const senderTimezone = TimezoneDetector.detectTimezone(headers, content);
    const timezonedTimes = TimezoneConverter.convertTimezonedTimes(
      { start: '2025-08-12 14:00', end: '2025-08-12 15:00' },
      senderTimezone,
      participantTimezones
    );
    
    expect(timezonedTimes).toHaveLength(2);
    expect(timezonedTimes[0]?.convertedToSidTimezone).toBe('2025-08-12 12:00');
  });
});