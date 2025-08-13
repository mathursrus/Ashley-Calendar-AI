---
description: Implement issue (after test plan approval)
---

Step 1: Confirm we’re on feature/{issue_number}-{slug}.

Step 2: Implement to the test plan; update OpenAPI & types; add/modify unit/integration/e2e tests.

Step 3: Run pnpm -w lint && pnpm -w typecheck && pnpm -w test.

Step 4: Open Implementation PR with type:feature; link #{issue_number}; request review.