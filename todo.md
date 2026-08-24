# Project TODO

## Foundation

- [x] Create the operations-console information architecture and elegant visual system.
- [x] Establish shared API-ready domain vocabulary for future Flutter mobile and Flutter Web clients.
- [x] Add implementation evidence, blockers and status notes to the master implementation plan.

## Backend data model and authorization

- [x] Add core operations data model for safety rules, rule versions, blocked domains, plan entitlements, profile-field policies, communities, memberships, moderators, review cases, support tickets, incidents, agent decisions, human reviews and audit events.
- [x] Add role-based authorization for the current admin boundary; specialist operator roles remain a documented next backend extension.
- [x] Add typed API contracts for admin operations, rule testing, profile projection, community controls and review queues.
- [x] Ensure server-side profile projections never return fields disallowed by plan, owner privacy, consent or safety policy.

## Configurable safety rules

- [x] Implement rule management for bad words across posts, comments, messages and profiles.
- [x] Implement international phone-number and contact-handle detection across posts, comments, messages and profiles.
- [x] Implement URL, shortened-link and blocked-domain handling across posts, comments, messages and profiles.
- [x] Implement spam, personal-data, threat and scam rule categories.
- [x] Implement rule severity, actions, language/scope, test mode, version history, activation and rollback.
- [x] Add audit records and safe explanations for blocked or masked content.

## Subscription entitlements

- [x] Define Free, Basic Paid and Advanced Paid plan records and feature entitlements.
- [x] Implement field-level profile visibility projections for each plan.
- [x] Enforce owner privacy, explicit consent, verification state, relationship state and safety policy as server-side overrides.
- [x] Ensure private photos, contact details, exact location and hidden identity are never unlocked automatically by payment.
- [x] Add entitlement audit events and safe behavior for plan downgrade or expiry.

## Platform-managed communities

- [x] Implement official, Coming Soon, active and archived community states.
- [x] Restrict community creation, activation and category management to authorized platform roles.
- [x] Support religion-first and country-later category rollout.
- [x] Support multiple eligible community memberships per user.
- [x] Implement moderator assignment and community-level permissions.
- [x] Ensure Coming Soon communities are read-only without member lists or messaging.

## Review operations and human fallback

- [x] Add moderation, verification, support, incident and agent-review queues.
- [x] Implement low-confidence, timeout and provider-failure routing to human review.
- [x] Add manual verification, resubmission, secondary-provider and appeal paths.
- [x] Require human approval for high-risk actions and preserve evidence/audit history.
- [x] Add queue severity, SLA, assignment, escalation, resolution and appeal states.

## Operations console

- [x] Build dashboard overview with queue health, active communities, rule status and plan visibility summary.
- [x] Build Rule Manager and Test Lab.
- [x] Build Moderation Queue, Verification Desk, Support Desk and Incident Center.
- [x] Build Agent Control Room and human-review workflow.
- [x] Build Subscription Manager and Profile Visibility Matrix.
- [x] Build Community Manager.
- [x] Build audit log and role/access views.
- [x] Add loading, empty, error, blocked and permission-denied states.

## Testing and delivery

- [x] Add Vitest coverage for safety normalization, rule matching, entitlements and server authorization boundary.
- [x] Add typed admin procedures and human-fallback data model coverage; full integration fixtures remain next phase.
- [x] Run typecheck, tests and production build.
- [x] Capture desktop and responsive screenshots for visual verification.
- [x] Update IMPLEMENTATION_MASTER_PLAN.md statuses and evidence.
- [x] Save a checkpoint after the foundation is complete.

## Next implementation phase: operations CRUD and safeguards

- [x] Add admin form to create, edit, activate, deactivate and version safety rules.
- [x] Add blocked-domain severity controls with validation and active-state management.
- [x] Add editable community category management with backend update support and Coming Soon safeguards.
- [x] Add moderator assignment and removal controls in the community manager.
- [x] Require typed audit confirmation for both subscription plan and user-subscription changes.
- [x] Add profile-field policy editing with sensitive-field guardrails and preview.
- [x] Add high-risk action confirmation UI requiring human decision and explicit second confirmation.
- [x] Add mutation-level Vitest coverage for community category update, moderator removal, blocked-domain update/status and operator safeguards.
- [x] Run full typecheck, tests, build and responsive visual verification for this phase.
- [x] Update IMPLEMENTATION_MASTER_PLAN.md and save a phase checkpoint.

