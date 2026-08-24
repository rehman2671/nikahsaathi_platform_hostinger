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
