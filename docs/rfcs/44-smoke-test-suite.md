# RFC: Smoke Test Suite for Faster CI Feedback

Issue: #44  
Owner: Cascade

## Problem & Goals

**Problem**: Running all test cases for every checkin creates significant overhead, slowing down the development feedback loop and CI pipeline execution time.

**Goals**:
- Reduce CI execution time by implementing a smoke test suite with representative tests
- Maintain confidence in code quality with strategically selected test coverage
- Enable fast feedback for developers while preserving comprehensive testing for releases
- Create configurable test execution modes (smoke vs full)

## Context

Ashley Calendar AI currently runs comprehensive test suites on every commit, which includes:
- Unit tests for BAML models and TypeScript services
- Integration tests for calendar operations
- End-to-end workflow tests
- Multi-participant scheduling tests

While comprehensive testing is valuable, the overhead impacts developer productivity and CI resource utilization. A smoke test approach would provide rapid feedback for common scenarios while full tests run on release branches or nightly builds.

## Design Proposal

### API Surface (OpenAPI)
- No new API endpoints required
- Extend existing test runner configurations

### Data Model / Schema
```typescript
interface SmokeTestConfig {
  suites: {
    [suiteName: string]: {
      smokeTests: string[];        // Test file patterns for smoke testing
      fullTests: string[];         // All test file patterns
      representative: boolean;     // Whether this suite has representative coverage
    }
  };
  modes: {
    smoke: string[];              // Test suites to run in smoke mode
    full: string[];               // All test suites
  };
}
```

### User Flows
1. **Developer Commit Flow**:
   - Developer pushes to feature branch
   - CI triggers smoke test suite (2-5 minutes)
   - Fast feedback on core functionality
   - Full tests run on PR merge to master

2. **Release Flow**:
   - Full test suite runs on master branch
   - Comprehensive validation before deployment
   - Smoke tests as pre-check before full suite

3. **Local Development**:
   - `npm run test:smoke` for quick validation
   - `npm run test:full` for comprehensive testing
   - IDE integration for individual smoke tests

### Test Selection Strategy
For each existing test suite, select representative tests based on:

1. **BAML Model Tests**: 
   - Smoke: Core intent detection, basic calendar operations
   - Representative: `voice_intent.test.ts` (1-2 key scenarios)

2. **Calendar Service Tests**:
   - Smoke: Create/query basic events, availability check
   - Representative: `calendar-service.test.ts` (core CRUD operations)

3. **Integration Tests**:
   - Smoke: End-to-end meeting creation, simple scheduling
   - Representative: `integration.test.ts` (happy path scenarios)

4. **Multi-participant Tests**:
   - Smoke: Two-person scheduling with clear availability
   - Representative: `multi-participant.test.ts` (basic coordination)

### Implementation Structure
```
tests/
├── smoke/
│   ├── smoke.config.json          # Smoke test configuration
│   ├── baml-core.smoke.test.ts    # Representative BAML tests
│   ├── calendar-core.smoke.test.ts # Core calendar operations
│   └── integration-core.smoke.test.ts # Key integration flows
├── scripts/
│   ├── run-smoke-tests.sh         # Smoke test runner
│   └── run-full-tests.sh          # Full test suite runner
└── package.json                   # Updated test scripts
```

### Failure Modes & Timeouts
- **Smoke test failure**: Block PR merge, require investigation
- **Timeout handling**: 5-minute max for smoke suite vs 20-minute for full
- **Flaky test mitigation**: Retry logic for smoke tests (max 2 retries)
- **Coverage gaps**: Monthly review of smoke test effectiveness

### Telemetry & Analytics
- Track smoke test execution time vs full test time
- Monitor smoke test failure rates and false positives
- Measure developer feedback loop improvement
- Coverage analysis: smoke vs full test coverage percentage

## Alternatives

1. **Parallel Test Execution**: Run all tests in parallel
   - Pros: No test selection complexity
   - Cons: Still resource-intensive, doesn't solve feedback speed

2. **Test Impact Analysis**: Only run tests affected by code changes
   - Pros: Intelligent test selection
   - Cons: Complex dependency analysis, potential gaps

3. **Staged Testing**: Different test levels (unit → integration → e2e)
   - Pros: Natural progression
   - Cons: Doesn't address within-suite optimization

## Risks & Mitigations

**Risk**: Smoke tests miss critical regressions
- **Mitigation**: Regular review and update of representative tests, full tests on master

**Risk**: Test selection becomes outdated
- **Mitigation**: Automated analysis of test coverage and failure patterns

**Risk**: Developer overconfidence in smoke test results
- **Mitigation**: Clear documentation on smoke vs full test scope, mandatory full tests for releases

**Risk**: Maintenance overhead of dual test suites
- **Mitigation**: Automated tooling for smoke test selection, shared test utilities

## Rollout Plan

### Phase 1: Foundation (Week 1)
- Create smoke test configuration structure
- Implement test runner scripts
- Select initial representative tests (1-2 per suite)

### Phase 2: CI Integration (Week 2)
- Update GitHub Actions workflows for smoke/full modes
- Configure branch-based test execution (smoke for features, full for master)
- Add npm scripts for local development

### Phase 3: Optimization (Week 3)
- Monitor execution times and adjust test selection
- Implement retry logic and failure handling
- Add telemetry and reporting

### Phase 4: Full Deployment (Week 4)
- Enable smoke tests for all feature branches
- Documentation and developer training
- Establish review process for smoke test maintenance

### Success Metrics
- **Primary**: CI feedback time reduced from 15+ minutes to <5 minutes for smoke tests
- **Secondary**: Maintain >90% confidence in smoke test coverage
- **Tertiary**: Developer satisfaction with faster feedback loop

### Feature Flags
- `ENABLE_SMOKE_TESTS`: Toggle smoke test mode in CI
- `SMOKE_TEST_RETRY_COUNT`: Configure retry attempts
- `FULL_TEST_ON_SMOKE_FAILURE`: Run full tests if smoke tests fail