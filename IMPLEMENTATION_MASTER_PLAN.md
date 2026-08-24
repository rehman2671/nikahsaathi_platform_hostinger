
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
