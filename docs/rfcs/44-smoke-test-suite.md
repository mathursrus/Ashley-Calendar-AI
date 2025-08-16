# RFC: Smoke Test Suite

Issue: #44  
Owner: AI Agent

## Customer 

Developers and contributors working on the Ashley Calendar AI project who need to run tests quickly during development and check-ins.

## Customer Outcome

Faster feedback loops during development by running representative tests instead of the full test suite, while maintaining confidence that core functionality works.

## Customer Problem being solved

Running all test cases for every check-in creates overhead that slows down development velocity. The current test suite includes multiple comprehensive test files that take time to execute, but developers need quick validation that their changes haven't broken core functionality.

## Solution

Create a smoke test suite that selects 1-2 representative tests from each test file to run quickly. This provides fast feedback on core functionality without the overhead of running all tests.

## Alternatives

1. **Keep current approach** - Run all tests every time (slow, high overhead)
2. **Manual test selection** - Developers manually choose which tests to run (error-prone, inconsistent)
3. **Test categorization** - Add complexity with test tags/annotations (over-engineering)

## Design Details

### User Experience changes
- Add new npm script `test:smoke` that runs representative tests quickly
- Keep existing `test:*` scripts for full test runs
- Smoke tests should complete in under 30 seconds

### API surface changes
- No API changes required
- New npm script only

### Data model / schema changes
- No schema changes required

### Failure modes & timeouts
- Smoke tests should timeout after 60 seconds
- If smoke tests fail, developers should run full test suite to identify specific issues

### Telemetry & analytics
- No additional telemetry needed

## Test Matrix

### Unit: modules & edge cases
- **test-intent.ts**: Select 1-2 representative intent extraction tests
- **test-ashley.ts**: Select 1-2 representative Ashley response tests  
- **test-context.ts**: Select 1-2 representative context memory tests
- **test-speech-formatter.ts**: Select 1-2 representative formatting tests

### Integration: API <-> DB <-> external
- Smoke tests focus on core functionality, not external integrations

### E2E: user flows (happy/sad)
- Include both positive and negative test cases in smoke suite

## Risks & Mitigations

**Risk**: Smoke tests may miss edge cases that full suite catches
**Mitigation**: Clear documentation that smoke tests are for quick validation, not comprehensive testing

**Risk**: Smoke test selection may become outdated as test suite evolves
**Mitigation**: Document selection criteria and review periodically

## Observability (logs, metrics, alerts)

- Smoke test output clearly indicates it's running smoke tests vs full suite
- Test results show which specific tests were run
- Clear messaging about when to run full test suite
