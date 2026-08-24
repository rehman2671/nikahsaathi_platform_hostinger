
## 20. Current implementation status — foundation milestone

| Area | Status | Evidence | Blocker or next step |
|---|---|---|---|
| Operations console shell | Ready for review | `client/src/pages/Home.tsx`, `client/src/index.css`; desktop/mobile preview verified | Add richer action dialogs and audit screens |
| Backend schema | Implemented | `drizzle/schema.ts`; migrations `0001_funny_alex_wilder.sql` and `0002_useful_mongoose.sql` applied | Add foreign keys/index tuning after domain model stabilizes |
| Safety rules | Foundation implemented | `server/safetyEngine.ts`, `operations.test.ts` equivalent tests in `server/safetyEngine.test.ts`, Test Lab procedure | Connect enforcement to post/comment/message/profile write endpoints |
| Blocked domains | Implemented | `blocked_domains` table, domain parser and `contentSafetyCheck` procedure | Add admin CRUD UI and allowlist review |
| Entitlements | Foundation implemented | `server/entitlements.ts`, `profileProjection` procedure, seeded plan/field policy configuration | Add billing lifecycle and downgrade/expiry audit events |
| Communities | Foundation implemented | Platform-managed community schema, rollout guard, multi-membership join/leave procedures | Add moderator assignment, eligibility CRUD and Coming Soon controls |
| Review operations | Foundation implemented | Typed queues, review-case creation and human-review completion procedure | Add evidence metadata, SLA timers and distinct queue action screens |
| Authorization | Implemented for current admin boundary | `adminProcedure`, `operations.accessCheck`, `server/routers.authz.test.ts` | Extend specialist operator roles in backend |
| Flutter client contracts | Explicit vocabulary added | `shared/platformContracts.ts` and typed tRPC router contract | Generate/document external client SDK surface |
| Automated checks | Passing | `pnpm check`, `pnpm test` — 4 files, 10 tests | Expand integration and security coverage |

### 20.1 Current blockers

The Telegram bot is not connected in the current session, so only its API-ready backend boundary and security rules are implemented. A bot token, authorized Telegram operator IDs and a final operator-role mapping are required before Telegram operations can be enabled. The current web project is the backend/admin foundation; Flutter mobile and Flutter Web clients remain the next client implementation track and will consume these server-side contracts.

### 20.2 Change log

| Version | Date | Change | Owner |
|---|---|---|---|
| 1.1 | 24 Aug 2026 | Implemented operations console shell, backend operations schema, configurable safety engine, blocked-domain parser, server-side entitlements, community membership APIs, review workflows, explicit shared contracts and authorization tests | Manus AI |

### 20.3 Foundation hardening update

| Area | Status | Evidence |
|---|---|---|
| Shared client contracts | Ready | `shared/platformContracts.ts` defines content surfaces, plans, community states and projection payloads |
| Content enforcement | Ready for integration | `contentSafetyCheck` contract combines active rule evaluation, blocked-domain parsing and user-safe decisions |
| High-risk approvals | Ready for integration | `server/approvalPolicy.ts` requires human approval and `APPROVE` second confirmation for sensitive actions |
| Community membership | Ready for integration | `joinCommunity`, `leaveCommunity` and `myMemberships` procedures support multiple active memberships and active-only joins |
| Review desks | Ready for review | Queue-specific procedures and filterable Moderation, Verification, Support, Incident and Agent Review views |
| Governance view | Ready for review | Access & audit view plus `auditLogs` procedure |
| Dashboard visibility summary | Ready for review | Overview renders server-backed Free, Basic Paid and Advanced field-access counts |

### 20.4 Remaining implementation scope

The next implementation increment should add moderator assignment CRUD, a full Coming Soon interest/activation workflow, entitlement downgrade/expiry events, specialist operator roles, full admin CRUD forms for rules/domains/plans, Telegram connector setup, and end-to-end content write endpoints that call `contentSafetyCheck` before persistence. These remain intentionally visible in `todo.md` rather than being treated as complete.

