# Agent Kickoff Comment Template

Copy and paste this into feature issues to guide the development workflow:

---

🛠️ **Agent kickoff plan**

**Phase 1 — Design RFC**
- [ ] Work on branch: `feature/<issue#>-<slug>`
- [ ] Add `/docs/rfcs/<issue#>-<slug>.md` (use RFC template)
- [ ] Push to open **Design PR** (labels: type:design, needs:review)

**Phase 2 — Test Plan**
- [ ] Add `/docs/testplans/<issue#>-<slug>.md` (use Test Plan template)
- [ ] Push to open **Test Plan PR** (labels: type:test-plan, needs:review)

**Phase 3 — Implementation**
- [ ] Update OpenAPI/types as needed
- [ ] Code + tests to satisfy the Test Plan
- [ ] Open **Implementation PR** (label: type:feature)

**Phase 4 — Wrap-up**
- [ ] Docs/README updated
- [ ] Close issue once merged
