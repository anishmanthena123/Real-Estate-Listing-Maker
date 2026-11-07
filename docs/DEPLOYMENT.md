# Deployment

No public deployment has been performed. Local production build/browser validation is not a hosting or recovery test.

## Render deployment

The repository now includes a deployment blueprint. Follow [RENDER_SETUP.md](RENDER_SETUP.md) to create an account, connect this repository, securely supply the AI key, review hosting costs, and launch the full app. This is prepared configuration, not evidence of a completed public deployment.

## Recommended target

A persistent Node.js host/container plus managed PostgreSQL is the simplest fit for the current local-storage implementation. Node 22.12+ is required; Node 24 was used in validation. Do not deploy local photos to an ephemeral serverless filesystem. For multiple instances or serverless hosting, first implement private object storage behind PhotoStorage.

## Release steps

1. Provision PostgreSQL with TLS, backups and a tested restore path. Use separate application and migration credentials with appropriate least privilege. Review the committed SQL before applying it.
2. Provision a persistent private directory for photos, writable only by the application user. It must not be served by a static web server. Back it up consistently with database metadata.
3. Configure `DATABASE_URL`, HTTPS `APP_ORIGIN`, private `STORAGE_DIR`, and `MOCK_AI`. Never set `ALLOW_LOCAL_HTTP=true` on a public deployment. Do not expose a local Compose database port publicly.
4. Run `npm ci`, `npm run lint`, `npm run typecheck`, tests against a separate `_test` database, and `npm run build` in CI. Keep test database and credentials separate from production. The CI file contains synthetic local credentials only.
5. Run standard `npm run db:migrate` in a trusted release job with access to verified Prisma engine downloads. In restricted environments the committed SQL fallback `npm run db:migrate:sql` has been validated; review its limitations in ENGINEERING_DECISIONS.md. Never run `prisma migrate reset` on retained data.
6. Start the built application with `npm start` behind HTTPS ingress. Set a bounded request-body limit slightly above the 9 MB application upload envelope and appropriate upstream timeouts. Maintain same-origin routing for `/api`; browser cookies must reach the app normally.
7. Smoke-test two accounts: cross-owner property and photo reads must return 404, unauthenticated APIs must return 401, pending/rejected labels must be absent from generation context, and edits/evidence changes must trigger review.
8. If enabling live AI, securely configure `AI_API_KEY`, HTTPS `AI_BASE_URL`, and a model with text, vision and JSON response support. Authorize the endpoint in environment network settings. Validate real output separately, review provider privacy terms, set account spending limits, and keep mock mode visibly distinguished.
9. Add operational alerts for failed AI calls, database access, rate limits, image processing and orphaned-file cleanup. Establish session/rate-limit cleanup, retention policies and incident handling. Raw request bodies and provider credentials must not enter logs.

## Security work before public onboarding

Email verification, password recovery and MFA/passkeys or a managed identity provider remain unimplemented. Add abuse controls at ingress, review registration volume/cost limits, implement storage reconciliation, and test accessibility with assistive technology. Nonce-based CSP, secret rotation, account/data export/deletion workflows, audit logs and provider data processing terms need deployment-specific review.

## Managed cloud environment

The saved environment draft holds reusable install/start instructions and the optional Prisma engine domain addition. Draft saving does not apply network settings or publish a snapshot. Review and save the draft in environment settings, then publish the environment. Running services must be restarted in future tasks; startup instructions use the existing checkout and do not create worktrees.
