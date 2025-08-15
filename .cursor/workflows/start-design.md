---
description: Start working on the issue
---

Step 1: Ask for {issue_number} (and optional {slug})

Step 2: Label the issue 'phase:design' (GitHub Action will automatically create a branch, label the issue `status:wip`, create a draft PR)

Step 3: Using GitHub MCP, wait for the branch to get created, then do a checkout to start your work

Step 4: Return control back to the user with the information in the headless defaults rule.

Step 5: Continue the rest of the work headless

 - Create docs/rfcs/{issue_number}-{slug}.md from docs/rfcs/RFC-TEMPLATE.md ... make sure to deeply think through each section. Keep it simple. 

 - When ready for review, flip issue to 'status:needs-review' and remove 'status:wip'

Step 6: If workflow actions or reviewer feedback indicates more work is needed, ensure the issue is set back to `status:wip` and continue working as above.