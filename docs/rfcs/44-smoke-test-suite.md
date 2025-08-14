# RFC: Smoke Test Suite for Faster CI Feedback

Issue: #44  
Owner: Cascade

## Problem & Goals

**Problem**: Running all test cases for every checkin creates significant overhead, slowing down the development feedback loop and CI pipeline execution time.

**Goals**:
- Reduce CI execution time by running only representative tests on feature branches
- Maintain confidence in code quality with strategically selected test coverage
- Enable fast feedback for developers while preserving comprehensive testing for releases

## Context

Ashley Calendar AI currently runs comprehensive test suites on every commit. While comprehensive testing is valuable, the overhead impacts developer productivity and CI resource utilization.

## Design Proposal

### Simple Approach: Mark Existing Tests as Smoke Tests

Instead of creating new test files or complex configurations, we'll mark representative test cases in existing test files with a `@smoke` comment tag.

**Example**:
```typescript
// @smoke - Core intent detection
test('should detect meeting creation intent', () => {
  // existing test code
});

test('should handle complex scheduling scenarios', () => {
  // this test runs only in full mode
});

// @smoke - Basic calendar operations  
test('should create simple calendar event', () => {
  // existing test code
});
```

### Implementation

1. **Test Selection**: Mark 2-3 representative test cases per existing test file with `@smoke` comments
2. **Test Runner**: Add npm script `test:smoke` that runs only tests marked with `@smoke`
3. **CI Integration**: Update CI workflow to run smoke tests on feature branches, full tests on master

### Test Files to Update

Based on package.json scripts, mark smoke tests in:
- `test-intent.ts` - Core BAML intent detection
- `test-ashley.ts` - Basic Ashley functionality  
- `test-context.ts` - Context handling
- `test-calendar-data-simple.ts` - Simple calendar operations
- `test-speech-formatter.ts` - Speech response formatting

### npm Scripts

```json
{
  "scripts": {
    "test:smoke": "grep -l '@smoke' *.ts | xargs node --loader tsx --test",
    "test:full": "npm run test"
  }
}
```

### CI Workflow Changes

Update `.github/workflows/ci.yml`:
- Feature branches: Run `npm run test:smoke`
- Master branch: Run `npm run test:full`

## Alternatives Considered

### Alternative 1: Separate Smoke Test Files
- **Approach**: Create dedicated `*.smoke.test.ts` files with duplicated test logic
- **Rejected**: Increases maintenance overhead and code duplication

### Alternative 2: Test Configuration Files
- **Approach**: Use Jest/test runner configuration to define test suites
- **Rejected**: Adds complexity and requires learning new configuration syntax

### Alternative 3: Test Categories with Decorators
- **Approach**: Use TypeScript decorators or test framework tags
- **Rejected**: Requires additional dependencies and framework-specific knowledge

## Risks and Mitigations

### Risk 1: Insufficient Coverage
- **Risk**: Smoke tests might miss critical regressions
- **Mitigation**: Carefully select tests covering core user journeys; full tests still run on master

### Risk 2: Maintenance Overhead
- **Risk**: Developers might forget to mark new critical tests as smoke tests
- **Mitigation**: Include smoke test guidelines in PR template and code review checklist

### Risk 3: False Confidence
- **Risk**: Green smoke tests might give false confidence about code quality
- **Mitigation**: Clear documentation that smoke tests are for fast feedback, not comprehensive validation

## Implementation Plan

**Immediate Implementation** (no phases):
1. Mark representative tests with `@smoke` comments in existing files
2. Add `test:smoke` npm script
3. Update CI workflow for branch-based test execution
4. Test and validate smoke test execution

## Success Metrics

- CI feedback time reduced from current duration to <3 minutes for smoke tests
- Smoke tests cover core functionality with 2-3 tests per major component
- Full test suite continues to run on master branch for comprehensive validation
- Developer satisfaction with faster feedback loop