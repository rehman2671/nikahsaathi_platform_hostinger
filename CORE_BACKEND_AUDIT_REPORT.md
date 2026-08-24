# NikahSaathi Core Backend In-Depth Audit

**Author:** Manus AI  
**Audit date:** 25 August 2026  
**Scope:** Backend, database schema/migrations, tRPC contracts, authentication, safety and privacy enforcement, entitlements, operations workflows, Telegram webhook, storage boundary, Flutter contracts, tests and production build.

## Executive verdict

The current implementation is a **solid operations-foundation milestone**, but it is **not yet a complete app-enabling core backend** for the matrimonial product. The admin console and platform-management policies are substantially implemented, while the user-facing product domain is still absent. Building the end-user website and Flutter applications on top of the current surface without another backend phase would leave the clients unable to create or safely consume profiles, content, conversations, matches, reports, verification submissions and subscription purchases.

The most important distinction is therefore:

> **The operations backend is functional; the matrimonial product backend is not complete.**

A clean typecheck, production build and 49 passing Vitest tests confirm implementation consistency for the existing foundation. They do not prove that the missing product domain, production security controls, default policy data or external deployment boundaries are ready.

## Validation snapshot

| Check | Result | Interpretation |
|---|---:|---|
| TypeScript check | Passed | Existing TypeScript source compiles. |
| Vitest | 12 files, 49 tests passed | Strong unit/authorization coverage for the implemented foundation; not an end-to-end product test. |
| Production build | Passed | Vite frontend and bundled Node server build successfully. |
| Database inspection | 20 expected operations tables present | Migration application is present, but important policy tables are mostly empty. |
| HTTP probes | Public `auth.me` returns 200; protected query returns 401; Telegram health rejects missing secret | Basic route boundaries work. |
| Storage probe | Arbitrary unauthenticated key returns 307 signed redirect | This is a confirmed access-control gap for future private media. |
| Flutter SDK | Not available in the current audit environment | Flutter compilation cannot be independently re-run here; prior repository smoke artifacts are not treated as a substitute for current SDK verification. |
| Dependency audit | 81 vulnerabilities: 21 high, 1 critical | Dependency remediation is a release gate and needs package-by-package triage. |

## Severity-ranked findings

### P0 — Must be resolved before end-user app launch

