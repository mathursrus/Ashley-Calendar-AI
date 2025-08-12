// Location detection service for analyzing email content

import { LocationDetectionResult, MeetingLocation } from './location-types';

export class LocationDetector {
  private static readonly PHYSICAL_LOCATION_PATTERNS = [
    // Address patterns
    /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Circle|Cir|Court|Ct|Place|Pl)\b/gi,
    
    // Building/venue patterns
    /\b(?:at|in|@)\s+([A-Za-z\s]+(?:Building|Center|Centre|Office|Tower|Plaza|Mall|Hotel|Restaurant|Cafe|Coffee|Shop|Store|Library|University|College|School|Hospital|Clinic))\b/gi,
    
    // Room patterns
    /\b(?:room|conference room|meeting room|boardroom|office)\s+([A-Za-z0-9\s\-]+)\b/gi,
    
    // Floor patterns
    /\b(?:floor|level)\s+(\d+(?:st|nd|rd|th)?)\b/gi,
    
    // Common venue names
    /\b(?:starbucks|coffee bean|peet's|dunkin|mcdonald's|subway|chipotle|panera)\b/gi,
    
    // City, State patterns
    /\b([A-Za-z\s]+),\s*([A-Z]{2})\b/g,
    
    // Zip code patterns
    /\b\d{5}(?:-\d{4})?\b/g
  ];

  private static readonly VIRTUAL_MEETING_KEYWORDS = [
    'zoom', 'teams', 'meet', 'google meet', 'webex', 'skype', 'virtual', 'online', 
    'video call', 'conference call', 'remote', 'dial-in', 'call-in'
  ];

  private static readonly LOCATION_KEYWORDS = [
    'at', 'in', 'located', 'address', 'venue', 'place', 'location', 'meet at',
    'come to', 'visit', 'office', 'building', 'room', 'floor', 'suite'
  ];

  /**
   * Detect location information from email content
   */
  static detectLocation(emailContent: string): LocationDetectionResult {
    const cleanContent = this.cleanEmailContent(emailContent);
    
    // Check for explicit virtual meeting requests
    const virtualKeywords = this.findVirtualMeetingKeywords(cleanContent);
    if (virtualKeywords.length > 0) {
      return {
        location: {
          type: 'virtual',
          notes: `Virtual meeting requested (${virtualKeywords.join(', ')})`
        },
        confidence: 85,
        detectedKeywords: virtualKeywords,
        source: 'email_content'
      };
    }

    // Check for physical location patterns
    const physicalLocation = this.detectPhysicalLocation(cleanContent);
    if (physicalLocation) {
      return physicalLocation;
    }

    // No specific location detected - default to virtual
    return {
      confidence: 50,
      detectedKeywords: [],
      source: 'default'
    };
  }

  /**
   * Detect physical location from email content
   */
  private static detectPhysicalLocation(content: string): LocationDetectionResult | null {
    const detectedAddresses: string[] = [];
    const detectedKeywords: string[] = [];
    let confidence = 0;

    // Check for address patterns
    for (const pattern of this.PHYSICAL_LOCATION_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        detectedAddresses.push(...matches);
        confidence += 20;
      }
    }

    // Check for location keywords
    for (const keyword of this.LOCATION_KEYWORDS) {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        detectedKeywords.push(keyword);
        confidence += 5;
      }
    }

    // If we found potential addresses or strong location indicators
    if (detectedAddresses.length > 0 || confidence >= 15) {
      const address = detectedAddresses.length > 0 
        ? this.cleanAddress(detectedAddresses[0])
        : undefined;

      return {
        location: {
          type: 'physical',
          address,
          notes: detectedAddresses.length > 1 
            ? `Multiple locations mentioned: ${detectedAddresses.slice(0, 3).join(', ')}`
            : undefined
        },
        confidence: Math.min(confidence, 90),
        detectedKeywords: [...detectedKeywords, ...detectedAddresses],
        source: 'email_content'
      };
    }

    return null;
  }

  /**
   * Find virtual meeting keywords in content
   */
  private static findVirtualMeetingKeywords(content: string): string[] {
    const found: string[] = [];
    const lowerContent = content.toLowerCase();

    for (const keyword of this.VIRTUAL_MEETING_KEYWORDS) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        found.push(keyword);
      }
    }

    return found;
  }

  /**
   * Clean email content for better analysis
   */
  private static cleanEmailContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Clean and format detected address
   */
  private static cleanAddress(address: string): string {
    return address
      .replace(/\s{2,}/g, ' ')
      .replace(/[^\w\s,.-]/g, '')
      .trim();
  }

  /**
   * Validate if a detected location makes sense
   */
  static validateLocation(location: MeetingLocation): boolean {
    if (location.type === 'physical') {
      return !!(location.address && location.address.length > 5);
    }
    
    if (location.type === 'virtual') {
      return true; // Virtual meetings are always valid
    }

    return false;
  }
}