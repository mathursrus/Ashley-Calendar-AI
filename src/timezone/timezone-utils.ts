// Timezone detection and conversion utilities for Ashley Calendar AI
// Implements RFC: Timezone Awareness (Issue #2)

import * as moment from 'moment-timezone';

export interface TimezoneInfo {
  detectedTimezone: string; // IANA timezone identifier (e.g., "America/New_York")
  confidence: number; // 0-1 confidence score
  source: 'header' | 'signature' | 'content' | 'fallback';
}

export interface ParticipantTimezone {
  email: string;
  name?: string;
  timezone: TimezoneInfo;
}

export interface TimezonedTime {
  originalTime: string;
  originalTimezone: string;
  convertedToSidTimezone: string;
  participantLocalTimes: {
    email: string;
    localTime: string;
    timezone: string;
  }[];
}

export class TimezoneDetector {
  private static readonly SID_TIMEZONE = 'America/Los_Angeles'; // Sid's Pacific timezone
  
  // Common timezone abbreviations mapping
  private static readonly TIMEZONE_ABBREVIATIONS: Record<string, string> = {
    'PST': 'America/Los_Angeles',
    'PDT': 'America/Los_Angeles',
    'EST': 'America/New_York',
    'EDT': 'America/New_York',
    'CST': 'America/Chicago',
    'CDT': 'America/Chicago',
    'MST': 'America/Denver',
    'MDT': 'America/Denver',
    'GMT': 'Europe/London',
    'UTC': 'UTC',
    'BST': 'Europe/London',
    'CET': 'Europe/Paris',
    'CEST': 'Europe/Paris',
    'JST': 'Asia/Tokyo',
    'IST': 'Asia/Kolkata',
    'AEST': 'Australia/Sydney',
    'AEDT': 'Australia/Sydney'
  };

  // City-based timezone mapping
  private static readonly CITY_TIMEZONES: Record<string, string> = {
    'new york': 'America/New_York',
    'nyc': 'America/New_York',
    'los angeles': 'America/Los_Angeles',
    'la': 'America/Los_Angeles',
    'san francisco': 'America/Los_Angeles',
    'sf': 'America/Los_Angeles',
    'chicago': 'America/Chicago',
    'denver': 'America/Denver',
    'london': 'Europe/London',
    'paris': 'Europe/Paris',
    'tokyo': 'Asia/Tokyo',
    'sydney': 'Australia/Sydney',
    'mumbai': 'Asia/Kolkata',
    'bangalore': 'Asia/Kolkata',
    'singapore': 'Asia/Singapore',
    'hong kong': 'Asia/Hong_Kong',
    'beijing': 'Asia/Shanghai',
    'toronto': 'America/Toronto',
    'vancouver': 'America/Vancouver'
  };

  /**
   * Detect timezone from email headers
   */
  static detectTimezoneFromHeaders(headers: Record<string, string>): TimezoneInfo | null {
    // Check X-Timezone header
    if (headers['X-Timezone']) {
      const timezone = headers['X-Timezone'];
      if (moment.tz.zone(timezone)) {
        return {
          detectedTimezone: timezone,
          confidence: 0.9,
          source: 'header'
        };
      }
    }

    // Parse Date header for timezone info
    if (headers['Date']) {
      const dateHeader = headers['Date'];
      const timezoneMatch = dateHeader.match(/([+-]\d{4})|([A-Z]{3,4})$/);
      
      if (timezoneMatch) {
        const timezoneStr = timezoneMatch[0];
        
        // Handle offset format (+0530, -0800)
        if (timezoneStr.match(/[+-]\d{4}/)) {
          const offset = timezoneStr;
          const timezone = moment.tz.guess(); // Best guess based on offset
          return {
            detectedTimezone: timezone,
            confidence: 0.6,
            source: 'header'
          };
        }
        
        // Handle abbreviation format (PST, EST, etc.)
        if (this.TIMEZONE_ABBREVIATIONS[timezoneStr]) {
          return {
            detectedTimezone: this.TIMEZONE_ABBREVIATIONS[timezoneStr],
            confidence: 0.7,
            source: 'header'
          };
        }
      }
    }

    return null;
  }