| ID | Finding | Evidence | Why it blocks the apps | Required remediation |
|---|---|---|---|---|
| P0-01 | **Core matrimonial domain is missing.** There are no persisted user profiles, profile edits, photos, posts, comments, messages, interests, matches, user blocks, reports, verification submissions, notifications, payment records or community posts/messages. | [Schema](drizzle/schema.ts), [router surface](server/routers.ts), [App routes](client/src/App.tsx) | The website and Flutter apps have no authoritative CRUD/search/messaging contracts to call. | Design and migrate the product domain, then expose typed procedures for profile lifecycle, discovery, matching, messaging, reporting, verification and billing. |
| P0-02 | **Safety is not effective by default.** The database inspection found zero rows in `safety_rules` and `plan_entitlements`; the repository contains no seed/bootstrap insert for them. | [Safety tables](drizzle/schema.ts#L23-L77), [Safety lookup](server/db.ts#L101-L105), [database migration sources](drizzle) | `contentSafetyCheck` can evaluate an empty rule set, so bad words, numbers and links will not be blocked on a fresh deployment. | Add versioned, reviewed baseline policy data and a safe startup/health check that refuses “ready” status when required policy configuration is absent. Never silently rely on manual console setup for mandatory safety controls. |
| P0-03 | **No server-authoritative content write path exists.** `contentSafetyCheck` is only a protected query; no post/comment/message/profile write mutation invokes safety evaluation and safe masking/blocking before persistence. | [Safety query](server/routers.ts#L103-L110), [router end](server/routers.ts#L209-L217) | Clients could not create content through a policy-enforcing backend, and any future client-side-only check would be bypassable. | Build transactional write procedures that normalize/evaluate content, apply mask/block/quarantine actions, create cases for high-risk content, and persist only the server-approved result. |
| P0-04 | **Private storage is not access-controlled.** Any caller who knows or guesses a `/manus-storage/{key}` path receives a signed redirect without authentication, ownership, resource-purpose or redaction checks. | [Storage proxy](server/_core/storageProxy.ts#L4-L46), [storage helper](server/storage.ts#L74-L97); confirmed by HTTP probe returning 307 | Profile photos, identity documents and incident evidence cannot safely use this route. | Store media ownership/purpose metadata, require authenticated resource authorization, issue short-lived signed URLs only after policy checks, and separate public, private and restricted evidence namespaces. |
| P0-05 | **Split-host authentication is incomplete.** The client uses credentialed fetches, but the server registers no explicit CORS allowlist/credentials middleware; state-changing cookie-authenticated tRPC calls have no visible CSRF/origin enforcement. | [Client transport](client/src/main.tsx#L40-L70), [server bootstrap](server/_core/index.ts#L32-L47), [cookie policy](server/_core/cookies.ts#L24-L48) | Hosting website and API on different origins can break auth or create cross-site mutation risk. | Define allowed origins, credentialed CORS, trusted proxy handling, CSRF token/origin validation for mutations, cookie-domain strategy and integration tests for same-origin and split-origin deployments. |
| P0-06 | **Flutter safety contract is incompatible with the current API.** Dart expects `highestRisk` and `maskedText`, while `contentSafetyCheck` returns `action`, `matches` and `blockedUrls`. | [Dart contract](clients/flutter/lib/platform_contracts.dart#L36-L49), [server response](server/routers.ts#L103-L110) | The mobile client will silently default/lose safety information and cannot render server decisions reliably. | Choose one canonical safety response, update both contracts, include safe text/explanation where applicable, and add cross-language contract fixtures. |

### P1 — Must be resolved before production scale or sensitive operations

| ID | Finding | Evidence | Risk | Required remediation |
|---|---|---|---|---|
| P1-01 | **Community eligibility is not enforced.** `canJoin` is derived from active status, and `joinCommunity` checks active status/duplicate membership but not the stored eligibility expression, verification state or category rules. | [Router](server/routers.ts#L140-L174), [helper](server/db.ts#L199-L207) | Users can join communities without the intended religion/country/verification eligibility. | Replace free-text eligibility with typed predicates or a policy evaluator, enforce it in the join transaction, and return a server-derived access decision. |
| P1-02 | **Subscription replacement is non-transactional.** Active rows are expired before the replacement insert and audit log complete; concurrent requests can create multiple active subscriptions or leave a user downgraded after failure. | [Subscription helper](server/db.ts#L375-L392) | Entitlements can be incorrect during payment/admin changes. | Use a database transaction, row locking or a unique active-subscription invariant, validate plan status, and add concurrency tests. |
| P1-03 | **Database referential integrity is weak.** The schema has no visible foreign keys and lacks composite uniqueness for memberships, moderator assignments, active subscriptions, evidence and related records. | [Schema](drizzle/schema.ts#L104-L235), [relations](drizzle/relations.ts) | Orphans, duplicates and inconsistent lifecycle state will accumulate as apps create more data. | Add foreign keys/indexes/unique constraints in dependency order and handle existing data before enforcement. |
| P1-04 | **Blind update success.** Support, incident, review, policy, domain and plan updates do not verify target existence or affected-row count. | [DB updates](server/db.ts#L305-L309), [support/incident updates](server/db.ts#L363-L373), [policy/plan updates](server/db.ts#L407-L467) | Clients receive success for stale/deleted IDs; audit logs may describe actions that changed nothing. | Return affected-row metadata or throw `NOT_FOUND`; audit only after a successful state transition. |
| P1-05 | **Telegram retry loss.** The update receipt is claimed before review-case creation, Telegram reply and audit completion. A downstream failure permanently suppresses the retry. | [Webhook](server/telegramWebhook.ts#L31-L52), [claim helper](server/db.ts#L332-L342) | Operator actions can disappear during transient database/Telegram failures. | Add receipt states (`received`, `processing`, `completed`, `failed`), retry/dead-letter handling, bounded attempts and an atomic handoff/outbox design. |
| P1-06 | **No rate limiting or abuse controls are visible.** Auth, safety checks, review creation, community joins and Telegram webhook lack request throttles or mutation idempotency. | [Server bootstrap](server/_core/index.ts#L32-L47), [router](server/routers.ts#L175-L206) | Attackers can spam review queues, expensive safety checks, joins or webhook traffic. | Add per-IP/user/operator limits, mutation idempotency keys, queue quotas and alerting. |
| P1-07 | **Safety normalization can break masking and over-match.** All content removes separators before matching; the normalized match is then replaced in the original text, so obfuscated matches may not be masked. Non-phone rules are also evaluated against distorted text. Runtime regexes have no complexity/timeout policy. | [Safety engine](server/safetyEngine.ts#L28-L60), [masking](server/safetyEngine.ts#L81-L89) | Unsafe content can be blocked inconsistently or survive masking; malicious regexes may consume resources. | Preserve source spans through normalization, make normalization rule-type-specific, validate/limit regex patterns, add adversarial tests and make block decisions fail closed. |
| P1-08 | **High-risk confirmation terminology differs.** Runtime approval requires `APPROVE`, while shared operator guard validation accepts `CONFIRM`. | [Runtime gate](server/approvalPolicy.ts#L14-L21), [shared guard](shared/operatorGuards.ts#L4-L10) | Admin and Telegram clients can show a confirmation that the backend rejects or future code may accidentally weaken the gate. | Define one shared enum/confirmation token and test the UI, Telegram and router against it. |
| P1-09 | **Required secrets do not fail fast.** Environment accessors default critical configuration to empty strings; server startup continues even when database, JWT, OAuth or Forge settings are absent. | [Environment access](server/_core/env.ts#L2-L10), [bootstrap](server/_core/index.ts#L32-L68) | A deployment can appear healthy while auth, storage or persistence is non-functional. | Validate mandatory env values at startup, expose a safe readiness endpoint, and keep secret values out of logs. |
| P1-10 | **Global request body limit is excessive.** A 50 MB JSON parser is applied to all routes, including Telegram webhook. | [Bootstrap](server/_core/index.ts#L32-L40) | Large unauthenticated payloads can consume memory and slow the process. | Apply small route-specific webhook limits and a separate authenticated upload mechanism. |
| P1-11 | **Pagination and filtering are missing.** Review/support/incident lists return only the latest 50 rows with no cursor, status, severity, SLA or ownership filters. | [DB list helpers](server/db.ts#L254-L264), [support/incident lists](server/db.ts#L351-L360) | Operations will miss older or urgent cases as volume grows. | Add cursor pagination, stable ordering, filter inputs and queue-specific indexes. |
| P1-12 | **Dependency audit is not clean.** `pnpm audit --prod --audit-level high` reports 81 vulnerabilities, including 21 high and 1 critical; listed direct paths include outdated Axios, form-data and nanoid versions. | `pnpm audit` result captured during this audit; [package manifest](package.json#L15-L104) | Vulnerable dependencies should not be promoted to production without triage. | Regenerate lockfile with current patched versions, remove unused Axios if possible, rerun audit and document accepted residuals. |

### P2 — Important before public beta

| ID | Finding | Evidence | Required remediation |
|---|---|---|---|
| P2-01 | Endpoints are not documented as a versioned public API. | [Single router](server/routers.ts) | Introduce API versioning/contract generation and deprecation policy before mobile releases. |
| P2-02 | Shared projection request models a client-supplied plan even though the server derives it from the authenticated subscription. | [Shared contract](shared/platformContracts.ts#L15-L22), [server projection](server/routers.ts#L209-L217) | Remove the client plan input and make effective plan server output only. |
| P2-03 | Community and audit data lack privacy minimization/retention policies. | [Community member list](server/db.ts#L234-L240), [audit schema](drizzle/schema.ts#L227-L235) | Define retention, deletion/export, operator access logging and redaction policy. |
| P2-04 | `createHumanReviewCase` is callable by any authenticated user. | [Router](server/routers.ts#L175-L177) | Make it internal-agent-only, subject-scoped, quota-limited or convert user reports into a separate report flow. |
| P2-05 | The live Telegram credential test performs an external network call during the default Vitest suite. | [Credential test](server/telegramCredentials.test.ts#L3-L13), [Vitest config](vitest.config.ts#L1-L16) | Separate live smoke tests from deterministic CI tests and use a controlled integration-test flag. |
| P2-06 | Production startup scans for another port when `PORT` is occupied. | [Bootstrap](server/_core/index.ts#L23-L65) | Bind the supplied port exactly in production and fail clearly if unavailable; keep port scanning development-only. |
| P2-07 | No explicit health/readiness contract checks database, policy configuration, Telegram and storage dependencies. | [Bootstrap](server/_core/index.ts#L32-L68) | Add liveness/readiness endpoints with dependency status that never reveal secrets. |
| P2-08 | Flutter SDK validation is environment-dependent and no CI workflow is present in the repository. | [Flutter package](clients/flutter), [package scripts](package.json#L6-L13) | Add a reproducible Flutter CI job or documented SDK container once client development starts. |

## What is already strong

The audit did not find a problem with the basic tRPC/protected/admin separation for the implemented operations procedures, and the server correctly rejects unauthenticated protected queries. The safety engine has explicit surface scoping, severity ordering and malformed-regex containment tests. Entitlement projection is server-derived in the router, and community `coming_soon` restrictions are represented in the policy helper. The Telegram boundary has secret verification and durable duplicate-update detection on the happy path. These strengths should be preserved while the missing production controls are added.

## Recommended remediation order

1. Close P0-01 through P0-06 before building feature-heavy client screens. This establishes the product domain and prevents clients from encoding unsafe assumptions.
2. Fix storage authorization, split-origin auth/CSRF, baseline policy seeding/readiness and dependency vulnerabilities before any real user data or private media enters the system.
3. Make subscriptions, community eligibility, review queues and Telegram processing transaction-safe and idempotent.
4. Add pagination, rate limits, retention, health/readiness and API versioning before public beta.
5. Only after these gates, begin end-user website and Flutter UI implementation against generated/shared contracts.

## Final decision

**Do not treat checkpoint `1b23f2ad` as the final app-ready backend.** Treat it as the operations-foundation checkpoint. The next implementation milestone should be a **P0 product-domain and security-hardening milestone**, followed by a new audit and end-to-end contract test pass.

## References

[1]: [drizzle/schema.ts](drizzle/schema.ts) — NikahSaathi database schema.  
[2]: [server/routers.ts](server/routers.ts) — tRPC procedures and authorization boundaries.  
[3]: [server/db.ts](server/db.ts) — persistence helpers and lifecycle mutations.  
[4]: [server/safetyEngine.ts](server/safetyEngine.ts) — safety normalization, matching and masking.  
[5]: [server/_core/index.ts](server/_core/index.ts) — Express bootstrap and middleware.  
[6]: [server/_core/storageProxy.ts](server/_core/storageProxy.ts) — storage access route.  
[7]: [server/telegramWebhook.ts](server/telegramWebhook.ts) — Telegram webhook processing.  
[8]: [clients/flutter/lib/platform_contracts.dart](clients/flutter/lib/platform_contracts.dart) — Flutter shared models.  
[9]: [shared/platformContracts.ts](shared/platformContracts.ts) — shared TypeScript models.  
[10]: [package.json](package.json) — dependency and script manifest.
