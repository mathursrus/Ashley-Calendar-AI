# RFC: Calendar Invite Location Enhancement

Issue: #37  
Owner: Cascade

## Problem & Goals

Currently, calendar invites sent by Ashley lack essential location information, creating confusion for meeting participants who don't know where to meet or how to join virtually. This RFC proposes enhancing Ashley's meeting creation capabilities to automatically include either:

1. A physical location for in-person meetings
2. A Google Meet link for virtual meetings

**Goals:**
- Ensure all calendar invites include appropriate location information
- Provide seamless virtual meeting experience with auto-generated Google Meet links
- Support physical location specification when requested
- Maintain backward compatibility with existing meeting creation flows

## Context

Ashley currently creates calendar events through the Google Calendar API but doesn't populate the location field or generate video conference links. This results in incomplete meeting invitations that require manual follow-up to clarify meeting logistics.

**Current State:**
- Calendar invites are created without location information
- No automatic video conferencing integration
- Users must manually add meeting details after creation

**User Impact:**
- Meeting participants are unclear about meeting format (virtual vs in-person)
- Additional manual steps required to add Google Meet links
- Poor user experience for executive assistant functionality

## Design Proposal

### API Surface (OpenAPI)
```yaml
# Enhanced calendar event creation
components:
  schemas:
    MeetingLocation:
      type: object
      properties:
        type:
          type: string
          enum: [physical, virtual, hybrid]
        address:
          type: string
          description: Physical address for in-person meetings
        meetingLink:
          type: string
          description: Auto-generated Google Meet link for virtual meetings
        notes:
          type: string
          description: Additional location context

    CalendarEventRequest:
      type: object
      properties:
        # ... existing fields
        location:
          $ref: '#/components/schemas/MeetingLocation'
        defaultToVirtual:
          type: boolean
          default: true
          description: Auto-generate Google Meet link if no location specified
```

### Data Model / Schema
```typescript
interface MeetingLocation {
  type: 'physical' | 'virtual' | 'hybrid';
  address?: string;
  meetingLink?: string;
  notes?: string;
}

interface CalendarEvent {
  // ... existing fields
  location?: MeetingLocation;
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: {
        type: 'hangoutsMeet';
      };
    };
  };
}
```

### User Flows

#### Email Flow
1. **Virtual Meeting (Default):**
   - Email request: "Please schedule a meeting with John tomorrow at 2pm"
   - Ashley auto-generates Google Meet link
   - Calendar invite includes meeting link and location details

2. **Physical Meeting:**
   - Email request: "Please schedule a meeting with John at the office tomorrow at 2pm"
   - Ashley detects "at the office" and sets physical location
   - Calendar invite includes office address

3. **Ambiguous Request:**
   - Email request: "Please schedule a meeting with the team for next week"
   - Ashley defaults to virtual meeting with Google Meet
   - Calendar invite includes auto-generated meeting link

### Failure Modes & Timeouts
- **Google Meet API Failure:** Fall back to manual link generation or note in description
- **Location Parsing Failure:** Default to virtual meeting with Google Meet
- **API Timeout:** Retry with exponential backoff, max 3 attempts
- **Invalid Address:** Log error, proceed with virtual meeting

### Telemetry & Analytics
- Track meeting type distribution (virtual vs physical vs hybrid)
- Monitor Google Meet link generation success rate
- Measure user satisfaction with auto-generated locations
- Track manual location override frequency

## Alternatives

1. **Manual Location Entry Only:** Require users to specify location every time
   - Pros: Full user control
   - Cons: Poor UX, inconsistent meeting setup

2. **Third-party Video Services:** Support Zoom, Teams, etc.
   - Pros: Broader compatibility
   - Cons: Complex integration, authentication challenges

3. **Smart Location Detection:** Use ML to infer meeting type from context
   - Pros: Intelligent automation
   - Cons: Complex implementation, potential errors

## Risks & Mitigations

**Risk:** Google Meet API rate limits or failures
- **Mitigation:** Implement retry logic, fallback to description notes

**Risk:** Privacy concerns with auto-generated meeting links
- **Mitigation:** Use Google's secure meeting link generation, allow opt-out

**Risk:** Incorrect location inference from natural language
- **Mitigation:** Conservative defaults (virtual), clear confirmation messages

**Risk:** Breaking existing calendar integrations
- **Mitigation:** Backward compatibility testing, gradual feature enablement

## Implementation Plan

### Immediate Implementation
- Implement Google Meet integration for virtual meetings
- Add location field to calendar event creation
- Enable features by default with feature flags: `enable_meeting_locations=true`, `enable_smart_location_detection=true`
- Deploy natural language processing for location detection
- Implement comprehensive error handling and fallbacks

### Success Metrics
- 95%+ of calendar invites include location information
- <2% user complaints about incorrect meeting types
- 90%+ Google Meet link generation success rate
- Positive user feedback on meeting logistics clarity

### Migration Strategy
- No data migration required (new feature)
- Existing meetings remain unchanged
- New meetings automatically include location enhancement
- Monitor success metrics and user feedback for immediate adjustments