  /**
   * Detect timezone from email signature
   */
  static detectTimezoneFromSignature(emailContent: string): TimezoneInfo | null {
    const lines = emailContent.split('\n');
    const signatureStart = Math.max(
      emailContent.lastIndexOf('--'),
      emailContent.lastIndexOf('Best regards'),
      emailContent.lastIndexOf('Sincerely'),
      emailContent.lastIndexOf('Thanks')
    );

    if (signatureStart === -1) return null;

    const signature = emailContent.substring(signatureStart).toLowerCase();

    // Look for timezone abbreviations in signature
    for (const [abbr, timezone] of Object.entries(this.TIMEZONE_ABBREVIATIONS)) {
      if (signature.includes(abbr.toLowerCase())) {
        return {
          detectedTimezone: timezone,
          confidence: 0.8,
          source: 'signature'
        };
      }
    }

    // Look for city names in signature
    for (const [city, timezone] of Object.entries(this.CITY_TIMEZONES)) {
      if (signature.includes(city)) {
        return {
          detectedTimezone: timezone,
          confidence: 0.7,
          source: 'signature'
        };
      }
    }

    // Look for timezone offset patterns
    const offsetMatch = signature.match(/utc[+-]\d{1,2}|gmt[+-]\d{1,2}/);
    if (offsetMatch) {
      const offsetStr = offsetMatch[0];
      const offset = parseInt(offsetStr.replace(/[utcgmt]/g, ''));
      const timezone = moment.tz.guess(); // Best guess based on offset
      return {
        detectedTimezone: timezone,
        confidence: 0.6,
        source: 'signature'
      };
    }

    return null;
  }