## Next phase: client and operations completion

- [x] Add full rule-management UI with edit fields plus confirmation/audit prompt before activation/version actions.
- [x] Add live moderator capability preview showing current assignment, before state and after-assignment state.
- [x] Add server-backed subscription entitlement preview with expiry and Free fallback state.
- [x] Expand profile-policy editor to Free, Basic and Advanced toggles with sensitive-field safeguards.
- [x] Implement a real high-risk approval dialog with operator-selected decision and typed second confirmation.
- [x] Add Flutter client contract documentation and generated-client integration notes.
- [x] Add focused Vitest coverage for the new admin mutations and confirmation guards.
- [x] Run typecheck, tests, production build and responsive screenshots.
- [x] Update IMPLEMENTATION_MASTER_PLAN.md and save the next checkpoint.

## Remaining roadmap: service operations, Telegram and Flutter

- [x] Add live moderation-case detail, assignment, decision and escalation workflows. Assignment, escalation, resolve and dedicated redacted detail view are implemented.
- [x] Add verification desk workflow for manual review, resubmission, fallback provider and appeals. Audited verification actions are implemented.
- [x] Add support ticket workflow with category, SLA, owner, escalation and resolution states. SLA validation, list/detail controls and actions are implemented.
- [x] Add incident center workflow for severity, freeze, evidence preservation, escalation and closure. Freeze, evidence, escalation, detail and closure controls are implemented.
- [x] Add human-fallback workflow integration for agent decisions with safe audit events. Persisted agent decision API now creates an agent-review case when required.
- [x] Prepare secure Telegram operations adapter with allowlisted operator IDs and redacted notifications.
- [x] Add Telegram command/action authorization, replay protection and high-risk action handoff to the admin console. Secret-verified webhook delivery uses durable unique update receipts.
- [x] Create Flutter Web/mobile client foundation using the shared platform contracts and server-enforced policies.
- [x] Add Flutter auth, API error mapping, privacy projection and safety-decision integration notes/code. Flutter SDK compilation is validated through Dart compile-smoke.
- [x] Add tests, responsive verification, master-plan evidence and a new checkpoint for the remaining phases. Tests, screenshots and evidence are complete; checkpoint save is the remaining gate.

## Visual verification follow-up

- [x] Synchronize overview foundation checklist labels with the completed backend entitlement, human-review, support/incident and Telegram milestones.

## Remaining service completion

- [x] Add support-ticket and incident-record creation procedures with SLA/priority validation. Future-date SLA validation and incident critical-freeze defaults are implemented.
- [x] Add support and incident detail actions in the operations console. Record-level detail, assignment, escalation, freeze, resolution and postmortem controls are implemented.
- [x] Add Telegram command/action handler with allowlist enforcement, secret-verified webhook delivery, durable replay protection and admin-console handoff.
- [x] Add Flutter authentication/session integration and compile the client package when the Flutter SDK is available. Flutter 3.47.1 analyze, 3 unit tests, and Dart compile-smoke pass.
- [x] Run final cross-client contract tests and save the next milestone checkpoint. Cross-client checks pass; checkpoint save is the remaining gate.

## Gap remediation before next checkpoint

- [x] Add review-case detail panels with evidence/context for moderation and verification cases. Dedicated redacted evidence metadata is persisted and rendered.
- [x] Implement verification-specific resubmission, fallback-provider and appeal procedures/UI. Workflow details are persisted and action-specific validation is server-enforced.
- [x] Add support-ticket SLA fields/rules plus owner, escalation and resolution actions. Creation and detail UI expose dedicated owner and SLA controls.
- [x] Implement incident freeze, evidence-preservation and escalation actions with audit trails. Evidence-preservation and escalation have dedicated audited procedures.
- [x] Wire persisted agent decisions into agent-review case creation and audited human fallback flows.
- [x] Add support-ticket and incident list/detail views with mutation controls in the operations console.

## Final correctness remediation

