# Test Plan: Timezone Awareness

Issue: #2

## Scope (in/out)

### In Scope
- Timezone detection from email headers, signatures, and content
- Multi-participant timezone coordination
- Time conversion accuracy across different timezone combinations
- Fallback behavior using Sid's timezone
- DST transition handling
- Timezone confidence scoring
- Integration with existing calendar intent extraction
- Multi-participant meeting scheduling with timezone awareness

### Out of Scope
- IP-based timezone detection (future enhancement)
- Calendar system timezone sync (future enhancement)
- Custom timezone preference storage (Phase 4)
- Real-time timezone updates during meetings

## Environments & Data

### Test Environments
- **Unit Testing**: Local development environment with mocked timezone data
- **Integration Testing**: Staging environment with real email processing pipeline
- **E2E Testing**: Full Ashley Calendar AI system with real calendar integration

### Test Data Sets
- **Email Headers**: Various timezone headers (X-Timezone, Date headers with timezone info)
- **Email Signatures**: Signatures with timezone indicators (PST, EST, GMT+5, etc.)
- **Email Content**: Natural language timezone references ("2 PM PST", "3 PM my time")
- **Multi-Participant Scenarios**: Emails with participants across different timezones
- **DST Test Cases**: Emails during DST transition periods
- **Edge Cases**: Invalid timezones, ambiguous timezone references, missing timezone info

## Test Matrix

### Unit Tests: Modules & Edge Cases

#### Timezone Detection Module
- ✅ **Header Parsing**
  - Valid IANA timezone identifiers
  - RFC 2822 Date header parsing
  - X-Timezone header extraction
  - Invalid/malformed timezone headers

- ✅ **Signature Analysis**
  - Common timezone abbreviations (PST, EST, GMT, UTC)
  - Timezone offsets (+05:30, -08:00)
  - City-based timezone references (New York time, London time)
  - Multiple timezone references in signature

- ✅ **Content Analysis**
  - Natural language timezone parsing ("2 PM Pacific", "3 PM my time")
  - Relative timezone references ("your time", "local time")
  - Mixed timezone formats in same email

- ✅ **Confidence Scoring**
  - High confidence: Explicit IANA identifiers
  - Medium confidence: Common abbreviations
  - Low confidence: Inferred from content
  - Fallback scenarios

#### Time Conversion Module
- ✅ **Basic Conversions**
  - Standard timezone conversions (PST to EST, GMT to PST)
  - UTC conversions to/from various timezones
  - Same timezone conversions (no-op scenarios)

- ✅ **DST Handling**
  - Spring forward transitions (2 AM → 3 AM)
  - Fall back transitions (2 AM → 1 AM)
  - Cross-DST timezone conversions
  - Non-DST to DST timezone conversions

- ✅ **Edge Cases**
  - Invalid time during DST transition
  - Ambiguous time during fall back
  - Leap year considerations
  - Historical timezone rule changes

#### Multi-Participant Coordination
- ✅ **Participant Detection**
  - Extract participants from To/CC/BCC fields
  - Parse participant names and email addresses
  - Handle malformed participant lists

- ✅ **Timezone Assignment**
  - Assign detected timezones to participants
  - Handle participants with unknown timezones
  - Fallback to Sid's timezone for unknown participants

### Integration Tests: API ↔ DB ↔ External

#### Email Processing Pipeline
- ✅ **End-to-End Email Processing**
  - Email ingestion with timezone detection
  - Calendar intent extraction with timezone info
  - Database storage of timezone-aware meeting data
  - Calendar API calls with converted times

- ✅ **Multi-Participant Workflows**
  - Process emails with multiple participants
  - Coordinate timezone detection across participants
  - Generate timezone-aware meeting invitations
  - Handle participant timezone conflicts

#### Calendar Integration
- ✅ **Meeting Creation**
  - Create meetings with correct timezone in Sid's calendar
  - Verify meeting times are stored in Sid's timezone
  - Confirm meeting invitations show correct times

- ✅ **Availability Checking**
  - Check Sid's availability using converted times
  - Handle timezone-aware conflict detection
  - Verify availability windows across timezones

### E2E Tests: User Flows (Happy/Sad)

#### Happy Path Scenarios
- ✅ **Single Participant Meeting**
  - Email from PST sender requesting EST meeting
  - Timezone detected from signature
  - Meeting scheduled correctly in Sid's timezone
  - Confirmation email shows both timezones

- ✅ **Multi-Participant Meeting**
  - Email with participants in PST, EST, and GMT
  - All timezones detected successfully
  - Meeting scheduled at optimal time
  - All participants receive correct local times

- ✅ **DST Transition Handling**
  - Meeting request during DST transition
  - Correct time conversion despite DST change
  - Meeting scheduled without conflicts

#### Sad Path Scenarios
- ✅ **Timezone Detection Failure**
  - Email with no timezone indicators
  - System falls back to Sid's timezone
  - Warning logged but meeting still scheduled
  - User notified of timezone assumption

- ✅ **Invalid Timezone Reference**
  - Email with invalid timezone abbreviation
  - System uses Sid's timezone as fallback
  - Error logged for debugging
  - Meeting proceeds with fallback

- ✅ **Multi-Participant Conflicts**
  - Impossible to find suitable time across all timezones
  - System suggests alternative times
  - Graceful degradation to best available option

## Pass/Fail Gates

### Unit Test Gates
- **Coverage**: ≥90% code coverage for timezone modules
- **Edge Cases**: All DST transitions handled correctly
- **Performance**: Timezone detection completes within 100ms
- **Accuracy**: ≥95% accuracy on known timezone test cases

### Integration Test Gates
- **Email Processing**: 100% of test emails processed without errors
- **Calendar Integration**: All meeting times correctly converted and stored
- **Multi-Participant**: ≥90% success rate for multi-participant coordination
- **Fallback Behavior**: 100% fallback to Sid's timezone when detection fails

### E2E Test Gates
- **Happy Paths**: 100% success rate for standard scenarios
- **Sad Paths**: Graceful degradation in 100% of failure scenarios
- **User Experience**: No user-facing errors for timezone issues
- **Data Integrity**: All meetings stored with correct timezone information

## Observability (logs, metrics, alerts)

### Logging
- **Timezone Detection**: Log detection source, confidence, and detected timezone
- **Conversion Operations**: Log all timezone conversions with before/after times
- **Fallback Events**: Log when fallback to Sid's timezone occurs
- **Multi-Participant**: Log participant timezone coordination results
- **Errors**: Detailed error logs for timezone parsing failures

### Metrics
- **Detection Success Rate**: Percentage of successful timezone detections by source
- **Conversion Accuracy**: Accuracy of timezone conversions
- **Fallback Frequency**: How often fallback to Sid's timezone occurs
- **Multi-Participant Success**: Success rate of multi-participant coordination
- **Performance**: Timezone processing latency metrics

### Alerts
- **High Fallback Rate**: Alert if >20% of emails require timezone fallback
- **Conversion Errors**: Alert on timezone conversion failures
- **Performance Degradation**: Alert if timezone processing exceeds 500ms
- **DST Issues**: Alert during DST transition periods for manual monitoring

### Success Criteria
- Timezone detection accuracy ≥95% for emails with timezone indicators
- Zero timezone-related scheduling conflicts in test scenarios
- All fallback scenarios gracefully handled with Sid's timezone
- Multi-participant coordination success rate ≥90%
- No performance degradation in email processing pipeline