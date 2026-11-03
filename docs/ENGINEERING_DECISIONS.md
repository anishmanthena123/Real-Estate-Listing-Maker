# Engineering decisions

## Start from the available repository

The selected repository had no source files or Git refs. The user explicitly authorized a new application after the audit. There was no existing working stack to preserve. Next.js/React/TypeScript gives one deployable application; PostgreSQL and Prisma provide relational constraints and migrations without introducing microservices.

## Human verification before photo evidence

Image models detect appearances, not provenance or physical truth. A stainless-looking surface may not be stainless steel, and new-looking cabinetry does not establish renovation. Every detection starts PENDING. A server-owned context projection requires explicit VERIFIED status. This creates a testable boundary even if the UI is bypassed. Agent verification still has limitations; it is a recorded trust decision, not independent certification.

## Separate generation from validation

A generation model's fluency or self-confidence does not establish support. The provider receives limited evidence; a separate deterministic checker compares the output to that evidence. This does not eliminate hallucinations, but makes failures inspectable. The original text and original context snapshot remain immutable while edits receive current validation. A later semantic validator can replace the checker without widening the provider's input permissions.

## Conservative extraction rather than unsupported accuracy claims

The initial validator supports exact normalized atomic statements and flags unknown paraphrases. This is less convenient than an entailment model but cheap, reproducible and transparent. It intentionally does not approve a whole sentence just because one phrase matches a feature. There is no performance/accuracy claim without evaluation. The cost is false positives and less natural copy in mock mode.

## Server-side authorization

Browser state and supplied user IDs are attacker-controlled. The server derives identity from a random session cookie and looks up the user/expiry in PostgreSQL. Every property operation and nested resource checks the owned property. Per-property locking queries include ownership. Normalized UUID validation prevents malformed IDs from becoming database cast errors. Tests use two real users and attempt every sensitive operation across ownership boundaries.

The project does not use PostgreSQL RLS; the application service is the ownership enforcement layer. Adding RLS would offer defense in depth but needs careful pooling/session context design. It should not be claimed as present.

## Authentication choice

Opaque database sessions provide immediate revocation without JWT key rotation or bearer token storage in localStorage. Token digests protect stored sessions if the database is read. Salted scrypt is available in Node and avoids a custom password primitive. HttpOnly/SameSite cookies plus strict Origin checks protect the browser mutation surface. Database counters survive multiple app instances.

This is a small first-party authentication implementation, not a complete identity product. Before public use add verification, recovery, MFA/passkeys or replace it with a managed provider. Authentication does not prove a user is a licensed agent. Counters keyed by email/user/global scope are basic abuse controls, not complete bot or distributed denial-of-service protection.

## Provider abstraction and MOCK_AI

`AIProvider` exposes generation and photo-analysis capabilities. Both real and mock implementations pass through the same verification and persistence path. Mock mode enables local development, CI and deterministic failure tests without credentials, variable output or cost. It is explicitly labeled and does not pretend to analyze photos or simulate writing quality. The live adapter uses a standard chat-completions shape, bounded response schemas, HTTPS, timeouts and no redirects. Capability differences among compatible providers remain an integration risk.

## Human review and evidence freshness

Even supported statements can be inappropriate or based on bad input. All generations start NEEDS_REVIEW. READY requires explicit human acknowledgement and no unresolved detected claims. Evidence changes invalidate review status. Database row locks and evidence versions prevent a network call from committing stale context. Content revisions reject concurrent tab overwrites. These controls serve different purposes and are tested separately.

## Storage abstraction

PhotoStorage isolates byte persistence from the workflow. The local adapter is suitable for a single persistent host and automated tests. It uses random keys, private directories, authenticated reads, decoded/re-encoded static images and stripped EXIF. A production object-store adapter can implement the same contract. Filesystem and database operations cannot be atomic together; failed cleanup logs an operator action and may leave orphaned files. A reconciliation worker is future work.

## Prisma engine and migration tradeoff

Prisma's stable JavaScript PostgreSQL runtime avoids native query-engine artifacts. Client generation uses Prisma's JS schema configuration so no unverifiable download bypass is needed. Native Prisma Migrate remains the preferred schema-development/deployment tool when its engine host is available.

During setup, `binaries.prisma.sh` was blocked by policy. The optional Prisma 6 JavaScript migration engine was investigated but failed to deserialize PostgreSQL's `name` type during migration initialization. We did not modify vendor code or disable checksums/TLS. The SQL fallback applies only committed migration SQL, obtains an advisory lock, checks SHA-256 checksums, uses per-migration transactions, and writes Prisma-compatible migration records. Repeat runs were exercised. It does not generate migrations, introspect drift, repair history, or support nontransactional SQL such as CREATE INDEX CONCURRENTLY. Do not silently extend it to those cases.

A patched `deepmerge-ts` transitive override addresses a published advisory affecting Prisma configuration tooling. Keep dependency audit, client generation, type checks and migrations in validation when changing it. A major Prisma upgrade should be a deliberate follow-up rather than an unreviewed forced audit fix.

## Scale and operational boundaries

One process can serve this initial application. It has finite history/list sizes, synchronous AI requests and local storage. We avoided a queue, microservices and elaborate RBAC before they were needed. Production at meaningful load will need pagination, durable jobs, idempotency/spend budgets, managed storage, observability, least-privilege credentials and backup/restore exercises. No throughput or usage figures have been invented.

## Dependency audit scope

The production dependency graph reports no advisories after the configuration-tool patch. Vitest was upgraded to resolve critical test-tool findings. Moderate minimatch advisories remain under development lint tooling. Tooling operates on trusted repository files in CI/local development and must not be exposed as a network service. This reduces exposure but does not erase the advisories; continue tracking upstream patches and avoid unsupported forced version changes.
