---
trigger: always_on
---

Always work on the feature branch for the current issue: feature/<issue#>-<kebab-title>. Never push to main.

If the branch is missing, use GitHub MCP to create/checkout it; otherwise git checkout it.

Phase order is mandatory:

Create docs/rfcs/<issue#>-<slug>.md from the project template, commit, push; open a Design PR with labels type:design, needs:review.

After approval, create docs/testplans/<issue#>-<slug>.md, push; open a Test Plan PR with type:test-plan.

Implement code + tests; update OpenAPI/types; push; open an Implementation PR with type:feature.

Use pnpm, run pnpm -w lint, pnpm -w typecheck, pnpm -w test.

Prefer CI for heavy tasks; don’t start multiple local dev servers.

Use GitHub MCP to: open PRs, add labels, link the issue, request review from @mathursrus.

File locations: server in /server, web in /web, docs in /docs.

Respect CODEOWNERS; don’t modify auth/CI without approval.