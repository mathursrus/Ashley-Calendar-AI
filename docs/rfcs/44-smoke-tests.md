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
Implement a smoke test strategy that marks selected tests in each test suite as smoke tests. These smoke tests will verify that the most critical functionality works correctly without running the entire test suite.

The solution will:
1. Add a tagging mechanism to mark specific tests as smoke tests within existing test files
2. Update the test runner to support filtering tests by tags
3. Update the CI pipeline to run only smoke tests for regular check-ins
4. Keep the full test suite execution for specific events (e.g., merges to master, nightly builds)

## Alternatives
1. **Separate smoke test file**: Create a dedicated file that imports and runs selected test cases. This would lead to test duplication and maintenance overhead.
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
1. Add a tagging mechanism to existing test files:
   ```typescript
   // Example of tagging a test case
   const testBookTimeAvailable: AshleyTestCase = {
     name: 'BookTime - Available Calendar',
     tags: ['smoke'], // New property to mark as smoke test
     calendarIntent: {
       // ...existing test case properties
     },
     // ...rest of test case
   };
   ```

2. Update the test runner to support filtering by tags:
   ```typescript
   // In test runner
   function runTests(testCases: AshleyTestCase[], options: { tags?: string[] } = {}) {
     const testsToRun = options.tags 
       ? testCases.filter(test => test.tags?.some(tag => options.tags.includes(tag)))
       : testCases;
     
     // Run the filtered tests
     for (const test of testsToRun) {
       // Existing test execution logic
     }
   }
   ```

3. Update the GitHub workflow file (`.github/workflows/ci.yml`) to run smoke tests:
   ```yaml
   # Add a new job or modify existing one
   - name: Run smoke tests
     shell: bash
     run: |
       set -euo pipefail
       FILES="$(git ls-files -- './test-*.ts' || true)"
       if [ -z "$FILES" ]; then
         echo "No TS tests found"; exit 0
       fi
       # Run with smoke tag filter
       npx --yes tsx --test --test-reporter tap $FILES -- --tags=smoke
   ```

4. Selection criteria for smoke tests:
   - Choose tests that verify core functionality
   - Include at least one test from each major feature area
   - Prioritize tests that run quickly
   - Cover critical user flows

### Failure modes & timeouts
- If smoke tests fail, the CI pipeline should fail early and provide clear error messages
- Timeout settings will remain consistent with the existing test suite

### Telemetry & analytics
- Add logging to track smoke test execution time
- Compare smoke test results with full test suite results to ensure smoke tests are effective indicators

## Test Matrix

### Unit Tests
- Verify that smoke test selection covers all major feature areas
- Ensure smoke tests run successfully with the tag filter

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
| Tags might be inconsistently applied | Create clear guidelines for tagging tests and review during code reviews |

## Observability (logs, metrics, alerts)
- Add execution time metrics for smoke tests vs. full test suite
- Log smoke test results separately from full test suite results
- Alert on smoke test failures in the CI pipeline