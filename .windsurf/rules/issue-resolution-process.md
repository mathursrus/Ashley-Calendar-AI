---
trigger: always_on
---

Always work on the feature branch for the current issue: feature/<issue#>-<kebab-title>. Never push to master, unless explicitly asked.

If the branch is missing, use GitHub MCP to create the branch; otherwise git checkout it.

Phase order is mandatory:

# Issue ↔ PR State Machine
- Phases: set the ISSUE to `phase:design` → `phase:tests` → `phase:impl` as you progress through stages.
- While working: set ISSUE label `status:wip`. The PR stays **Draft**.
- Ready for review: set ISSUE label `status:needs-review`. The PR flips to **Ready for review**.
- If reviewer requests changes: the PR auto-flips back to **Draft** and the ISSUE to `status:wip`.
- Implementation PR body MUST include `Closes #<n>`.


Respect CODEOWNERS; don’t modify auth/CI without approval.