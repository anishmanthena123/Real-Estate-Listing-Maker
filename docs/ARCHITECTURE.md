# Architecture

## Scope and trust boundaries

Listly AI is a single deployable Next.js application with a PostgreSQL database and private photo storage. Business logic lives on the server. React provides workflow controls; it has no authority to assign ownership, support claims, or approve evidence on its own.

The browser is untrusted. Route handlers derive user identity from an opaque cookie and database session. Mutating routes require the configured origin. Zod parses untrusted input and strips undeclared identity fields. Application services independently scope properties and nested resources to the session user. A user cannot escape ownership by supplying a photo, feature or generation ID from another property.

AI is another untrusted boundary. Structured data strings are identified as data in system instructions; private notes and unsupported detections are omitted. Provider output is bounded and parsed. Text is never rendered as HTML, executed as instructions, or used to make permission decisions.

## Request paths

1. `api/[...path]/route.ts` dispatches an allowed route/method, checks origin and session, bounds request bytes, and serializes safe responses.
2. `PropertyService` validates inputs, checks ownership, applies transaction boundaries, and delegates to provider/storage interfaces.
3. Prisma with `@prisma/adapter-pg` uses parameterized queries against PostgreSQL.
4. `buildContext` creates a fresh explicit evidence object. Only that object and presentation options reach the listing provider.
5. The claim validator compares text with the same evidence projection.
6. Generation, original/current text, original/current evidence and claim records are committed together.

Private photo reads use a dedicated route. They do not pass through Next image optimization or a public bucket. Images are normalized before storage; originals and EXIF location metadata are not retained.

## Schema overview

| Model           | Responsibility / constraints                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User            | Unique normalized email, salted password hash; owns properties and sessions                                                                             |
| Session         | SHA-256 digest of a random bearer token, user FK, expiry index                                                                                          |
| RateLimit       | Atomic database counters for auth and expensive operations                                                                                              |
| Property        | Owner FK, structured fields, decimal currency/bathrooms, timestamps and evidence version; nonnegative SQL constraint                                    |
| PropertyPhoto   | Private storage key, normalized MIME/size, original display name, analysis timestamp; cascades with property                                            |
| DetectedFeature | Catalog label, photo/property FKs, PENDING/VERIFIED/REJECTED, review timestamp; unique photo/label and composite same-property photo constraint         |
| Generation      | Content type/style/length, original/current text, provider/model, original/current JSON evidence snapshots, evidence version, revision and review state |
| Claim           | Extracted atom and containing sentence, classification, explanation and evidence pointer                                                                |
| Feedback        | Generation FK, ±1 rating, optional comment and reviewed generation revision                                                                             |

Indexes support user/property lookup, status review, and recent history. Child rows cascade on property deletion. Ownership is enforced through the property parent in application queries, not PostgreSQL row-level security. There is no alternate unscoped public repository API.

## State transitions

Features start `PENDING`. Explicit owner actions can set `VERIFIED` or `REJECTED`; decisions may be reversed. Reanalysis of an analyzed photo returns 409 and cannot reset reviewed decisions. Mock suggestions follow the same rules as live detections.

Generations begin `NEEDS_REVIEW` even if every detected claim is supported. Saving as `DRAFT` preserves unresolved work. Saving to review reruns validation. `READY` requires explicit acknowledgement, at least one extracted claim and no flagged results. Editing text always revalidates. Property edits, feature decisions, and photo deletion increment property evidence version and invalidate saved review status.

## Concurrency

A PostgreSQL row lock on the owned property serializes mutations, review and deletion. Ownership is part of the locking query. AI calls happen outside transactions to avoid holding database locks during a network request. On return, the service locks the property and verifies the evidence version has not changed; otherwise it returns 409 and saves no stale generation.

The editor submits an expected generation revision. Each content save increments it; another tab attempting to save an old revision receives 409. Evidence invalidation is orthogonal to content revision: saving always builds context from current evidence inside the lock. A rejected old feature therefore cannot be restored to the prompt by a stale editor.

## External side effects

A filesystem write cannot participate in a database transaction. Uploads authorize before processing, normalize an image, write it under a random key, then commit metadata after rechecking ownership. Failed metadata commits trigger file cleanup. Deletion commits database cascades first, then removes private files. Cleanup failures are logged without secrets and require operator reconciliation. This is a deliberate limitation rather than a claim of distributed atomicity.

## Failure behavior

Validation uses 400, unauthenticated requests 401, origin failures 403, missing/inaccessible owned resources 404, stale state 409, large bodies 413, bad media types 415, limits 429, unavailable AI configuration 503, and provider response/network failures 502. Unknown errors receive a safe message and correlation ID. No raw provider error, SQL connection string, password hash or API key is returned to the client.

The current implementation has bounded pages but no cursor pagination, synchronous providers, and no durable job queue. These are explicit scale limits. Successful local tests do not establish performance at production scale.

## Standalone portfolio demo

`src/demo` is an isolated browser-only React entrypoint bundled with esbuild for free GitHub Pages hosting. It shares the pure evidence projection and claim validator with the server but never imports authentication, database, storage or live provider code. A bundling guard enforces that separation. Fictional sample data and deterministic generation are labeled in the UI; all interaction state is in memory. The static demo provides no security boundary for real property data and does not replace the authenticated application. See PORTFOLIO_DEMO.md for deployment and limitations.

## Address-only records and public-record enrichment

A shared address parser supports the one-field entry UI. Structured address fields remain required; price, bedroom/bathroom counts, area, type and construction year may be null when unknown. The same context builder omits unknown facts, while existing numeric validation and owner scoping stay in force. An additive migration preserves existing records.

The authenticated `/api/property-lookup` controller validates address/origin/session and applies a database-backed per-user limit before a server-only provider adapter queries ATTOM. Its bounded response is mapped to suggestions with source/retrieval metadata. The UI requires review and never autosaves an imported record. Current listing price is not inferred from assessment/AVM/sale data. The existing vision adapter remains independent; detections are PENDING until verified. No live keys or provider clients are bundled in the GitHub Pages demo.
