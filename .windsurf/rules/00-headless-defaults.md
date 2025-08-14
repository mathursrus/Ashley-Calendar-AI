---
trigger: always_on
---

# Quiet + Headless Execution (Global)

Goal: Do short, atomic runs that create/refresh external artifacts (branches, commits, PRs, labels), then STOP. Do not narrate internal reasoning.

Behavior
- Do NOT stream thoughts, plans, or step-by-step narration. No ellipses. No “I’m going to…”.
- Use GitHub MCP only (remote ops). Never touch local FS or run local servers.
- Produce at most 5 bullet points:
  1) Actions executed (imperative, past tense)
  2) Artifacts (links to PR/branch/checks)
  3) Status (success/failure + one-line error if any)
  4) Next command(s) I can run (slash workflow names)
  5) Open questions (if truly blocking)

Stop Criteria
- As soon as the artifact(s) exist (branch, commit, PR/labels updated), end the run.
- Do NOT wait for CI to finish. Link to the checks page instead.

Output Template (use verbatim)
- Summary:
  - …
  - …
- Artifacts:
  - Branch: <url>
  - PR: <url>
  - Checks: <url>
- Next:
  - Let user know when step is complete
- Notes:
  - (only if needed, 1–2 bullets)