# RFC: Smoke Test Suite

Issue: #44  
Owner: AI Agent

## Customer 

Development team and CI/CD pipeline operators who need faster feedback cycles for code changes while maintaining confidence in system stability.

## Customer Outcome

- Reduced CI/CD execution time from full test suite to essential smoke tests for regular commits
- Faster development feedback loop while maintaining quality gates
- Selective deep testing only when needed (e.g., before releases, when smoke tests fail)
- Clear test categorization and execution strategy

## Customer Problem being solved

Currently, running all test cases for every check-in creates overhead and slows down the development process. The team needs a way to run representative tests that catch most regressions quickly, while preserving the option to run comprehensive tests when needed.

## Solution

Create a smoke test suite that includes one representative test case from each major test category:

1. **Intent Extraction Tests** (from test-intent.ts) - Select one core calendar intent extraction test
2. **Ashley Assistant Tests** (from test-ashley.ts) - Select one end-to-end assistant response test  
3. **Context Tests** (from test-context.ts) - Select one context handling test
4. **Speech Formatter Tests** (from test-speech-formatter.ts) - Select one speech formatting test
5. **Multi-participant Tests** (from test-sid-multi-participant.ts) - Select one multi-participant scenario test

Implement a new npm script `npm run test:smoke` that runs only these representative tests, while keeping `npm run test` for the full suite.

## Alternatives

1. **Parallel Test Execution**: Run all tests in parallel to reduce wall-clock time
   - Pros: No test coverage reduction
   - Cons: Higher resource consumption, potential test interference
   
2. **Tiered Testing**: Different test levels (unit → integration → e2e)
   - Pros: Traditional testing pyramid approach
   - Cons: Current codebase doesn't follow this structure
   
3. **Change-based Testing**: Only run tests related to changed files
   - Pros: Minimal test execution
   - Cons: Complex dependency analysis, risk of missing integration issues

## Design Details

### User Experience changes
- New npm script: `npm run test:smoke`
- Update CI/CD workflows to use smoke tests for regular commits
- Full test suite runs for release branches and weekly schedules

### API surface (OpenAPI) changes
None - this is purely a testing infrastructure change.

### Data model / schema changes
None.

### Failure modes & timeouts
- If smoke tests fail, automatically trigger full test suite
- Smoke tests should complete within 2-3 minutes maximum
- Individual smoke test timeout: 30 seconds

### Telemetry & analytics
- Track smoke test execution time
- Track smoke test pass/fail rates
- Monitor correlation between smoke test failures and full test suite failures

## Test Matrix

### Unit: modules & edge cases
- Test the smoke test runner itself
- Verify correct test selection
- Ensure timeout handling works

### Integration: API <-> DB <-> external
- Smoke tests will inherently test key integration points
- Each smoke test should exercise at least one external dependency

### E2E: user flows (happy/sad)
- Ashley assistant smoke test covers primary user flow
- Include one failure scenario in smoke test selection

## Risks & Mitigations

### Risk: Missing regressions in non-smoke tests
**Mitigation**: 
- Run full test suite on release branches
- Weekly full test suite execution
- Automatic full test suite trigger on smoke test failures

### Risk: Smoke test selection becomes outdated
**Mitigation**:
- Regular review of smoke test effectiveness
- Quarterly smoke test selection review
- Add tests when new major features are added

### Risk: False confidence from limited test coverage
**Mitigation**:
- Clear documentation about smoke test limitations
- Mandatory full test suite for releases
- Regular correlation analysis between smoke and full test results

## Observability (logs, metrics, alerts)

### Logs
- Smoke test execution logs with timing
- Selection criteria logs for chosen representative tests

### Metrics
- Smoke test execution time trend
- Smoke test pass rate
- Full test suite trigger frequency due to smoke test failures

### Alerts
- Smoke test execution time exceeding 5 minutes
- Smoke test pass rate below 95% over 24-hour period
- Frequent smoke test failures triggering full suite runs