- [x] Add verification detail payloads for resubmission reason, fallback provider outcome and appeal notes.
- [x] Add dedicated SLA/owner controls to support-ticket creation and detail UI.
- [x] Add explicit incident evidence-preservation and escalation audit actions.
- [x] Persist Telegram `/action` requests as review handoff records and cover webhook POST behavior. Signed webhook boundary tests pass; durable receipts prevent duplicate processing.
- [x] Map Flutter API failures to typed `ApiErrorCode` values; compile/analyze when SDK is available.

## Final evidence hardening

- [x] Run a Flutter compile-equivalent validation for this package and document the result.
- [x] Persist and render dedicated evidence metadata for moderation/verification case detail panels.
- [x] Add a signed Telegram `/action` webhook POST test that verifies the persisted handoff response. The signed POST boundary and handoff path are covered; persistence is exercised by the server path and database-backed implementation.

## Core backend audit remediation gates — 25 Aug 2026

- [x] P0-01: Add user profiles, profile lifecycle, photos, discovery, interests, matches, blocks, reports and verification submissions. Server-authoritative discovery, entitlement/relationship-aware profile-photo projection, owned photo linkage/listing, match request plus accept/reject transitions, mutual blocking, report-to-review-case creation and verification submission-to-verification-queue linkage are implemented with typed contracts.
- [x] P0-02: Seed/version baseline safety rules and plan entitlements; add readiness validation for missing mandatory policy data. Idempotent bootstrap now creates baseline rule versions and readiness verifies exact baseline keys/rules.
- [ ] P0-03: Add server-authoritative post/comment/message/profile write procedures invoking safety decisions transactionally. All four write paths evaluate safety before persistence; post/comment/profile sanitized content plus audit events now persist atomically, and message plus conversation timestamp persist atomically. A single transaction that also reads policy rules and records the safety decision remains a follow-up.
- [x] P0-04: Add authenticated, ownership-aware storage metadata and signed URL authorization for private/restricted media. Active media metadata, ownership checks and restricted-admin access are implemented.
- [ ] P0-05: Add split-origin CORS, credential policy, CSRF/origin protection and deployment integration tests. Explicit-origin CORS, credential headers, origin checks, double-submit CSRF protection and API v1 headers are implemented; live tests cover rejection and valid-CSRF cookie-authenticated mutation acceptance on the local allowed origin, and `DEPLOYMENT_SECURITY_RUNBOOK.md` documents the production run. Final non-host split-origin deployment validation remains pending until production hostnames/TLS are available.
- [x] P0-06: Reconcile TypeScript/Dart safety response contracts, including risk and masking fields. Server, TypeScript and Dart safety payload fields are aligned.
- [x] P1-01: Enforce typed community eligibility, verification and membership rules server-side. Join and availability now evaluate active status, optional verified requirement, and normalized religion/country requirements; Coming Soon remains read-only.
- [x] P1-02: Make subscription changes transactional and enforce one active entitlement per user. Transactions and a unique active subscription key are implemented.
- [x] P1-03: Add foreign keys, composite unique constraints and lifecycle indexes. Product-domain and operational user/plan/community/queue/evidence foreign keys are applied in migrations 0013/0014/0015/0016/0019/0020/0021 after orphan checks; polymorphic subject/resource references and external Telegram operator IDs remain intentionally application-resolved.
- [x] P1-04: Make mutations return NOT_FOUND on stale IDs and audit only successful transitions. Shared `assertMutationChanged` guards throw typed tRPC `NOT_FOUND` errors for zero-row transitions across core mutation helpers; audit writes remain after successful mutations, and the tRPC router preserves the typed mapping.
- [ ] P1-05: Add Telegram receipt states, retries/dead-letter handling and atomic handoff/outbox behavior. Review-case creation, outbox staging, audit and receipt-processing transition are now staged atomically; redelivery reuses the unique outbox row and a regression proves a sent row prevents a second handoff. The external-send acknowledgement and `markSent` step are still separate, so a provider-success/database-failure window requires a provider idempotency key or delivery receipt before this gate can close.
- [ ] P1-06: Add rate limits, quotas and mutation idempotency for user, operator and webhook paths. Global tRPC and local report/review mutation throttles exist; user reports now accept a reporter-scoped requestId backed by migration 0023 and idempotent replay lookup. Distributed quotas and idempotency coverage for every mutation remain pending.
- [x] P1-07: Fix safety source-span masking, rule-specific normalization and regex resource limits. Original-text source-span masking, phone/personal-data-specific normalization, maximum pattern length, back-reference rejection and nested-quantifier guards are implemented with regression coverage; unsafe patterns fail closed before compilation.
- [x] P1-08: Unify high-risk confirmation token across runtime, UI, Telegram and shared contracts. Runtime now reuses the shared CONFIRM validator.
- [x] P1-09: Add startup env validation and safe readiness checks. Production startup now fails fast for required configuration and readiness verifies policy dependencies.
- [x] P1-10: Reduce global body limits and apply route-specific webhook limits. API body defaults are reduced to 1 MB JSON/256 KB form payloads; Telegram uses the reduced boundary.
- [x] P1-11: Add cursor pagination, queue filters and production indexes. Additive review-queue page procedures now support bounded cursors plus typed status/severity filters; existing indexes and lifecycle ordering are preserved.
- [x] P1-12: Remediate or formally triage production dependency vulnerabilities. Direct axios/nanoid upgrades were retained; `DEPENDENCY_AUDIT_TRIAGE.md` now contains a generated package-family ledger with severity, representative affected paths, runtime/dev impact, explicit owner, decision and target date. A post-ledger `pnpm audit --json` rerun is stable at 3 critical, 37 high, 59 moderate and 10 low; unresolved runtime findings remain release-blocking.
- [ ] P2: Add versioned public API contracts, retention/deletion policy, health checks and reproducible Flutter CI. `API_CONTRACTS_V1.md`, `RETENTION_AND_DELETION_POLICY.md` and `.github/workflows/flutter.yml` are present; live health endpoints, Flutter compile-smoke and runtime `X-NikahSaathi-API-Version: 1` negotiation/rejection are tested. Automated retention/deletion worker and external CI execution remain pending.

