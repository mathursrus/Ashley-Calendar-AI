---
description: Start working on the issue
---

Step 1: Ask for {issue_number} (and optional {slug}); confirm target branch feature/{issue_number}-{slug}.

Step 2: Using GitHub MCP, ensure the branch exists (your GitHub Action will usually auto-create it) and checkout it.

Step 3: Create docs/rfcs/{issue_number}-{slug}.md from docs/rfcs/RFC-TEMPLATE.md; commit & push.

Step 4: Open Design PR with labels type:design, needs:review; link #{issue_number} and request review from @mathursrus.

Step 5: After approval, create docs/testplans/{issue_number}-{slug}.md from template; commit & push.

Step 6: Open Test Plan PR with type:test-plan, needs:review; request review.