# Calendar Free/Busy Integration Design

## Overview

This design document outlines the implementation of automatic calendar free/busy lookup functionality for Ashley Calendar AI. The goal is to enable Ashley to directly check participants' calendar availability through Google Calendar and Microsoft Outlook APIs, reducing the need for manual coordination when Sid requests multi-participant meetings.

## Design Principles

- **Deterministic Implementation**: Use standard API calls and algorithms, not LLM processing
- **Graceful Degradation**: Fall back to manual coordination when API access unavailable
- **Minimal Complexity**: Keep the implementation simple and maintainable
- **Privacy First**: Only access free/busy information, never meeting details
- **No BAML Changes**: Enhance input data to existing BAML functions without modifying core logic

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Email Thread  │───▶│  Calendar API    │───▶│ BAML Function   │
│   Processing    │    │  Integration     │    │ (Enhanced)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Google Calendar  │
                    │ Microsoft Graph  │
                    │ API Services     │
                    └──────────────────┘
```

## Implementation Components

### 1. Calendar Service Layer

#### 1.1 Google Calendar Integration
- **API**: Google Calendar API v3
- **Authentication**: Service account with domain-wide delegation OR OAuth2 consent
- **Endpoint**: `POST /calendar/v3/freeBusy`
- **Scope**: `https://www.googleapis.com/auth/calendar.freebusy`

#### 1.2 Microsoft Graph Integration
- **API**: Microsoft Graph API v1.0
- **Authentication**: Application permissions with admin consent
- **Endpoint**: `POST /v1.0/me/calendar/getSchedule`
- **Scope**: `https://graph.microsoft.com/Calendars.ReadBasic`

#### 1.3 Service Interface
```typescript
interface CalendarService {
  getFreeBusy(
    email: string,
    startTime: Date,
    endTime: Date
  ): Promise<FreeBusyResult>
}

interface FreeBusyResult {
  email: string
  status: 'success' | 'access_denied' | 'not_found' | 'error'
  busySlots?: BusySlot[]
  errorMessage?: string
}

interface BusySlot {
  start: Date
  end: Date
  status: 'busy' | 'tentative' | 'out_of_office'
}
```

### 2. Free/Busy Lookup Engine

#### 2.1 Participant Availability Service
```typescript
class ParticipantAvailabilityService {
  async getMultiParticipantAvailability(
    participants: string[],
    startTime: Date,
    endTime: Date,
    duration: number
  ): Promise<AvailabilityResult>
}

interface AvailabilityResult {
  commonAvailableSlots: AvailableSlot[]
  participantData: ParticipantAvailability[]
  hasApiAccess: boolean
  requiresManualCoordination: string[] // emails needing manual confirmation
}
```

#### 2.2 Slot Finding Algorithm
```typescript
function findCommonAvailableSlots(
  participantData: ParticipantAvailability[],
  startTime: Date,
  endTime: Date,
  duration: number
): AvailableSlot[] {
  // 1. Create time grid for the requested period
  // 2. Mark busy slots for each participant
  // 3. Find continuous free periods >= duration
  // 4. Return ranked list of optimal slots
}
```

### 3. Integration with Existing BAML Flow

#### 3.1 Enhanced Function Input
Instead of modifying BAML functions, enhance the input data:

```typescript
// Current approach
AshleyCalendarAssistant(calendar_intent, sid_calendar_data)

// Enhanced approach (no BAML changes needed)
AshleyCalendarAssistant(
  calendar_intent, 
  sid_calendar_data + participant_availability_summary
)
```

#### 3.2 Participant Availability Summary Format
```
Participant Availability Analysis:

API Access Available:
- alice@company.com: Available 10am-12pm, 2pm-4pm
- bob@company.com: Busy 10am-11am, Available 11am-12pm, 2pm-5pm

Manual Coordination Needed:
- carol@external.com: Calendar access not available
- david@contractor.com: Calendar access not available

Common Available Slots (60 minutes):
- Tuesday 11:00 AM - 12:00 PM (All with API access available)
- Tuesday 2:00 PM - 3:00 PM (All with API access available)

Recommendation: Use API data for confirmed participants, request manual confirmation from carol@external.com, david@contractor.com
```

## Fallback Strategy

### 4.1 Hybrid Coordination Approach

When some participants have API access and others don't:

1. **Use API data** for participants with calendar access
2. **Request manual confirmation** only from participants without API access
3. **Generate targeted coordination messages** based on access status

### 4.2 Coordination Message Templates

