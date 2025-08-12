# RFC: Timezone Awareness

Issue: #2  
Owner: Cascade AI

## Problem & Goals

Currently, Ashley Calendar AI assumes all times are in Sid's local timezone, which creates scheduling confusion and errors when coordinating with people in different timezones. The goal is to implement timezone detection and conversion capabilities to accurately handle meeting requests from senders in any timezone.

## Context

Ashley processes email-based meeting requests and schedules them on Sid's calendar. However, when someone writes "Let's meet at 2 PM tomorrow," Ashley currently interprets this as 2 PM in Sid's timezone, regardless of where the sender is located. This leads to:

- Missed meetings due to timezone confusion
- Manual timezone conversion required by users
- Poor user experience for international collaborators
- Scheduling conflicts due to incorrect time interpretation

## Design Proposal

### API Surface (OpenAPI)
- Extend calendar intent extraction to include timezone detection
- Add timezone conversion utilities to the core scheduling logic
- Update meeting creation APIs to handle timezone-aware scheduling

### Data Model / Schema
```typescript
interface TimezoneInfo {
  detectedTimezone: string; // IANA timezone identifier (e.g., "America/New_York")
  confidence: number; // 0-1 confidence score
  source: 'header' | 'signature' | 'content' | 'fallback';
}

interface CalendarIntent {
  // ... existing fields
  senderTimezone?: TimezoneInfo;
  proposedTimezonedTimes: {
    originalTime: string;
    senderTimezone: string;
    convertedToSidTimezone: string;
  }[];
}
```

### User Flows
1. **Email Processing**: Extract timezone from headers, signature, or content
2. **Time Conversion**: Convert proposed times to Sid's timezone
3. **Calendar Check**: Verify availability using converted times
4. **Response Generation**: Acknowledge timezone in confirmation emails

### Failure Modes & Timeouts
- **Timezone Detection Failure**: Fall back to Sid's timezone with warning
- **Invalid Timezone**: Use UTC as fallback and log error
- **Conversion Errors**: Graceful degradation to original behavior

### Telemetry & Analytics
- Track timezone detection success rates
- Monitor conversion accuracy
- Log timezone-related scheduling conflicts

## Alternatives

1. **Manual Timezone Specification**: Require users to specify timezone explicitly
2. **IP-based Detection**: Use sender's IP address for timezone inference
3. **Calendar Integration**: Sync with sender's calendar timezone settings

## Risks & Mitigations

### Risks
- **False Timezone Detection**: Incorrectly identifying sender's timezone
- **Daylight Saving Time**: Complex DST transitions and edge cases
- **Performance Impact**: Additional processing for timezone operations

### Mitigations
- Implement confidence scoring for timezone detection
- Use robust timezone libraries (e.g., moment-timezone, date-fns-tz)
- Add extensive testing for DST transitions
- Cache timezone conversion results

## Rollout Plan

### Phase 1: Foundation
- Implement timezone detection utilities
- Add timezone conversion functions
- Create comprehensive test suite

### Phase 2: Integration
- Integrate timezone detection into email processing
- Update calendar intent extraction
- Modify scheduling logic to use converted times

### Phase 3: Enhancement
- Add timezone confirmation in email responses
- Implement timezone preference learning
- Add timezone-aware conflict resolution

### Success Metrics
- Reduction in timezone-related scheduling errors
- Increased accuracy of international meeting scheduling
- Positive user feedback on timezone handling
- Decreased manual timezone conversion requests