# RFC: Smoke Test Suite for Faster CI Feedback

Issue: #44  
Owner: Cascade

## Problem & Goals

**Problem**: Running all test cases for every checkin creates significant overhead, slowing down the development feedback loop and CI pipeline execution time.

**Goals**:
- Reduce CI execution time for feature branches while maintaining comprehensive testing on master
- Provide faster feedback to developers (target: ~3 minutes vs current full suite)
- Maintain high confidence in code quality and regression detection
- Keep implementation simple and maintainable

## Design Proposal

### Simple Approach: Mark Existing Tests as Smoke Tests

Instead of creating new test files or complex configurations, we'll mark representative test cases in existing test files with a `@smoke` comment tag.

**Example**:
```typescript
// @smoke - Core intent detection
test('should detect meeting creation intent', () => {
  // existing test code
});
```

### Implementation Details

1. **Test Selection Strategy**: Mark 2-3 representative tests per existing test file that cover:
   - Core functionality paths
   - Critical business logic
   - Common user scenarios
   - Integration points

2. **Target Test Files**:
   - `test-intent.ts` - Intent detection and parsing
   - `test-ashley.ts` - Core Ashley functionality
   - `test-context.ts` - Context understanding
   - `test-calendar-data-simple.ts` - Calendar operations
   - `test-speech-formatter.ts` - Output formatting

3. **NPM Script Addition**:
   ```json
   {
     "scripts": {
       "test:smoke": "npm test -- --grep '@smoke'"
     }
   }
   ```

4. **CI Workflow Updates**:
   - Feature branches: Run smoke tests only
   - Master branch: Run full test suite
   - Pull requests: Run smoke tests initially, full tests on merge

### Expected Coverage

The smoke test suite will provide:
- **Functional Coverage**: ~15-20% of total tests covering ~80% of core functionality
- **Execution Time**: ~3 minutes (vs 10+ minutes for full suite)
- **Confidence Level**: High confidence in core functionality, basic regression detection

## Alternatives Considered

### Alternative 1: Separate Smoke Test Files
- **Pros**: Clear separation, easier to manage
- **Cons**: Code duplication, maintenance overhead, potential drift from main tests
- **Decision**: Rejected due to maintenance complexity

### Alternative 2: Test Categories with Jest Tags
- **Pros**: More sophisticated categorization
- **Cons**: Requires Jest configuration changes, more complex setup
- **Decision**: Rejected for simplicity; comment-based approach is sufficient

### Alternative 3: Parallel Test Execution
- **Pros**: Faster execution of full suite
- **Cons**: Doesn't solve the fundamental problem of running unnecessary tests
- **Decision**: Complementary approach, but doesn't replace need for smoke tests

## Risks & Mitigation

### Risk 1: Insufficient Coverage
- **Mitigation**: Carefully select representative tests covering critical paths
- **Monitoring**: Track smoke test failures vs full test failures to adjust selection

### Risk 2: Smoke Test Maintenance
- **Mitigation**: Use simple comment-based marking, minimal overhead
- **Process**: Review smoke test selection quarterly

### Risk 3: False Confidence
- **Mitigation**: Always run full tests on master branch
- **Process**: Monitor production issues and adjust smoke test selection accordingly

## Implementation Plan

### Phase 1: Immediate (Week 1)
1. Mark representative tests with `@smoke` comments in existing files
2. Add `test:smoke` npm script
3. Test smoke test execution locally

### Phase 2: CI Integration (Week 1)
1. Update GitHub Actions workflow for branch-based test execution
2. Test workflow with feature branch
3. Monitor execution times and coverage

### Phase 3: Monitoring & Optimization (Ongoing)
1. Track smoke test effectiveness
2. Adjust test selection based on failure patterns
3. Optimize execution time further if needed

## Success Metrics

- **CI Time Reduction**: Feature branch CI time reduced from 10+ minutes to ~3 minutes
- **Developer Feedback**: Faster feedback loop for developers
- **Quality Maintenance**: No increase in production issues
- **Test Reliability**: Smoke tests catch 80%+ of regressions that full tests would catch

## Test Plan

### Smoke Test Selection Validation
1. Run smoke tests on known good commits - should pass
2. Run smoke tests on commits with known regressions - should fail appropriately
3. Compare smoke test results vs full test results over 1-2 weeks

### CI Workflow Testing
1. Create test feature branch and verify smoke tests run
2. Merge to master and verify full tests run
3. Test workflow with both passing and failing scenarios

### Performance Validation
1. Measure baseline CI execution times
2. Measure smoke test execution times
3. Validate 3-minute target is achievable

## Conclusion

This RFC proposes a simple, maintainable approach to implementing smoke tests that will significantly reduce CI overhead while maintaining code quality. The comment-based marking system avoids architectural complexity while providing the flexibility to adjust test selection as needed.

The implementation is low-risk and can be rolled out incrementally, with immediate benefits for developer productivity.