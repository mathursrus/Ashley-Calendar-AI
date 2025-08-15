---
description: Resolve issue (once confirmed complete)
---

Ensure branch: feature/{issue}-{slug} is checked out (create if needed).

Commit & push any pending changes.

Sync from origin/master into this branch (merge or rebase), resolve conflicts, push again.

Check the results of GitHub Action that runs the full tests in the cloud.

If they pass: open/update the Implementation PR, label it, and enable auto-merge.

If they fail: no PR is opened/updated; fix, push again, repeat.

Close the issue.
 
Say Hoorah ! 