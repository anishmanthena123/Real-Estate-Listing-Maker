# Listly AI: audit and implementation plan

## Implementation outcome

The user explicitly chose to build Listly AI in the empty repository. The phases below were executed: schema/authentication, property/photos, verification, grounded providers, claim checks, editor/dashboard/history, tests, documentation and final audit. See VALIDATION.md for measured outcomes. The initial audit below is retained as evidence of the starting state, not a current blocker.

## Audit evidence

Selected checkout: `/workspace/Real-Estate-Listing-Maker`.
Selected origin: `anishmanthena123/Real-Estate-Listing-Maker` on GitHub.

- No application files exist in the checkout.
- Local HEAD is an unborn `work` branch. No refs or recoverable commits were found.
- An authenticated read-only `git ls-remote origin` completed successfully and returned no advertised refs. The requested `main` branch is therefore unavailable.
- No package manifest, framework, database, authentication, API routes, components, AI integration, tests, environment template, deployment configuration, or repository agent instructions could be inspected.
- Node v24.19.0 and npm 11.9.0 are installed. No dependencies were installed.
- Managed network policy reports enforced restricted access with package-manager presets and GitHub allowed. Sandboxed requests failed to reach the proxy; the approved outside-sandbox Git read succeeded.
- No secret or runtime-variable bindings are configured in the reported environment.
- No application files or reusable environment configuration have been changed.

These observations establish that the provided source is unavailable; they do not establish anything about the architecture of an existing application elsewhere.

## Decision resolved

The user authorized a new implementation in this empty repository. There was no existing application stack to preserve.

## Provisional implementation plan

This plan must be adapted after inspecting any supplied existing source. For a new implementation, prefer Next.js with strict TypeScript, PostgreSQL, Prisma, and server-side session authentication.

1. Inspect source and preserve existing working behavior; establish baseline checks and document trust boundaries.
2. Implement schema/migrations and server-derived identity. Scope every property and nested-resource operation to its authenticated owner; use non-disclosing not-found responses for inaccessible resources.
3. Implement validated property CRUD and private photo uploads through a storage interface. Validate size, actual image format, ownership, and error cleanup.
4. Store photo detections as PENDING. Record explicit agent verification/rejection and enforce VERIFIED-only context in a server-side context builder.
5. Add mock and OpenAI-compatible providers. Send only an explicit projection of structured property fields and verified features; keep credentials server-side. Treat user text and model responses as untrusted data.
6. Separate generation, claim extraction, and validation. Persist provenance and review results. Revalidate edits and invalidate readiness when evidence changes; never infer that absence of a detected problem guarantees factual or legal correctness.
7. Implement a responsive property workflow, verification queue, content editor, history, feedback, and dashboard using actual stored counts.
8. Test authorization across CRUD/generation/photos, invalid inputs, forged ownership, verification boundaries, provider failures, claim support, review transitions, and secret isolation. Use integration tests against PostgreSQL in addition to focused unit tests.
9. Document architecture, AI safety, decisions, setup, deployment, limitations, and meaningful interview discussion topics. Configure CI, lint, typecheck, formatting, and production build.
10. Run lint, typecheck, tests, production build, and an authenticated functional smoke test. Report executed outcomes and unresolved risks accurately.

## Environment follow-up

After source or implementation exists, execute frozen dependency installation, database initialization, application startup, and representative functional checks. Save tested `install_script` and `start_skill` through the environment draft tools. Future tasks should use the existing isolated checkout and must not create worktrees unless requested. Do not publish or call the environment ready before required validation and startup instructions are complete.
