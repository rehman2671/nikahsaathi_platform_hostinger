# Backend audit working notes

## Initial high-confidence findings

1. The repository is an operations foundation, not yet a complete end-user matrimonial backend: schema and router surface do not contain user profiles, posts, comments, messages, interests, matches, blocks, reports, verification submissions, payment records, or content-write procedures.
2. `contentSafetyCheck` is a protected read/query procedure. No post/comment/message/profile write path currently invokes it transactionally before persistence.
3. `createHumanReviewCase` is exposed as a protected procedure, so any authenticated member can create arbitrary review cases unless this is restricted to internal service credentials or server-side agent code.
4. `joinCommunity` checks only active status and duplicate active membership; it does not evaluate stored eligibility rules or verified-user requirements. `availableCommunities` sets `canJoin` from active status only.
5. The schema has no foreign keys and very few composite uniqueness constraints. Memberships, moderators, review details/evidence, subscriptions, audit records and agent decisions can become orphaned or duplicated unless helpers enforce integrity.
6. `getOperationsCounts` treats every review case except `resolved` as open, so `postmortem`-style or other terminal states must be checked for count correctness.
7. Safety normalization removes whitespace, hyphens, parentheses and dots globally before regex matching. Matches are then applied to original text using the normalized match string, which can make masking fail and can distort non-phone matching. Safety rules are regex strings compiled at runtime without resource/time limits.
8. Telegram update claiming occurs before downstream handoff/reply/audit work. If review-case creation or Telegram reply fails after the claim, the update may be permanently suppressed without a retry/dead-letter state. The endpoint also needs a production delivery/health/observability plan.
9. Subscription lifecycle changes are implemented as expire-then-insert without a transaction; a failure after expiry can leave a user with no active subscription. Entitlement lookup and plan assignment need concurrency and duplicate-active-row protections.
10. Update helpers generally do not check affected-row counts or target existence, so stale IDs can return success while changing nothing.

## Audit scope still to inspect

- Authentication/session cookie and CSRF/origin behavior.
- Admin/specialist roles and object-level authorization.
- Privacy projection semantics and client contract drift.
- Storage/S3 upload and access controls.
- Telegram secret, operator identity, retry and rate limits.
- Migration application state and production start behavior.
- Flutter contract completeness for future app flows.
- Tests versus real database/API integration coverage.

## Additional high-confidence findings

11. `server/_core/index.ts` applies a 50 MB JSON/urlencoded body limit globally, including the Telegram webhook; this increases abuse/DoS exposure. It also scans for a different port if `PORT` is occupied, which can break platform health checks instead of failing fast.
12. Split frontend/backend deployment is not production-ready: no explicit CORS middleware with credentials/origin allowlist is registered, while cookie auth is expected. CSRF protection for cookie-authenticated state-changing tRPC calls is not visible beyond OAuth state validation.
13. Cookie configuration uses `SameSite=None`; this is appropriate only with HTTPS and credentialed cross-origin configuration. Local HTTP and split-origin deployments need explicit handling/tests.
14. `storageProxy` redirects any `/manus-storage/*` key to a signed URL without authentication, ownership or purpose/prefix checks. This is unsafe for future private photos, verification documents or incident evidence.
15. `ENV` defaults required secrets to empty strings and has no startup validation. A production process can start with invalid/missing JWT, database, OAuth or Forge configuration.
16. `verifySession` validates token structure but does not visibly enforce that JWT `appId` equals the current `ENV.appId`; bearer tokens are accepted as an alternative to cookies. Cross-project/session-boundary and token-source policy require explicit review.
17. `approvalPolicy.ts` requires second confirmation `APPROVE`, while `shared/operatorGuards.ts` and UI flows use `CONFIRM`. This is a contract mismatch that can cause high-risk operations to be inconsistently rejected.
18. Flutter `SafetyDecision` expects `highestRisk` and `maskedText`; current `contentSafetyCheck` returns `action`, `matches`, and `blockedUrls` only. Flutter safety responses therefore lose important data/default incorrectly.
19. `ProfileProjectionRequest` in shared TypeScript still includes a client-supplied `plan`, although the server derives plan from the authenticated user subscription. The type contract should remove or clearly mark this field as server-output-only.
20. `availableCommunities.canJoin` is currently based only on active status, not eligibility, verification or existing membership. The app cannot safely rely on it for join-button decisions until eligibility is server-enforced.
21. The database currently contains 20 expected operations tables, but `safety_rules`, `plan_entitlements`, `user_subscriptions`, communities and most operational tables are empty. Only three subscription plans and 15 profile-field policies are present. A fresh deployment has no active safety rules and no plan entitlement rows unless operators seed them manually; content blocking is therefore not effective by default.
22. There is no user-facing domain model or router surface for profiles, content posts/comments/messages, interests/matches, user blocks/reports, verification submissions, payment lifecycle, notifications, or community posts/messaging. These are P0 app-enabling backend gaps, not merely UI gaps.
23. `createHumanReviewCase` is available to any authenticated user and can be abused to spam review queues. It should be internal-agent/service-only or heavily rate-limited and subject-scoped.
24. Review/support/incident list endpoints cap results at 50 with no pagination, filtering cursor or SLA ordering contract. This will lose cases at production volume.
25. Update helpers are blind writes without affected-row or ownership checks. Subscription replacement is expire-then-insert without a transaction; concurrency can create multiple active records or leave a user without access after partial failure.
26. No explicit rate limiting, request correlation IDs, idempotency keys for user mutations, abuse throttles, or observability/alerting contract is visible for auth, safety checks, review creation, community join or Telegram webhook.
27. `pnpm audit --prod --audit-level high` reports 81 vulnerabilities in the installed dependency graph, including 21 high and 1 critical. The output identifies `axios@1.12.2` below patched 1.16.0, `form-data@4.0.4` below patched 4.0.6, and `nanoid@5.1.6` below patched 5.1.16 among the listed paths. Dependency remediation is a release blocker until triaged.

