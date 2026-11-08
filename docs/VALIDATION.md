# Validation and remaining risks

## Executed evidence

The repository started empty. Validation uses the actual PostgreSQL schema and a built Next.js production server; this is not a static UI mockup.

- Unit and PostgreSQL integration/API tests: 117 passed in the completed run (73 unit tests and 44 integration tests).
- Production browser workflow: 2 passed, one desktop Chromium and one mobile-viewport Chromium run. This is not testing on physical iOS hardware or Safari.
- Browser coverage includes registration, CRUD creation, real image upload/normalization, pending detections, explicit verification/rejection, provider context exclusions, generated draft editing, claim removal, validation, READY acknowledgement, feedback, dashboard counts, history, property deletion and logout. It checks uncaught page errors and horizontal overflow.
- Lint, strict TypeScript and production build passed in the completed run. The final lint/typecheck/unit/integration/build reruns also passed after the dependency and UI updates.
- Both committed SQL migrations were applied to development and disposable test databases. Repeat application checks existing SHA-256 migration history and does not reset data.
- Dependency audit: zero reported production advisories after the deepmerge-ts patch. Moderate minimatch advisories remain in the development lint dependency graph. Critical test-tool advisories were addressed by upgrading Vitest. No public test/mock server should be exposed.
- Screenshots are from the browser workflow with synthetic fixtures and an explicitly labeled mock provider. They are not evidence of customer usage or visual-model accuracy.

## Diagnosed failures

- Native Prisma engine downloads were blocked by managed network policy. The engine host was added to the environment draft; saving alone does not change runtime access. TLS/checksum verification was preserved.
- Prisma's optional JS migration engine failed on PostgreSQL's `name` type during initialization. The stable engine-free runtime works. A checksummed SQL-only fallback was added; standard native Prisma migration remains available when its host is allowed.
- A storage test exposed a synchronous throw where the asynchronous storage contract should reject; the method was corrected and the test passed.
- A test incorrectly assumed ordering among features with equal creation times; it now checks the reviewed feature by ID.
- Browser testing exposed an ambiguous wrapped-textarea label; explicit label/ID association fixed it and both browser projects passed.
- No live AI key is configured; real provider output quality, image detection accuracy, latency and cost remain unmeasured. No public deployment, CI-hosted execution, publication or fresh-task restoration has been claimed.

## Remaining deployment/security concerns

1. Add managed identity or email verification, password recovery and MFA/passkeys before public onboarding.
2. Replace private local files with private object storage for ephemeral/multi-instance hosting; add orphan reconciliation, retention and backup/restore validation.
3. Keep protected-class review human-led. Exact-match validation has limited language/claim coverage and cannot independently verify user facts or agent honesty.
4. Add ingress abuse controls, durable jobs, idempotent retries and provider spending budgets before significant load.
5. Apply least-privilege database roles, TLS, trusted origin configuration, secret rotation, secure operational logging, and scheduled session/rate-limit cleanup.
6. Review the remaining development-only dependency advisories and plugin compatibility during routine updates; do not force incompatible major upgrades merely to suppress audit output.
7. UI pagination/search beyond the latest 200 properties and 100 generations per property remains unimplemented.
8. No independent security, accessibility, legal-compliance, performance or AI-accuracy evaluation has been performed.

## Hosting preparation follow-up

The Render deployment follow-up passed lint, typecheck, production build, and all 136 unit/integration tests (92 unit tests, including 19 new deployment/readiness cases, plus 44 PostgreSQL integration tests). The deployment YAML's local structure and persistent-disk/secret bindings were checked. The actual production entrypoint was started with an assigned port and explicit mock AI: committed migrations were recognized as already applied, `/api/health` returned 200 with only an ok status, and `/api/me` returned 401 without a session. This smoke test did not incur AI calls. Render-side provisioning/schema validation, public URL verification and live provider validation remain pending the user's hosting account, paid-resource review and secure API-key entry. Follow RENDER_SETUP.md.

## Static portfolio demo follow-up

The demo follow-up passed lint, typecheck, both the static demo and full Next.js production builds, and all 141 unit/integration tests (97 unit tests and 44 PostgreSQL integration tests). Two additional desktop/mobile static-demo browser workflows passed at the actual GitHub Pages repository subpath. They verify feature verification and exclusion, unsafe-claim flags, READY review gates, evidence revocation, history, feedback, reload reset, no API requests and no horizontal overflow. Screenshots are from those synthetic-fixture runs. Public GitHub Pages availability and GitHub-hosted workflow results are separate from local validation; a one-time owner Pages setting may still be required because the development connection did not provide Pages administration access.

## Address entry and picture import follow-up

The follow-up passed lint, typecheck, static demo build, full production build and all 159 unit/integration tests (115 unit and 44 PostgreSQL integration tests). Four static-demo browser runs passed across desktop/mobile. New browser checks exercise arbitrary address entry without fabricated facts, multiple real PNG imports, cross-property preview isolation, pending/verified feature gates, picture removal and readiness invalidation, SVG/oversize rejection, reset and zero API calls. Unit tests cover address matching/validation, unknown facts not supporting numeric claims, MIME/signature/size checks, decode failures, pixel limits and bitmap release. Local tests do not establish live property lookup, live vision analysis or public deployment status.