#### Full API Access Available
```
Hi everyone,

I've checked all calendars and found these optimal times for our [meeting topic]:

• Tuesday, August 13th at 11:00 AM - 12:00 PM PT
• Tuesday, August 13th at 2:00 PM - 3:00 PM PT
• Wednesday, August 14th at 10:00 AM - 11:00 AM PT

I'll book the first option unless I hear otherwise by [deadline].

Best regards,
Ashley
```

#### Partial API Access
```
Hi everyone,

I've checked the calendars for Alice and Bob, and found these times that work for them:

• Tuesday, August 13th at 11:00 AM - 12:00 PM PT
• Tuesday, August 13th at 2:00 PM - 3:00 PM PT

Carol and David - could you please confirm your availability for these times?

| Time Slot | Alice | Bob | Carol | David |
|-----------|-------|-----|-------|-------|
| Tue 11am-12pm | ✓ | ✓ | Please confirm | Please confirm |
| Tue 2pm-3pm | ✓ | ✓ | Please confirm | Please confirm |

Best regards,
Ashley
```

#### No API Access (Current Behavior)
Falls back to existing coordination table approach.

## Error Handling

### 5.1 API Failure Scenarios

| Scenario | Response | Fallback |
|----------|----------|----------|
| Authentication failure | Log error, mark as "access_denied" | Manual coordination |
| Rate limiting | Exponential backoff, retry | Manual coordination if fails |
| Network timeout | Retry once, then fail gracefully | Manual coordination |
| Invalid email | Mark as "not_found" | Manual coordination |
| API service down | Log error, fail gracefully | Manual coordination |

### 5.2 Graceful Degradation
- **Never break existing functionality**
- **Always provide clear communication** about access status
- **Default to manual coordination** when in doubt
- **Log all API attempts** for debugging and monitoring

## Security and Privacy

### 6.1 Minimal Permissions
- **Google**: Only `calendar.freebusy` scope (no meeting details)
- **Microsoft**: Only `Calendars.ReadBasic` scope (no meeting content)
- **No persistent storage** of calendar data beyond request lifecycle

### 6.2 Authentication Strategy
- **Service Account with Domain Delegation** (preferred for Google Workspace)
- **Application Permissions with Admin Consent** (for Microsoft 365)
- **OAuth2 with User Consent** (fallback for external participants)

### 6.3 Data Handling
- **Process free/busy data in memory only**
- **No caching of calendar information**
- **Clear error messages** without exposing sensitive details
- **Audit logging** for all calendar access attempts

## Implementation Phases

### Phase 1: Core Calendar Services
- Implement Google Calendar API integration
- Implement Microsoft Graph API integration
- Create unified calendar service interface
- Add comprehensive error handling and logging

### Phase 2: Availability Engine
- Build participant availability lookup service
- Implement common slot finding algorithm
- Create availability summary formatting
- Add comprehensive test coverage

### Phase 3: Integration with Existing Flow
- Enhance calendar data input to BAML functions
- Update multi-participant coordination logic
- Implement hybrid coordination message generation
- Test end-to-end workflow

### Phase 4: Production Readiness
- Add monitoring and alerting
- Implement rate limiting and retry logic
- Create admin dashboard for API access management
- Performance optimization and caching strategies

## Success Metrics

### Efficiency Gains
- **Reduce coordination emails** by 60-80% when API access available
- **Faster meeting scheduling** - target 70% reduction in time-to-schedule
- **Higher first-attempt success rate** for meeting coordination

### User Experience
- **Seamless integration** with existing Ashley workflow
- **Clear communication** about calendar access status
- **Professional messaging** regardless of API access availability
- **Maintained reliability** with graceful fallbacks

## Testing Strategy

### Unit Tests
- Calendar API service functions
- Slot finding algorithms
- Error handling scenarios
- Message formatting logic

### Integration Tests
- End-to-end multi-participant coordination
- Mixed API access scenarios
- Fallback to manual coordination
- Error recovery workflows

### Test Cases
1. **All participants have Google Calendar access**
2. **All participants have Outlook access**
3. **Mixed Google/Outlook participants**
4. **Some participants have API access, others don't**
5. **No participants have API access (current behavior)**
6. **API failures and recovery scenarios**
7. **Cross-timezone coordination**
8. **Complex scheduling conflicts**

## Conclusion

This design provides a clean, deterministic approach to calendar integration that enhances Ashley's capabilities without adding unnecessary complexity. By focusing on simple API calls and clear fallback strategies, we can significantly improve the multi-participant scheduling experience while maintaining the reliability and professionalism that users expect from Ashley.

The implementation will be done in phases, ensuring that existing functionality is never compromised and that each component can be thoroughly tested before integration.
