---
trigger: always_on
---

Always work on the feature branch for the current issue: feature/<issue#>-<kebab-title>. Never push to master, unless explicitly asked.

If the branch is missing, use GitHub MCP to create the branch; otherwise git checkout it.

Phase order is mandatory:

# Issue ↔ PR State Machine
- Phases: set the ISSUE to `phase:design` → `phase:tests` → `phase:impl` as you progress through stages.
- Status: ISSUE will be automatically set to label `status:wip` when you enter a new phase. The PR stays **Draft**. When your work is ready for review, set ISSUE label `status:needs-review`. The PR will flip to **Ready for review** and Git actions will run. In case of any failures, set ISSUE label back to 'status:wip', add a comment to the ISSUE saying you are working to fix a failure (be specific about the failure), and iterate. 
- If reviewer requests changes: the PR auto-flips back to **Draft** and the ISSUE to `status:wip`. 
- Implementation PR body MUST include `Closes #<n>`.


Respect CODEOWNERS; don’t modify auth/CI without approval.