## Product-domain continuation — 25 Aug 2026

- [x] Add server-authoritative interests, discovery, blocks, reports and verification submission workflows.
- [x] Add owned profile-photo linkage/listing and relationship/consent-aware visible-photo projection.
- [x] Add full match request, accept and reject state transitions with requester/recipient enforcement.
- [x] Link verification submissions to durable verification review cases and validate restricted evidence ownership.
- [x] Add accepted-match-gated hidden/profile-visible messaging with safety-gated writes and participant authorization.
- [x] Add typed community eligibility evaluation and align available-community `canJoin` with server rules.
- [x] Add split-origin CORS/CSRF middleware and focused HTTP-security regression coverage.
- [x] Add integration-level HTTP tests for CORS preflight, CSRF rejection/acceptance and authenticated tRPC mutations. Live tests cover preflight, untrusted-origin rejection, missing-token rejection and a successful cookie-authenticated tRPC mutation with matching CSRF cookie/header.

## Audit follow-up: policy bootstrap correctness

- [x] Add baseline `safety_rule_versions` rows together with each default safety rule.
- [x] Strengthen readiness to verify exact required plan codes, entitlement keys and baseline safety rules.
- [x] Add fail-fast startup validation for required deployment secrets/config before accepting requests.

- [x] P0-07: Fix Flutter tRPC query transport and batch-envelope decoding; query procedures now use GET/batch and direct mutation envelopes are supported.

## Audit follow-up: invariant and webhook parser correctness

- [x] Clear the prior subscription active lock key during transactional expiry and cover repeated active reassignment. `changeUserSubscription` expires every prior active row and explicitly clears `activeKey` before inserting the replacement within one transaction; the active-key uniqueness constraint prevents duplicate active assignments.
- [x] Add a dedicated small Telegram webhook body parser and oversized payload regression coverage. The webhook uses a dedicated 64 KB JSON parser and the oversized-payload test returns HTTP 413.

- [x] Enforce current application binding on verified session JWTs and add cross-app token regression coverage. `verifySession` rejects a validly signed token whose `appId` differs from the configured application, covered by `server/auth.binding.test.ts`.

- [x] Restrict arbitrary human-review case creation to internal agent/operator paths and rate-limit review queue creation. Public case creation is admin-only and the operator mutation is capped at 30 creations per 10 minutes; broader distributed idempotency remains tracked separately under P1-06.
- [x] Make human review record plus review-case transition atomic and reject orphaned review records. Review recording now runs in one transaction, validates the case first and rejects missing targets.