## Remediation evidence after checkpoint 5419a527

- Policy bootstrap now creates idempotent baseline safety rules and corresponding version-history rows; readiness verifies required plan codes, entitlement keys, active baseline rules and versions. Startup validation fails fast for required deployment configuration.
- Flutter transport now uses GET/batch for tRPC queries and decodes direct mutation envelopes; TypeScript and Dart safety responses include canonical risk/masking fields.
- Split-origin CORS/origin middleware is mounted on tRPC; global request parsers are bounded and Telegram now has a dedicated 64 KB parser mounted before the global parser. tRPC and Telegram routes have bounded in-process rate limiters; these are not a substitute for a distributed production limiter.
- Media metadata is now modeled with owner, purpose, visibility and status. The storage proxy refuses unregistered keys, authenticates private/restricted assets and permits restricted access to owners or admins. A protected metadata-registration procedure enforces evidence visibility rules.
- Subscription changes now use a transaction, clear the prior active lock key, insert a per-user active lock key and audit inside the transaction. Composite uniqueness and lifecycle indexes were added for memberships, moderators, entitlements, review queues and subscriptions.
- Mutation helpers now surface tRPC NOT_FOUND for zero affected rows across core safety, community, review, support, incident, profile, domain and plan updates. Rejoin behavior respects the unique membership record and restricted status.
- A first app-enabling content slice now exists: structured profiles with safety-gated upsert and server-authoritative viewer projection; member-gated posts/comments with safety evaluation, blocked-domain enforcement and audit events. Messaging, discovery, interests/matches, reports, verification submission and payment lifecycles remain unimplemented.
- Remaining high-confidence gaps include lack of foreign keys, incomplete community eligibility evaluation, no distributed idempotency/rate-limit store, no Telegram retry/dead-letter state or outbox, safety source-span masking limitations, lack of specialist roles, no user content/media upload lifecycle, and dependency vulnerabilities requiring triage.

## 25 Aug 2026 continuation evidence

The product-domain remediation added `user_interests`, `matches`, `user_blocks`, `user_reports`, `verification_submissions`, and `profile_photos`, with migrations 0014–0016 applied after checking that the pre-existing match table was empty. Match requests normalize user-pair ordering and store `requestedBy`; accept/reject transitions enforce participant and requester/recipient rules. Verification submissions atomically create a `verification` review case, link it through `reviewCaseId`, validate restricted evidence ownership, and set the profile verification state to pending. Profile and discovery responses now include only relationship/consent-eligible photos, and the prior client-supplied `relationshipState` override was removed from `profileByUserId`.

Split-origin protections now include explicit configured-origin CORS headers, credential support, origin checks for mutations, and a readable double-submit `ns_csrf` cookie paired with the `x-csrf-token` header. Bearer-auth Flutter requests are exempt from browser CSRF checks while still subject to CORS/rate-limit boundaries. Unit coverage is present in `server/httpSecurity.test.ts`; deployment-level integration remains a release gate.

A fresh production dependency audit on 25 Aug 2026 reports 81 vulnerable transitive packages: 1 critical, 21 high, 49 moderate, and 10 low across 598 production dependencies. No blanket `audit --fix` was applied because the current manifest contains broad framework/UI and runtime dependency upgrades whose compatibility must be tested in a dedicated dependency-maintenance change. This remains P1-12 pending, with the audit counts recorded for triage.


The continuation also added typed community eligibility evaluation for JSON and legacy text rules. Join and availability decisions now require active status plus configured verification, religion and country conditions; Coming Soon remains read-only. Hidden/profile-visible conversations and messages now have dedicated tables, accepted-match gating, participant authorization, close/block checks, server-side message safety evaluation and published-message listing. The message write and conversation timestamp update are atomic; the browser-facing procedure cannot persist an unsafe message.


The queue contract now has additive cursor-paginated endpoints with bounded page sizes (1–100) and typed status/severity filters, preserving the existing console list procedures for compatibility. A post-upgrade production audit shows 50 remaining advisories across 600 production dependencies: 1 critical, 8 high, 32 moderate and 9 low. Direct `axios` was upgraded from 1.12.2 to 1.19.0 and `nanoid` from 5.1.6 to 5.1.16; full tests and build still pass. P1-12 remains open because transitive advisories, including a critical finding, require a separate compatibility-led dependency maintenance release.
