# RFC: Calendar Invite Location Enhancement - Test

## Issue
Issue #37: Calendar invites sent by Ashley should either have a physical location or a Google Meet link

## Summary
Test RFC to verify the fixed RFC PR workflow using GitHub CLI instead of peter-evans action.

## Background
This is a test file to verify that the RFC PR workflow fix is working correctly.

## Proposal
Verify that:
1. RFC PR workflow triggers on push to docs/rfcs/**
2. GitHub CLI creates PR successfully 
3. No "base and branch must be different" error occurs
4. PR is created with correct labels and linking

## Success Criteria
- RFC PR workflow completes successfully
- PR is created automatically
- Workflow uses updated GitHub CLI approach

---
*This is a test file to verify workflow fixes*