# Interview preparation

## Five technical questions

1. **Why does a pending photo detection never reach the generator, even if the browser submits forged flags?** Walk from session-derived identity through owned-property loading to the explicit context projection. Show the provider-spy integration test. Explain why prompting alone is insufficient.
2. **What happens if an agent changes the price or rejects a feature while the AI request is still running?** Explain property row locks, short transactions, the evidence-version comparison after the external call, and the 409 response. Contrast this with the editor revision check for two-tab saves.
3. **Why separate generation and claim validation, and what can your validator still get wrong?** Demonstrate compound claim extraction, exact evidence support, false-positive paraphrases, missed euphemisms and the need for human review. Do not claim a measured accuracy rate.
4. **How do you prevent cross-user access for nested resources and photo downloads?** Trace ownership through property/photo/feature/generation IDs, same-property relationship checks, and session expiry. Explain why returning 404 helps avoid resource enumeration and why RLS remains possible defense in depth.
5. **How would this design change for many agents, multiple servers and unreliable AI providers?** Discuss private object storage, durable jobs, idempotency, pagination, rate/spend budgets, observability, retention, and transactions versus external storage side effects. Explain what is implemented today and what is future work.

## Code to understand deeply before presenting this project

- `src/server/auth.ts`: scrypt salt/hash format, timing-safe verification, random bearer tokens versus stored digests, expiry/revocation, Origin/SameSite defenses, and the limits of database counters.
- `src/app/api/[...path]/route.ts` and `src/server/http.ts`: server-derived identity, method routing, request-body bounds, input parsing, safe error handling, and response redaction.
- `src/server/service.ts`: ownership boundaries, locking, evidence invalidation, upload cleanup, generation commits, optimistic revisions, READY gates, and feedback attribution.
- `src/server/ai/grounding.ts`: explicit data projection, VERIFIED-only filtering, catalog membership and omitted private notes.
- `src/server/ai/claims.ts`: sentence/atom extraction and exact normalized evidence matching. Be able to demonstrate a supported fact, an unsupported renovation, a false-positive paraphrase and a marketing-safety flag.
- `src/server/ai/provider.ts`: provider interface, deterministic mock limitations, live request shape, timeouts, redirect policy and response validation.
- `src/server/storage/index.ts`: MIME versus decoded format, pixel limits, re-encoding/EXIF removal, private key/path handling and the impossibility of atomic filesystem/database commits.
- `prisma/schema.prisma` and migrations: ownership chain, composite photo/property FK, decimals, indexes, cascades, snapshots, review states, and database constraints.
- `tests/workflow.integration.test.ts`: actual PostgreSQL authorization attempts and the critical provider-boundary test. Understand test isolation and cleanup, not just the test count.
- `tests/browser/workflow.spec.ts`: production-server workflow and desktop/mobile validation. Know how a browser test caught a label-association problem.
- `scripts/apply-migrations.ts` and engineering decisions: why the fallback exists, advisory locks/checksums/transactions, and which Prisma migration capabilities it does not replace.

Be able to modify a real invariant and predict which test fails. If you cannot yet explain or debug a module, study it and reproduce the workflow before representing it as your own technical expertise. Be candid about AI assistance and about the absence of production users, a live provider evaluation, external security review or performance measurements.