  /**
   * Detect timezone from email content
   */
  static detectTimezoneFromContent(emailContent: string): TimezoneInfo | null {
    const content = emailContent.toLowerCase();

    // Look for explicit timezone mentions in content
    const timezonePatterns = [
      /(\d{1,2}:\d{2}\s*(am|pm)?\s*(pst|est|cst|mst|gmt|utc|bst|cet|jst|ist|aest))/g,
      /(\d{1,2}\s*(am|pm)\s*(pacific|eastern|central|mountain|london|tokyo|sydney)(\s+time)?)/g,
      /(my\s+time|local\s+time|our\s+time)/g
    ];

    for (const pattern of timezonePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Extract timezone from match
          for (const [abbr, timezone] of Object.entries(this.TIMEZONE_ABBREVIATIONS)) {
            if (match.includes(abbr.toLowerCase())) {
              return {
                detectedTimezone: timezone,
                confidence: 0.8,
                source: 'content'
              };
            }
          }
          
          // Check for city/region mentions
          for (const [city, timezone] of Object.entries(this.CITY_TIMEZONES)) {
            if (match.includes(city)) {
              return {
                detectedTimezone: timezone,
                confidence: 0.7,
                source: 'content'
              };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Comprehensive timezone detection from email
   */
  static detectTimezone(
    headers: Record<string, string>,
    emailContent: string
  ): TimezoneInfo {
    // Try detection methods in order of confidence
    let timezone = this.detectTimezoneFromHeaders(headers);
    if (timezone && timezone.confidence >= 0.8) {
      return timezone;
    }

    const signatureTimezone = this.detectTimezoneFromSignature(emailContent);
    if (signatureTimezone && signatureTimezone.confidence >= 0.7) {
      return signatureTimezone;
    }

    const contentTimezone = this.detectTimezoneFromContent(emailContent);
    if (contentTimezone && contentTimezone.confidence >= 0.7) {
      return contentTimezone;
    }

    // Return best available or fallback to Sid's timezone
    const bestTimezone = timezone || signatureTimezone || contentTimezone;
    if (bestTimezone) {
      return bestTimezone;
    }

    // Fallback to Sid's timezone
    return {
      detectedTimezone: this.SID_TIMEZONE,
      confidence: 0.0,
      source: 'fallback'
    };
  }

  /**
   * Detect timezones for multiple participants
   */
  static detectParticipantTimezones(
    participants: string[],
    headers: Record<string, string>,
    emailContent: string
  ): ParticipantTimezone[] {
    const senderTimezone = this.detectTimezone(headers, emailContent);
    
    return participants.map(email => ({
      email,
      timezone: senderTimezone // For now, assume all participants share sender's timezone
      // TODO: Implement individual participant timezone detection in future phases
    }));
  }
}

export class TimezoneConverter {
  private static readonly SID_TIMEZONE = 'America/Los_Angeles';

  /**
   * Convert time from one timezone to another
   */
  static convertTime(
    time: string,
    fromTimezone: string,
    toTimezone: string
  ): string {
    try {
      const momentTime = moment.tz(time, 'YYYY-MM-DD HH:mm', fromTimezone);
      return momentTime.tz(toTimezone).format('YYYY-MM-DD HH:mm');
    } catch (error: unknown) {
      console.error(`Error converting time ${time} from ${fromTimezone} to ${toTimezone}:`, error);
      // Fallback: return original time
      return time;
    }
  }

  /**
   * Convert time to Sid's timezone
   */
  static convertToSidTimezone(time: string, fromTimezone: string): string {
    return this.convertTime(time, fromTimezone, this.SID_TIMEZONE);
  }

  /**
   * Convert timezone-aware times for multi-participant coordination
   */
  static convertTimezonedTimes(
    originalTimes: { start: string; end: string },
    senderTimezone: TimezoneInfo,
    participantTimezones: ParticipantTimezone[]
  ): TimezonedTime[] {
    const results: TimezonedTime[] = [];

    // Convert start and end times
    for (const timeKey of ['start', 'end'] as const) {
      const originalTime = originalTimes[timeKey];
      const convertedToSid = this.convertToSidTimezone(
        originalTime,
        senderTimezone.detectedTimezone
      );

      const participantLocalTimes = participantTimezones.map(participant => ({
        email: participant.email,
        localTime: this.convertTime(
          originalTime,
          senderTimezone.detectedTimezone,
          participant.timezone.detectedTimezone
        ),
        timezone: participant.timezone.detectedTimezone
      }));

      results.push({
        originalTime,
        originalTimezone: senderTimezone.detectedTimezone,
        convertedToSidTimezone: convertedToSid,
        participantLocalTimes
      });
    }

    return results;
  }

  /**
   * Validate and handle DST transitions
   */
  static validateDSTTransition(
    time: string,
    timezone: string
  ): { isValid: boolean; adjustedTime?: string; warning?: string } {
    try {
      const momentTime = moment.tz(time, 'YYYY-MM-DD HH:mm', timezone);
      
      if (!momentTime.isValid()) {
        // Check if this is a DST transition issue
        const date = time.split(' ')[0];
        const timeStr = time.split(' ')[1];
        
        // Try adjusting for spring forward (2 AM -> 3 AM)
        if (timeStr === '02:00') {
          const adjustedTime = `${date} 03:00`;
          const adjustedMoment = moment.tz(adjustedTime, 'YYYY-MM-DD HH:mm', timezone);
          if (adjustedMoment.isValid()) {
            return {
              isValid: false,
              adjustedTime,
              warning: 'Time adjusted for DST spring forward transition'
            };
          }
        }
        
        return {
          isValid: false,
          warning: 'Invalid time during DST transition'
        };
      }

      return { isValid: true };
    } catch (error: unknown) {
      return {
        isValid: false,
        warning: `Error validating time: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}