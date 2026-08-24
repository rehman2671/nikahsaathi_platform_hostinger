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

- [ ] Add live moderation-case detail, assignment, decision and escalation workflows. Assignment/escalation/resolve mutations exist; dedicated detail/evidence view remains pending.
- [ ] Add verification desk workflow for manual review, resubmission, fallback provider and appeals. Generic human review exists; verification-specific actions remain pending.
- [ ] Add support ticket workflow with category, SLA, owner, escalation and resolution states. Creation and SLA fields exist; list/detail action UI remains pending.
- [ ] Add incident center workflow for severity, freeze, evidence preservation, escalation and closure. Severity/freeze/evidence fields exist; detail-action UI remains pending.
- [x] Add human-fallback workflow integration for agent decisions with safe audit events. Persisted agent decision API now creates an agent-review case when required.
- [x] Prepare secure Telegram operations adapter with allowlisted operator IDs and redacted notifications.
- [ ] Add Telegram command/action authorization, replay protection and high-risk action handoff to the admin console. Allowlist and safe handoff are implemented; replay-protected webhook delivery remains pending.
- [x] Create Flutter Web/mobile client foundation using the shared platform contracts and server-enforced policies.
- [ ] Add Flutter auth, API error mapping, privacy projection and safety-decision integration notes/code. Session/auth transport and policy clients are implemented; Flutter SDK compilation remains pending.
- [ ] Add tests, responsive verification, master-plan evidence and a new checkpoint for the remaining phases.

## Visual verification follow-up

- [ ] Synchronize overview foundation checklist labels with the completed backend entitlement and human-review milestones.

## Remaining service completion

- [x] Add support-ticket and incident-record creation procedures with SLA/priority validation. Future-date SLA validation and incident critical-freeze defaults are implemented.
- [ ] Add support and incident detail actions in the operations console. Creation controls are present; record-level action views remain pending.
- [ ] Add Telegram command/action handler with allowlist enforcement and admin-console handoff after credentials are configured; replay-protected webhook delivery remains pending.
- [ ] Add Flutter authentication/session integration and compile the client package when the Flutter SDK is available. Session URI, cookie forwarding, and unauthenticated mapping are implemented; SDK compilation remains pending.
- [ ] Run final cross-client contract tests and save the next milestone checkpoint.

## Gap remediation before next checkpoint

- [ ] Add review-case detail panels with evidence/context for moderation and verification cases.
- [ ] Implement verification-specific resubmission, fallback-provider and appeal procedures/UI.
- [ ] Add support-ticket SLA fields/rules plus owner, escalation and resolution actions.
- [ ] Implement incident freeze, evidence-preservation and escalation actions with audit trails.
- [ ] Wire persisted agent decisions into agent-review case creation and audited human fallback flows.
- [ ] Add support-ticket and incident list/detail views with mutation controls in the operations console.