| Version | Date | Change | Owner |
|---|---|---|---|
| 1.2 | 24 Aug 2026 | Added shared Flutter contracts, blocked-domain enforcement contract, multi-membership APIs, queue-specific procedures, human-review persistence, high-risk approval policy, live audit access and plan visibility summary | Manus AI |

### 20.5 Final foundation hardening

| Gap closed | Implementation evidence |
|---|---|
| Server-derived subscription entitlements | `getEffectiveSubscription` joins active subscriptions to plan records; `resolveEffectivePlan` falls back to Free for missing, cancelled or expired subscriptions; `profileProjection` no longer accepts a client-provided plan. |
| Subscription lifecycle audit | `changeUserSubscription` expires the previous active record, creates the new lifecycle record and writes `subscription.change` to `audit_logs`. |
| Community-scoped moderator capability | `communityAccess` derives `canModerate` from the requesting user’s active assignment for that community; moderator assignment/removal is audited. |
| Coming Soon member-list guard | `communityAccess` returns `canViewMembers: false`; `communityMembers` rejects non-active communities; `getCommunityPermissions` and tests cover the read-only rule. |

Final verification after hardening: `pnpm check`, `pnpm test` and `pnpm build` pass. The test suite contains 6 files and 17 passing tests.

### Current phase — admin CRUD and client contract readiness

The operations console now includes draft rule creation, rule editing, activation/pause with audit prompts, version snapshots, blocked-domain create/pause controls, community staging and status controls, scoped moderator assignment preview, server-derived plan assignment with field-count and expiry preview, all-plan profile policy toggles with sensitive-field confirmations, and a real high-risk approval dialog with human-selected decision plus typed `CONFIRM`.

The Flutter integration notes now define the canonical contract source, generated Dart model/version workflow, refresh and breaking-change policy, central authentication adapter, privacy-safe logging, backend error mapping, and release gates for policy, communities and entitlements.

Validation evidence: `pnpm check` passed; `pnpm test` passed with 7 files and 19 tests; `pnpm build` passed; desktop and mobile responsive previews were captured successfully. The current checkpoint remains `83e12307` until this phase is saved.

### Final preview-hardening phase

The console now loads moderator assignment state from `communityModeratorPreview` and displays before-assignment versus after-assignment capabilities for the selected community and operator. Subscription assignment uses `subscriptionEntitlementPreview`, returning the server-derived effective plan, approved field count, expiry state and Free fallback instead of relying only on client-side policy counting.

Validation evidence: `pnpm check` passed; `pnpm test` passed with 7 files and 25 tests; `pnpm build` passed; the responsive mobile preview was captured successfully. The current phase is ready for checkpoint save.

### Final admin CRUD remediation

Completed the remaining admin-console gaps: blocked-domain severity is selectable and editable; community eligibility is collected and editable; moderator assignments can be inspected and removed; subscription plans can be edited with typed audit confirmation; and focused admin input validation tests cover domain normalization, eligibility rules and plan confirmation.

Validation evidence: `pnpm check` passed; `pnpm test` passed with 8 files and 28 tests; `pnpm build` passed; desktop and mobile responsive previews were captured successfully. The next checkpoint should include this remediation.

### Final gap remediation before fresh checkpoint

Completed the remaining review findings: community category is now editable through the admin update contract and UI; user subscription changes require typed `CONFIRM` audit confirmation; plan administration remains confirmation-gated; and mutation-level validation tests cover invalid domains and missing/incorrect subscription confirmations.

Validation evidence: `pnpm check` passed; `pnpm test` passed with 8 files and 31 tests; `pnpm build` passed; the mobile responsive preview was captured successfully. A fresh checkpoint is required after this entry.

### Final CRUD coverage remediation

Added deterministic mutation-level validation coverage for community category/eligibility updates, moderator removal, blocked-domain update/status flows, and subscription confirmation boundaries. The API now supports editable community categories and requires typed `CONFIRM` for user subscription changes as well as plan administration.

Validation evidence: `pnpm check` passed; `pnpm test` passed with 9 files and 34 tests; `pnpm build` passed. The operations console remains responsive from the previously captured desktop and mobile previews. A fresh checkpoint is ready to be saved.

