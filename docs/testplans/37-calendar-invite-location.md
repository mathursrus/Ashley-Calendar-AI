# Test Plan: Calendar Invite Location Enhancement

Issue: #37

## Scope (in/out)

### In Scope
- **Google Meet Integration**: Auto-generation of Google Meet links for virtual meetings
- **Location Detection**: Natural language processing to detect physical locations from email text
- **Default Virtual Behavior**: All meetings default to virtual with Google Meet unless specified otherwise
- **Location Field Population**: Calendar events include proper location information
- **Error Handling**: Graceful fallbacks when Google Meet API fails
- **Backward Compatibility**: Existing meeting creation flows remain functional

### Out of Scope
- Siri/Voice integration (removed per feedback)
- Third-party video services (Zoom, Teams, etc.)
- Multi-participant availability coordination
- Meeting room booking integration
- Calendar synchronization across multiple platforms

## Environments & Data

### Test Environments
1. **Development**: Local Ashley instance with mock Google Calendar API
2. **Staging**: Full Ashley deployment with real Google Calendar API (test account)
3. **Production**: Live system with production Google Calendar API

### Test Data Requirements
- **Google Calendar Test Account**: Dedicated calendar for testing
- **Email Templates**: Various meeting request formats and scenarios
- **Location Variations**: Physical addresses, office references, ambiguous requests
- **Edge Cases**: Malformed requests, API timeout scenarios, rate limit conditions

### API Dependencies
- Google Calendar API (calendar events creation)
- Google Meet API (conference link generation)
- Ashley's email processing pipeline
- Natural language processing models

## Test Matrix

### Unit Tests
**Modules & Edge Cases**

1. **Location Parser Module**
   - Parse physical locations from text ("at the office", "123 Main St")
   - Detect virtual meeting keywords ("online", "video call")
   - Handle ambiguous or missing location information
   - Edge cases: empty strings, special characters, multiple locations

2. **Google Meet Integration Module**
   - Generate unique meeting links
   - Handle API authentication
   - Retry logic for failed requests
   - Rate limit handling

3. **Calendar Event Builder Module**
   - Populate location field correctly
   - Include conference data for virtual meetings
   - Maintain backward compatibility with existing fields
   - Handle missing or invalid location data

### Integration Tests
**API ↔ DB ↔ External**

1. **Google Calendar API Integration**
   - Create calendar events with location information
   - Verify Google Meet links are properly attached
   - Test API error scenarios (401, 403, 429, 500)
   - Validate event data persistence

2. **Email Processing Pipeline**
   - End-to-end email → calendar event creation
   - Location detection accuracy across various email formats
   - Error propagation and logging
   - Performance under load

3. **Database Operations**
   - Store meeting metadata and location preferences
   - Retrieve user configuration settings
   - Audit trail for meeting creation events

### E2E Tests
**User Flows (Happy/Sad Paths)**

#### Happy Path Scenarios
1. **Default Virtual Meeting**
   - Email: "Please schedule a meeting with John tomorrow at 2pm"
   - Expected: Calendar event with Google Meet link, location type = "virtual"

2. **Physical Location Detection**
   - Email: "Schedule a meeting with the team at the office next week"
   - Expected: Calendar event with office address, location type = "physical"

3. **Explicit Virtual Request**
   - Email: "Set up a video call with Sarah on Friday"
   - Expected: Calendar event with Google Meet link, location type = "virtual"

#### Sad Path Scenarios
1. **Google Meet API Failure**
   - Simulate API downtime
   - Expected: Fallback to description note, event still created

2. **Ambiguous Location**
   - Email: "Meeting with client tomorrow"
   - Expected: Default to virtual, Google Meet link included

3. **Invalid Physical Address**
   - Email: "Meet at the nonexistent building"
   - Expected: Log warning, default to virtual meeting

4. **Rate Limit Exceeded**
   - High volume of meeting requests
   - Expected: Retry with backoff, eventual success or graceful failure

## Pass/Fail Gates

### Functional Requirements
- ✅ **95%+ Location Coverage**: Calendar invites include location information
- ✅ **90%+ Google Meet Success**: Meeting links generated successfully
- ✅ **100% Backward Compatibility**: Existing flows remain unaffected
- ✅ **<3 Second Response Time**: Meeting creation completes within acceptable time
- ✅ **Zero Data Loss**: No meeting requests are lost due to location processing

### Quality Gates
- ✅ **Unit Test Coverage**: >90% code coverage for new modules
- ✅ **Integration Test Pass Rate**: 100% of integration tests pass
- ✅ **E2E Test Success**: All critical user flows work end-to-end
- ✅ **Performance Benchmarks**: No degradation in meeting creation speed
- ✅ **Error Rate**: <1% of meeting creations fail due to location processing

### Security & Privacy
- ✅ **Google Meet Link Security**: Links are properly secured and unique
- ✅ **Location Data Privacy**: No sensitive location data logged inappropriately
- ✅ **API Key Security**: Google API credentials properly managed

## Observability (logs, metrics, alerts)

### Logging Requirements
- **Location Detection Events**: Log detected location type and confidence
- **Google Meet Generation**: Log successful/failed link creation attempts
- **API Interactions**: Log all Google Calendar/Meet API calls with response codes
- **Error Scenarios**: Detailed error logging for debugging and monitoring

### Metrics to Track
- **Meeting Creation Rate**: Total meetings created per hour/day
- **Location Type Distribution**: Virtual vs Physical vs Hybrid breakdown
- **Google Meet Success Rate**: Percentage of successful link generations
- **API Response Times**: Google Calendar and Meet API latency
- **Error Rates**: Failed meeting creations by error type
- **User Satisfaction**: Feedback on meeting logistics clarity

### Alerts Configuration
- **High Error Rate**: >5% meeting creation failures
- **Google Meet API Failures**: >10% link generation failures
- **API Response Degradation**: >5 second average response time
- **Rate Limit Approaching**: 80% of Google API quota consumed

### Monitoring Dashboards
- **Meeting Creation Overview**: Volume, success rate, location distribution
- **API Health**: Response times, error rates, quota usage
- **User Experience**: Meeting logistics feedback and satisfaction scores
- **System Performance**: Resource utilization and processing times

## Test Execution Strategy

### Phase 1: Unit & Integration (Week 1)
- Run all unit tests in CI/CD pipeline
- Execute integration tests against staging environment
- Validate API error handling and retry logic

### Phase 2: E2E Testing (Week 2)
- Execute happy path scenarios with real email data
- Test sad path scenarios with simulated failures
- Performance testing under expected load

### Phase 3: Production Validation (Week 3)
- Deploy with feature flags enabled
- Monitor metrics and alerts closely
- Gradual rollout with immediate rollback capability

### Success Criteria
All pass/fail gates met, observability in place, and positive user feedback on meeting logistics improvement.