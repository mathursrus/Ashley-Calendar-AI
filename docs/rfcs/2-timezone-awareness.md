# RFC: Timezone Awareness

Issue: #2  
Owner: Cascade AI

## Problem & Goals

Currently, Ashley Calendar AI assumes all times are in Sid's local timezone, which creates scheduling confusion and errors when coordinating with people in different timezones. The goal is to implement timezone detection and conversion capabilities to accurately handle meeting requests from senders and all participants in any timezone.

## Context

Ashley processes email-based meeting requests and schedules them on Sid's calendar. However, when someone writes "Let's meet at 2 PM tomorrow," Ashley currently interprets this as 2 PM in Sid's timezone, regardless of where the sender is located. For multi-participant meetings, this becomes even more complex as different participants may be in different timezones. This leads to:

- Missed meetings due to timezone confusion
- Manual timezone conversion required by users
- Poor user experience for international collaborators
- Scheduling conflicts due to incorrect time interpretation
- Multi-participant coordination failures across timezones

## Design Proposal

### API Surface (OpenAPI)
- Extend calendar intent extraction to include timezone detection for all participants
- Add timezone conversion utilities to the core scheduling logic
- Update meeting creation APIs to handle timezone-aware scheduling
- Support multi-participant timezone coordination

### Data Model / Schema
```typescript
interface TimezoneInfo {
  detectedTimezone: string; // IANA timezone identifier (e.g., "America/New_York")
  confidence: number; // 0-1 confidence score
  source: 'header' | 'signature' | 'content' | 'fallback';
}

interface ParticipantTimezone {
  email: string;
  name?: string;
  timezone: TimezoneInfo;
}

interface CalendarIntent {
  // ... existing fields
  senderTimezone?: TimezoneInfo;
  participantTimezones: ParticipantTimezone[]; // All meeting participants and their timezones
  proposedTimezonedTimes: {
    originalTime: string;
    originalTimezone: string;
    convertedToSidTimezone: string;
    participantLocalTimes: {
      email: string;
      localTime: string;
      timezone: string;
    }[];
  }[];
}
```

### User Flows
1. **Email Processing**: Extract timezone from headers, signature, or content for sender and all participants
2. **Multi-Participant Timezone Detection**: Identify timezones for all meeting participants
3. **Time Conversion**: Convert proposed times to Sid's timezone and all participant timezones
4. **Calendar Check**: Verify availability using converted times in Sid's timezone
5. **Response Generation**: Acknowledge timezones and show times in all relevant timezones

### Failure Modes & Timeouts
- **Timezone Detection Failure**: Fall back to Sid's timezone with warning
- **Invalid Timezone**: Use Sid's timezone as fallback and log error (not UTC)
- **Partial Participant Timezone Detection**: Use detected timezones where available, Sid's timezone for others
- **Conversion Errors**: Graceful degradation to original behavior using Sid's timezone

### Telemetry & Analytics
- Track timezone detection success rates by source (header, signature, content)
- Monitor conversion accuracy across different timezone combinations
- Log timezone-related scheduling conflicts
- Track multi-participant timezone coordination success rates

## Alternatives

1. **Manual Timezone Specification**: Require users to specify timezone explicitly
2. **IP-based Detection**: Use sender's IP address for timezone inference
3. **Calendar Integration**: Sync with participants' calendar timezone settings
4. **Timezone Preference Learning**: Learn and remember participant timezone preferences over time

## Risks & Mitigations

### Risks
- **False Timezone Detection**: Incorrectly identifying participant timezones
- **Daylight Saving Time**: Complex DST transitions and edge cases across multiple timezones
- **Performance Impact**: Additional processing for timezone operations across multiple participants
- **Multi-Participant Complexity**: Coordinating across many different timezones

### Mitigations
- Implement confidence scoring for timezone detection
- Use robust timezone libraries (e.g., moment-timezone, date-fns-tz)
- Add extensive testing for DST transitions across timezone combinations
- Cache timezone conversion results
- Always fall back to Sid's timezone (never UTC) to maintain consistency
- Implement participant timezone preference storage and learning

## Rollout Plan

### Phase 1: Foundation
- Implement timezone detection utilities for single sender
- Add timezone conversion functions with Sid's timezone fallback
- Create comprehensive test suite for single-participant scenarios

### Phase 2: Multi-Participant Support
- Extend timezone detection to handle multiple participants
- Implement participant timezone coordination logic
- Add multi-timezone time conversion and display

### Phase 3: Integration
- Integrate timezone detection into email processing
- Update calendar intent extraction for multi-participant scenarios
- Modify scheduling logic to use converted times

### Phase 4: Enhancement
- Add timezone confirmation in email responses showing all participant times
- Implement timezone preference learning and storage
- Add timezone-aware conflict resolution for multi-participant meetings

### Success Metrics
- Reduction in timezone-related scheduling errors
- Increased accuracy of international meeting scheduling
- Positive user feedback on timezone handling
- Decreased manual timezone conversion requests
- Successful multi-participant timezone coordination rate
- Improved meeting attendance rates for international participants