### Current continuation — service safeguards, Telegram readiness and Flutter transport
Support-ticket and incident creation procedures are now server-authoritative and audited. Support creation accepts a future `slaDueAt`; ticket status includes `escalated`; incident creation defaults critical incidents to frozen and supports evidence references and escalation reasons. Incident update procedures expose freeze, evidence and escalation fields. Persisted agent decisions now write an `agent_decisions` record and create an `agent_review` case when human review is required. The corresponding non-destructive migration is `drizzle/0004_wealthy_metal_master.sql` and was applied successfully.

The Telegram adapter now includes allowlisted operator command parsing for `/help`, `/queue` and `/action`, redacted response text, and explicit high-risk handoff to the admin console. `TELEGRAM_BOT_TOKEN` and `TELEGRAM_OPERATOR_IDS` were configured securely, and a live Telegram `getMe` validation passed. Replay-protected webhook delivery and long-poll/webhook process wiring remain deliberately pending until the event-delivery architecture is selected.

The Flutter foundation now includes `AuthSession`, `ApiErrorCode`, login URI construction, optional session-cookie forwarding, unauthenticated-session mapping, safety evaluation, profile projection and community-summary transport. The sandbox has no Flutter or Dart SDK, so `flutter pub get` and `flutter analyze` remain release gates rather than claimed validation.

Validation evidence for this continuation: `pnpm check` passed; `pnpm test` passed with 11 files and 40 tests, including live Telegram credential validation; the operations schema migration applied successfully. Remaining implementation work before the next major checkpoint is explicit in `todo.md`: dedicated review/support/incident detail views, verification-specific resubmission/fallback/appeal controls, replay-protected Telegram webhook delivery, and Flutter SDK compilation.

### Correctness remediation — operations detail workflows and client validation
The review workspace now exposes redacted case detail for moderation, verification and agent-review queues. Verification cases have dedicated persisted workflow details for resubmission reasons, fallback-provider selection/outcome and appeal notes, with action-specific backend validation and audited status transitions. Support tickets now accept a dedicated owner and future SLA due time from creation and detail controls. Incidents now support explicit audited evidence-preservation and escalation actions, including freeze/containment behavior.

The Telegram bridge now registers a secret-verified `/api/telegram/webhook` boundary, claims update IDs through the durable unique `telegram_update_receipts` table, and persists `/action` requests as critical `agent_review` handoffs before replying. The corresponding migration is `drizzle/0005_burly_xorn.sql`; the verification-detail migration is `drizzle/0006_common_ken_ellis.sql`. Webhook tests cover unauthorized POST rejection and signed harmless updates.

Flutter validation is no longer blocked by SDK availability: Flutter 3.47.1/Dart 3.13.1 was installed in the sandbox, `flutter pub get`, `flutter test` (3 tests), and `flutter analyze` all passed. The client maps server error codes to `ApiErrorCode` and tests auth fallback, cookie forwarding and OAuth route construction.

Validation evidence: `pnpm check` passed; focused authorization/webhook tests passed with 19 tests; Flutter package tests and analysis passed. A final full-suite/build run and responsive screenshot capture remain the final delivery gate.

### Final correctness validation
The operations console now includes record-level review details, verification-specific persisted workflow fields/actions, dedicated support owner/SLA controls, explicit incident evidence-preservation and escalation actions, and a Telegram `/action` path that persists an `agent_review` handoff before sending a redacted response. Flutter client validation is complete with typed API errors, session fallback, cookie forwarding tests, `flutter test` passing 3 tests, and `flutter analyze` reporting no issues.

Final validation evidence: `pnpm check` passed; `pnpm test` passed with 12 files and 48 tests; `pnpm build` passed; Flutter `pub get`, `test`, and `analyze` passed; desktop and 390px mobile responsive screenshots were captured successfully. The next checkpoint includes migrations `0005_burly_xorn.sql` and `0006_common_ken_ellis.sql` plus the replay-protected webhook boundary and verification detail model.
