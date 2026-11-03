# Contributing to Listly AI

Read README.md and docs/AI_SAFETY.md first. Use Node 22.12+, a dedicated development database and `.env.example`. Do not commit `.env`, API keys, database snapshots, private photos, generated build output or user data.

Keep UI, route handlers, business services, evidence projection, AI providers and storage separate. Never trust a browser userId. All nested resources must be scoped through the owned property. A photo detection must start PENDING; generation context accepts only VERIFIED catalog labels. Do not bypass these rules to make a demo smoother.

For a change:

1. Describe the real behavior and which trust boundary it affects.
2. Add focused tests for changed invariants and failure cases, not implementation mirrors or a target test count.
3. Use `npm run format`, `npm run lint`, `npm run typecheck`, and `npm run test:all` with a disposable `_test` database.
4. Run a production build and browser tests for workflow/UI changes. See README for Chromium setup.
5. Add a new migration for schema changes; never edit applied SQL. Review cascade/data-retention implications. Do not reset someone else's database.
6. Update relevant design/limitations documentation. Distinguish measured evidence from assumptions.

Keep PRs focused. Explain the problem, resulting behavior, test evidence and material limitations. Never claim model accuracy, legal compliance, customer usage or performance without supporting evaluation. Report security issues privately to the repository maintainer through an available private channel; do not publish credentials or exploit details in a public issue.
