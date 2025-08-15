---
description: Implement issue (after test plan approval)
---

Step 1: Ask for {issue_number} (and optional {slug}); confirm target branch feature/{issue_number}-{slug}.

Step 2: Using GitHub MCP, ensure the branch exists (your GitHub Action will usually auto-create it) and checkout it.

Step 3: Label the issue 'phase:impl'. (GitHub Action will automatically label the issue `status:wip`, create a draft PR)

Step 4: Return control back to the user with the information in the headless defaults rule.

Step 5: Continue the rest of the work headless

 - Review the design plan and test cases associated with this issue. 

 - Determine whether changes need to be made to existing code, or brand new code needs to be written.

 - Write the minimal set of code that makes the test cases for this issue pass.

 - Run the test cases to ensure they pass.

 - Flip issue to 'status:needs-review' and remove 'status:wip'

Step 6: If workflow actions or reviewer feedback indicates more work is needed, ensure the issue is set back to `status:wip` and continue working as above. If all is good, mark the issue with label `status:complete`