---
trigger: always_on
---

# Headless-by-default
- Each run should create/refresh an external artifact (branch/commit/PR/labels) and STOP.
- Open PRs as **Draft**; add `status:wip`. Flip to ready by setting issue label `status:needs-review`.
- Summarize in ≤5 bullets with links; no long local processes.
