# RFC: Smoke Test Suite

Issue: #44  
Owner: Cascade

## Customer 
- Development team
- CI/CD pipeline

## Customer Outcome
- Faster feedback cycle on code changes
- Reduced CI/CD pipeline execution time
- Early detection of critical failures without running the full test suite

## Customer Problem being solved
Running all test cases for every check-in is an overhead. The current testing process runs all tests for every code change, which can be time-consuming and resource-intensive, especially as the test suite grows.

## Solution
Implement a smoke test strategy that selects representative tests from each test suite to run on every check-in. These smoke tests will verify that the most critical functionality works correctly without running the entire test suite.

The solution will:
1. Create a dedicated smoke test file (`test-smoke.ts`) that imports and runs selected test cases from existing test suites
2. Update the CI pipeline to run smoke tests for every check-in
3. Keep the full test suite execution for specific events (e.g., merges to master, nightly builds)

## Alternatives
1. **Tagging approach**: Add tags to existing tests to mark them as smoke tests and filter by tags during execution. This would require modifying the test runner and all test files.
2. **Separate smoke test directory**: Create duplicate test files in a separate directory. This would lead to code duplication and maintenance overhead.
3. **No change**: Continue running all tests for every check-in. This doesn't address the overhead issue.

## Design Details

### User Experience changes
No direct user-facing changes. This is a developer experience and CI/CD pipeline improvement.

### API surface changes
No API changes required.

### Data model / schema changes
No data model changes required.

### Implementation Details
1. Create a new `test-smoke.ts` file that will:
   - Import selected test cases from each test suite
   - Run only these selected tests
   - Provide clear pass/fail output

2. Selection criteria for smoke tests:
   - Choose tests that verify core functionality
   - Include at least one test from each major feature area
   - Prioritize tests that run quickly
   - Cover critical user flows

3. The smoke test file will use the existing test utilities and runner infrastructure.

### Failure modes & timeouts
- If smoke tests fail, the CI pipeline should fail early and provide clear error messages
- Timeout settings will remain consistent with the existing test suite

### Telemetry & analytics
- Add logging to track smoke test execution time
- Compare smoke test results with full test suite results to ensure smoke tests are effective indicators

## Test Matrix

### Unit Tests
- Verify that smoke test selection covers all major feature areas
- Ensure smoke tests run successfully in isolation

### Integration Tests
- Verify that smoke tests integrate correctly with the existing test infrastructure
- Ensure CI pipeline correctly executes smoke tests

### E2E Tests
- Verify that smoke tests detect actual issues by introducing known failures
- Compare smoke test results with full test suite results over time

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Smoke tests might miss issues that would be caught by the full test suite | Regularly review and update smoke test selection based on failure patterns |
| Developers might rely too much on smoke tests and neglect the full test suite | Enforce full test suite execution before merges to master |
| Smoke tests might become outdated as the codebase evolves | Implement a regular review process for smoke tests |

## Observability (logs, metrics, alerts)
- Add execution time metrics for smoke tests vs. full test suite
- Log smoke test results separately from full test suite results
- Alert on smoke test failures in the CI pipeline