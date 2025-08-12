# GitHub Issue: Repository Automation Enhancements

**Title**: Incremental Improvements to Repository Automation & Guardrails

## Description

Following the implementation of core repository automation from Issue #28, this issue tracks incremental improvements to enhance the developer experience and Ashley-specific workflow optimizations.

## Current State

✅ **Implemented in Issue #28:**
- Auto branch creation on issue open/label
- RFC and Test Plan PR automation
- CI pipeline with lint/typecheck/tests
- Implementation PR guard for test requirements
- CODEOWNERS and branch protection
- Standard labels and templates

## Enhancement Requests

### 1. Enhanced Branch Naming
**Problem**: Long issue titles can create unwieldy branch names that cause Git issues
**Solution**: Implement branch name length limits
```yaml
# Current: feature/${issue.number}-${issue.title, kebabcase}
# Proposed: feature/${issue.number}-${issue.title, kebabcase, maxLength=50}
```

### 2. Ashley-Specific Test Detection
**Problem**: Guard script uses generic test patterns, may miss Ashley's specific test files
**Solution**: Enhance test detection patterns
```bash
# Add to ensure-tests-present.sh:
if [[ "$f" =~ (test-.*\.ts$|.*\.test\.ts$|tests/.*\.ts$|.*\.spec\.ts$) ]]; then
```

### 3. Domain-Specific Labels
**Problem**: Generic labels don't capture Ashley's unique architecture components
**Solution**: Add Ashley-specific labels
```bash
mklabel "area:baml" "ff9999" "BAML model changes"
mklabel "area:voice" "99ff99" "Voice/Siri integration"  
mklabel "area:n8n" "9999ff" "n8n workflow changes"
mklabel "area:email" "ffff99" "Email processing/parsing"
mklabel "area:calendar" "99ffff" "Calendar integration/scheduling"
```

### 4. Deployment Automation
**Problem**: Manual deployment process after implementation PRs merge
**Solution**: Add automated deployment workflow
```yaml
# .github/workflows/deploy.yml
# Auto-deploy to staging when implementation PRs merge to main
```

### 5. GitHub Issue Templates
**Problem**: Inconsistent issue creation format
**Solution**: Add structured issue templates
```markdown
# .github/ISSUE_TEMPLATE/feature.md
# .github/ISSUE_TEMPLATE/bug.md
# .github/ISSUE_TEMPLATE/enhancement.md
```

### 6. BAML Model Validation
**Problem**: BAML model changes need special validation
**Solution**: Add BAML-specific CI checks
- Syntax validation for .baml files
- Model compilation tests
- Integration tests for model changes

### 7. Voice Integration Testing
**Problem**: Voice/Siri features need specialized testing
**Solution**: Add voice-specific test requirements
- Speech-to-text accuracy tests
- Response time validation
- Siri Shortcuts integration tests

## Implementation Priority

### High Priority (Next Sprint)
- [ ] Enhanced branch naming with length limits
- [ ] Ashley-specific test detection patterns
- [ ] Domain-specific labels

### Medium Priority (Next Month)
- [ ] GitHub issue templates
- [ ] BAML model validation in CI
- [ ] Deployment automation

### Low Priority (Future)
- [ ] Voice integration testing framework
- [ ] Advanced analytics on workflow efficiency
- [ ] Integration with external project management tools

## Acceptance Criteria

### For Enhanced Branch Naming:
- [ ] Branch names truncated to reasonable length (≤50 chars after feature/)
- [ ] No Git errors due to long branch names
- [ ] Branch names remain descriptive and readable

### For Ashley-Specific Labels:
- [ ] All new labels created and available
- [ ] Labels automatically applied based on file paths changed
- [ ] Documentation updated with label usage guidelines

### For Test Detection:
- [ ] Guard script recognizes all Ashley test patterns
- [ ] No false positives or negatives in test detection
- [ ] Test coverage reports include all test files

## Benefits

- **Improved Developer Experience**: Better branch names, clearer labels
- **Ashley-Specific Optimization**: Workflows tailored to project architecture
- **Enhanced Quality Gates**: Better test detection and validation
- **Streamlined Deployment**: Automated deployment reduces manual overhead

## Technical Considerations

- Maintain backward compatibility with existing workflows
- Ensure new features don't break current automation
- Test all changes in feature branch before merging
- Update documentation for any new processes

## Related Issues

- Issue #28: Core repository automation implementation
- Future issues for specific enhancements as they're prioritized

---

**Labels**: `type:enhancement`, `area:infra`, `needs:review`, `risk:low`
**Assignee**: @mathursrus
**Milestone**: Repository Automation Phase 2
