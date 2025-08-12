// Unit tests for LocationDetector

import { LocationDetector } from '../location-detector';
import { LocationDetectionResult, MeetingLocation } from '../location-types';

describe('LocationDetector', () => {
  describe('detectLocation', () => {
    it('should detect virtual meeting keywords', () => {
      const testCases = [
        'Let\'s have a Zoom call tomorrow',
        'Can we meet on Google Meet?',
        'I prefer a virtual meeting',
        'Let\'s do a video call instead',
        'Teams meeting would be great'
      ];

      testCases.forEach(content => {
        const result = LocationDetector.detectLocation(content);
        expect(result.location?.type).toBe('virtual');
        expect(result.confidence).toBeGreaterThan(80);
        expect(result.source).toBe('email_content');
      });
    });

    it('should detect physical addresses', () => {
      const testCases = [
        'Meet me at 123 Main Street, San Francisco',
        'Let\'s meet at the Starbucks on 456 Oak Avenue',
        'Conference room A on the 5th floor',
        'Our office building at 789 Tech Boulevard',
        'Coffee shop at 321 University Drive'
      ];

      testCases.forEach(content => {
        const result = LocationDetector.detectLocation(content);
        expect(result.location?.type).toBe('physical');
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.source).toBe('email_content');
        expect(result.location?.address).toBeDefined();
      });
    });

    it('should handle mixed content with location keywords', () => {
      const content = 'Can we meet at the office tomorrow? Room 101 would be perfect.';
      const result = LocationDetector.detectLocation(content);
      
      expect(result.location?.type).toBe('physical');
      expect(result.detectedKeywords).toContain('meet at');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should default to virtual when no location is detected', () => {
      const content = 'Let\'s discuss the project proposal sometime next week.';
      const result = LocationDetector.detectLocation(content);
      
      expect(result.location).toBeUndefined();
      expect(result.confidence).toBe(50);
      expect(result.source).toBe('default');
    });

    it('should clean and format email content properly', () => {
      const messyContent = 'Let\'s   meet\r\n\r\n\r\nat   123 Main St   tomorrow';
      const result = LocationDetector.detectLocation(messyContent);
      
      expect(result.location?.type).toBe('physical');
      expect(result.location?.address).not.toContain('\r\n');
      expect(result.location?.address).not.toMatch(/\s{2,}/);
    });

    it('should detect city, state patterns', () => {
      const content = 'Meet me in San Francisco, CA for lunch';
      const result = LocationDetector.detectLocation(content);
      
      expect(result.location?.type).toBe('physical');
      expect(result.detectedKeywords.some(k => k.includes('San Francisco, CA'))).toBe(true);
    });

    it('should detect building and venue names', () => {
      const testCases = [
        'at the Google Building',
        'in the Conference Center',
        'at Starbucks downtown',
        'meet at the University Library'
      ];

      testCases.forEach(content => {
        const result = LocationDetector.detectLocation(content);
        expect(result.location?.type).toBe('physical');
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    it('should handle room and floor specifications', () => {
      const testCases = [
        'Conference room 123',
        'Meeting room Alpha',
        'Floor 15 boardroom',
        'Office on the 3rd floor'
      ];

      testCases.forEach(content => {
        const result = LocationDetector.detectLocation(content);
        expect(result.location?.type).toBe('physical');
        expect(result.detectedKeywords.length).toBeGreaterThan(0);
      });
    });

    it('should prioritize virtual keywords over weak physical indicators', () => {
      const content = 'Let\'s meet virtually via Zoom instead of going to the office';
      const result = LocationDetector.detectLocation(content);
      
      expect(result.location?.type).toBe('virtual');
      expect(result.detectedKeywords).toContain('zoom');
    });

    it('should handle empty or whitespace-only content', () => {
      const testCases = ['', '   ', '\n\n\t  \r\n'];
      
      testCases.forEach(content => {
        const result = LocationDetector.detectLocation(content);
        expect(result.confidence).toBe(50);
        expect(result.source).toBe('default');
        expect(result.location).toBeUndefined();
      });
    });
  });

  describe('validateLocation', () => {
    it('should validate physical locations with addresses', () => {
      const validLocation: MeetingLocation = {
        type: 'physical',
        address: '123 Main Street, San Francisco, CA'
      };
      
      expect(LocationDetector.validateLocation(validLocation)).toBe(true);
    });

    it('should reject physical locations without addresses', () => {
      const invalidLocation: MeetingLocation = {
        type: 'physical'
      };
      
      expect(LocationDetector.validateLocation(invalidLocation)).toBe(false);
    });

    it('should reject physical locations with very short addresses', () => {
      const invalidLocation: MeetingLocation = {
        type: 'physical',
        address: '123'
      };
      
      expect(LocationDetector.validateLocation(invalidLocation)).toBe(false);
    });

    it('should always validate virtual locations', () => {
      const virtualLocation: MeetingLocation = {
        type: 'virtual'
      };
      
      expect(LocationDetector.validateLocation(virtualLocation)).toBe(true);
    });

    it('should validate hybrid locations', () => {
      const hybridLocation: MeetingLocation = {
        type: 'hybrid',
        address: '123 Main St',
        meetingLink: 'https://meet.google.com/abc-def-ghi'
      };
      
      expect(LocationDetector.validateLocation(hybridLocation)).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle special characters in addresses', () => {
      const content = 'Meet at 123 O\'Reilly Street & 5th Avenue';
      const result = LocationDetector.detectLocation(content);
      
      expect(result.location?.type).toBe('physical');
      expect(result.location?.address).toBeDefined();
    });

    it('should handle international address formats', () => {
      const content = 'Meet at 10 Downing Street, London, UK';
      const result = LocationDetector.detectLocation(content);
      
      expect(result.location?.type).toBe('physical');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle multiple potential locations', () => {
      const content = 'We could meet at 123 Main St or 456 Oak Ave, whichever works better';
      const result = LocationDetector.detectLocation(content);
      
      expect(result.location?.type).toBe('physical');
      expect(result.location?.notes).toContain('Multiple locations mentioned');
    });

    it('should handle mixed virtual and physical indicators', () => {
      const content = 'Let\'s meet at the office but have a Zoom backup ready';
      const result = LocationDetector.detectLocation(content);
      
      // Should detect both but prioritize based on confidence
      expect(result.detectedKeywords.length).toBeGreaterThan(1);
    });
  });

  describe('confidence scoring', () => {
    it('should give higher confidence for explicit addresses', () => {
      const explicitAddress = 'Meet me at 1600 Pennsylvania Avenue, Washington, DC 20500';
      const vague = 'Let\'s meet somewhere downtown';
      
      const explicitResult = LocationDetector.detectLocation(explicitAddress);
      const vagueResult = LocationDetector.detectLocation(vague);
      
      expect(explicitResult.confidence).toBeGreaterThan(vagueResult.confidence);
    });

    it('should give high confidence for clear virtual meeting requests', () => {
      const content = 'Let\'s do a Google Meet video call';
      const result = LocationDetector.detectLocation(content);
      
      expect(result.confidence).toBeGreaterThanOrEqual(85);
    });

    it('should cap confidence at reasonable maximum', () => {
      const content = 'Zoom Teams Meet virtual video call online remote';
      const result = LocationDetector.detectLocation(content);
      
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
  });
});