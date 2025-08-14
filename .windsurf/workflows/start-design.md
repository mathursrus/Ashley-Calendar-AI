---
description: Start working on the issue
---

Step 1: Ask for {issue_number} (and optional {slug}); confirm target branch feature/{issue_number}-{slug}.

Step 2: Using GitHub MCP, ensure the branch exists (your GitHub Action will usually auto-create it) and checkout it.

Step 3: Label the issue 'phase:design' and 'status:wip' (remove `status:needs-review` if present)

Step 4: Push RFC stub if missing  at docs/rfcs/<#>-<slug>.md; commit & push if missing. Let Actions open/refresh a **Draft Design PR** (bot authored). Return links to the branch and PR. 

Step 5: Continue the rest of the work headless

 - Create docs/rfcs/{issue_number}-{slug}.md from docs/rfcs/RFC-TEMPLATE.md ... make sure to deeply think through each section

 - Flip issue to 'status:needs-review' and remove 'status:wip'

Step 6: If PR requires additional work, do it. After PR approval, commit & push, close the PR