---
description: Start writing tests
---

Step 1: Ask for {issue_number} (and optional {slug}); confirm target branch feature/{issue_number}-{slug}.

Step 2: Using GitHub MCP, ensure the branch exists (your GitHub Action will usually auto-create it) and checkout it.

Step 3: Label the issue 'phase:tests'. (GitHub Action will automatically label the issue `status:wip`, create a draft PR)

Step 4: Return control back to the user with the information in the headless defaults rule.

Step 5: Continue the rest of the work headless

 - Review the test plan associated with this issue.

 - Determine whether tests need to be added to an existing test suite, or a new one needs to be created.

 - Write the minimal set of test cases that accurately reproduce the issue

 - Run the test cases to ensure they fail

 - Flip issue to 'status:needs-review' and remove 'status:wip'

Step 6: If workflow actions or reviewer feedback indicates more work is needed, ensure the issue is set back to `status:wip` and continue working as above.