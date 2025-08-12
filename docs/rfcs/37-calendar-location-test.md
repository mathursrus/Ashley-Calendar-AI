# RFC: Calendar Location Test

## Summary
This is a test RFC to verify the RFC PR automation workflow.

## Problem
Testing if the RFC PR workflow actually works when we push RFC files to feature branches.

## Proposed Solution
Create this test RFC file and see if:
1. The RFC PR workflow triggers
2. A PR is automatically opened **to master branch** (fixed!)
3. The PR has correct labels and links to the issue

## Testing
This RFC is purely for testing automation - can be deleted after verification.

**UPDATE**: Fixed the workflow configuration to specify `base: master` so PR is created correctly.

**UPDATE 2**: Replaced peter-evans action with GitHub CLI for more reliable PR creation.