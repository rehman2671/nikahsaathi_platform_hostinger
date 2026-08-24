# NikahSaathi Platform Architecture for AI Agents

**Document owner:** Manus AI  
**Platform:** NikahSaathi  
**Status:** Implementation-aligned architecture reference  
**Primary brand domain:** `nikahsaathi.com`  
**Last updated:** 25 August 2026

## 1. Purpose and agent operating contract

This document is the implementation map for any AI agent working on NikahSaathi. An agent must treat the server as the authority for identity, permissions, privacy projections, safety decisions, plan entitlements, community eligibility, matching state, messaging eligibility and operational actions. The frontend, Flutter clients, Telegram bot and future integrations are clients of the server; they must not reimplement or bypass server policy.

Before changing code, the agent must inspect this document, `API_CONTRACTS_V1.md`, `RELEASE_GATES.md`, `DEPLOYMENT_SECURITY_RUNBOOK.md`, `RETENTION_AND_DELETION_POLICY.md` and `todo.md`. The agent must preserve existing migration history, API version identifiers, cookie names, audit semantics and safety behavior. It must add a pending item to `todo.md` before every requested change, update the item immediately after completion, write or update Vitest coverage, run typecheck/tests/build, and save a checkpoint before delivery.

> **Non-negotiable rule:** Never expose a profile field, photo, identity, message, community action or operational action merely because a client requested it or because a user paid. The server must evaluate entitlement, owner privacy, consent, verification, relationship state, safety policy and role authorization together.

## 2. Product and platform naming

The umbrella product is **NikahSaathi**. The public website and user-facing application should use the same brand so that users understand that web and mobile are one account system. Internal surfaces may have descriptive names, but they must continue to use the NikahSaathi identity.

| Surface | Product name | Recommended address | Main responsibility |
| --- | --- | --- | --- |
| Public website and user application | NikahSaathi Web | `https://nikahsaathi.com` | Marketing, sign-in, profiles, discovery, matching and communities |
| Mobile client | NikahSaathi Mobile | Android/iOS application | Same user account and API as the web application |
| Shared backend | NikahSaathi API | `https://api.nikahsaathi.com` | Authentication context, tRPC procedures, safety, privacy, domain workflows and audit |
| Private operations console | NikahSaathi Operations | `https://ops.nikahsaathi.com` | Moderation, verification, support, incidents, subscriptions, communities and audits |
| Media delivery | NikahSaathi Media | Managed storage or `media.nikahsaathi.com` | Authorized profile and operational media only |
| Telegram operations | NikahSaathi Telegram Operations | `https://api.nikahsaathi.com/api/telegram/webhook` | Signed command intake, durable handoff and operator notifications |

`api.nikahsaathi.com` and `ops.nikahsaathi.com` are recommended production names, not hardcoded assumptions. During setup, the application may run on a single host or on configured placeholder origins. The final origins are supplied through deployment configuration and CORS allowlists.

## 3. System connection map

```text
                         ┌──────────────────────────────┐
                         │       nikahsaathi.com         │
                         │   Web app / public website    │
                         └──────────────┬───────────────┘
                                        │ HTTPS, tRPC, OAuth
                         ┌──────────────▼───────────────┐
                         │    api.nikahsaathi.com        │
                         │ Express + tRPC + policy layer │
                         └──────┬───────────┬────────────┘
                                │           │
                 ┌──────────────▼───┐   ┌──▼────────────────┐
                 │ MySQL / TiDB      │   │ Managed storage   │
                 │ domain + audit    │   │ photos/evidence   │
                 └───────────────────┘   └──────────────────┘
                                ▲
                                │ same API, admin auth
                         ┌──────┴────────────────┐
                         │ ops.nikahsaathi.com    │
                         │ Operations console     │
                         └────────────────────────┘

 Flutter Mobile / Flutter Web ───────► api.nikahsaathi.com
 Telegram Bot ── signed webhook ────► api.nikahsaathi.com/api/telegram/webhook
```

The preferred deployment is split-host: public users access `nikahsaathi.com`, the API is served from `api.nikahsaathi.com`, and operators use `ops.nikahsaathi.com`. A same-host deployment is also supported because the browser client uses the relative `/api/trpc` path. The architecture therefore does not require a code rewrite when moving from one host to three hosts.

## 4. Client responsibilities and boundaries

The web client is responsible for presentation, loading states, form validation, navigation and user-friendly error messages. It must call typed tRPC procedures and must not directly query the database, construct authorization decisions, manipulate session cookies or duplicate safety rules.

The Flutter client is responsible for mobile presentation and API transport. It should use the shared API contract, send the configured API base URL, map typed errors to the shared error model and render only the profile projection returned by the server. It must not assume that a field visible to one plan or relationship is visible to another.

The operations console is a privileged client. Its UI may offer actions only after the server confirms the operator role and action policy. High-risk actions require the existing human confirmation and audit boundary. Telegram is an operations input channel, not a replacement for the console: high-risk Telegram requests create durable handoffs for console review rather than executing silently.

## 5. Authentication, transport and security

Authentication is provided through the existing OAuth/session integration. Browser requests use the secure session cookie flow and double-submit CSRF protection. Flutter and preview environments may use the supported bearer/session transport. Cookie-authenticated browser mutations require an allowed origin and matching `ns_csrf` cookie/header. Bearer requests do not use browser CSRF tokens, but role and authorization checks still apply.

During certificate setup, `FORCE_HTTPS=false` keeps HTTP available. After DNS, certificate and proxy verification, set `FORCE_HTTPS=true` to redirect API HTTP requests to HTTPS. Set `TRUST_PROXY=true` only when a trusted reverse proxy supplies `x-forwarded-proto`. Set `CORS_ALLOWED_ORIGINS` to the exact frontend origins; never use wildcard CORS with credentials.

| Configuration | Meaning | Safe initial value |
| --- | --- | --- |
| `VITE_APP_TITLE` | Display brand and browser title | `NikahSaathi Platform` |
| `CORS_ALLOWED_ORIGINS` | Exact browser frontend allowlist | Final HTTPS web/app origins |
| `FORCE_HTTPS` | Redirect API HTTP requests after TLS is ready | `false` during setup |
| `TRUST_PROXY` | Trust proxy protocol headers | `false` unless behind trusted proxy |
| `SHARED_RATE_LIMIT_ENABLED` | Use shared MySQL/TiDB rate-limit ledger | `true` |
| `RETENTION_WORKER_ENABLED` | Permit destructive operational retention cleanup | `false` |
| `RETENTION_LEGAL_HOLD` | Force retention worker into dry-run | `true` during a hold/investigation |

## 6. Domain model and authoritative data flow

The database contains users, profiles, media metadata, plans and subscriptions, safety rules and versions, blocked domains, profile-field policies, communities and memberships, interests, match requests, blocks, conversations and messages, review cases, verification submissions, support tickets, incidents, agent decisions, audit logs, Telegram receipts/outbox and the shared rate-limit ledger.

The normal request flow is:

1. Authenticate the request and determine the user or cron identity.
2. Apply route-level role, ownership, membership and relationship checks.
3. Load the authoritative policy and entitlement inputs.
4. For content writes, read active safety rules and blocked domains inside the same database transaction as the write and safety audit.
5. Persist only sanitized content and successful state transitions.
6. Return the typed API contract and record an audit event when the action is operationally significant.

The agent must use existing database helpers and transactions rather than adding ad hoc SQL in routers. Schema changes must be added to `drizzle/schema.ts`, generated as a migration, reviewed, applied through the approved database migration flow and covered by tests.

## 7. Matrimonial and community behavior

A user may maintain interests, discover eligible profiles, request a match, accept or reject a match, block another user and report a user. Discovery and profile detail responses are projections, not raw profile rows. Free, Basic Paid and Advanced Paid plans alter eligible fields only after consent, privacy, verification, relationship and safety checks.

Communities are platform-managed. Initial categories are religion-first, followed by country and later city or other approved categories. A user may join multiple eligible communities. Coming Soon communities are read-only and must not expose member lists or messaging. Community creation, activation, moderator assignment and category changes are operator-controlled and audited.

Conversation identity may be hidden or profile-visible according to the supported workflow. Messaging requires an eligible relationship state and active conversation. Blocks, reports, freezes, incident controls and safety decisions override normal messaging access.

## 8. Safety and human accountability

Safety rules cover bad words, phone/contact details, links and blocked domains, spam, personal data, threats and scams. Rules have scope, language, severity, action, activation state and version history. The safety engine normalizes input with bounded pattern safeguards, maps matches back to original text spans and returns an action such as allow, mask, replace, block, quarantine or human review.

AI decisions are not a substitute for accountability. Low confidence, provider failure, timeout, serious incident reports and high-risk actions must route to human review. Moderation, verification, support, incident and agent-review queues preserve evidence, assignment, SLA, escalation and audit history. Do not fabricate reviews, ratings, testimonials or engagement data.

## 9. Telegram operations contract

Telegram webhook requests require the configured secret token and an allowlisted operator. Telegram `update_id` values are deduplicated through durable receipts. Handoff creation, audit staging and outbound message planning use a unique outbox row. Retries are bounded and can enter a dead-letter state.

The platform deliberately uses **at-least-once outbound semantics**. Telegram does not provide an outbound `sendMessage` idempotency key at this boundary, so exact-once delivery cannot be honestly guaranteed when an external send succeeds but the local sent-state update fails. Agents must preserve the outbox and receipt state machine, must not remove duplicate protection, and must expose retry/dead-letter state to operators.

## 10. Rate limiting and quotas

The initial shared limiter uses the MySQL/TiDB rate-limit ledger so autoscaled API instances share a window counter. The current API envelope is 120 requests per IP per 60 seconds, and the Telegram webhook envelope is 60 requests per IP per 60 seconds. Route-specific mutation guards and report request idempotency remain separate controls. Local fallback is bounded and should be treated as degraded mode, not the normal production path.

Redis or Valkey may replace the ledger adapter in a later scale phase. An agent must not add a new mandatory external service without documenting its secret/configuration requirements, failure mode, migration path and tests.

## 11. Retention and scheduled work

The scheduled retention callback is `POST /api/scheduled/retentionSweep`. It accepts only a Heartbeat cron identity, caps each run at 500 rows, returns candidate/deleted counts and is dry-run by default. Destructive execution requires `RETENTION_WORKER_ENABLED=true`; `RETENTION_LEGAL_HOLD=true` always forces dry-run.

The current worker is intentionally limited to operational cleanup: expired rate-limit buckets and old processed Telegram delivery records. It does not delete user content, verification evidence, incident evidence, reports or audit logs. Such data requires a dedicated legal-hold-aware deletion workflow with dependency-order analysis and storage cleanup. Schedule the worker only after deployment, dry-run review and policy sign-off.

## 12. Future domain or product-name change

A future rename should be treated as a configuration and content migration, not a database rewrite. Change `VITE_APP_TITLE`, WebDev project title, visible product copy, final CORS origins, OAuth callback/allowed origins, Flutter API base URL, Telegram webhook URL, email links, monitoring URLs and TLS certificates. Keep API route paths, API v1 headers, cookie names, database table names, migration history, storage keys and Telegram receipt identifiers stable.

The detailed step-by-step change map is maintained in `BRANDING_AND_DOMAIN_CHANGE_GUIDE.md`. The preferred strategy is to keep the old hostname redirecting during migration, verify OAuth and API traffic, and remove the redirect only after clients have moved.

## 13. Agent change checklist

Before implementation, identify the affected client, API procedure, database table, policy boundary, audit requirement, migration requirement, test file and documentation file. During implementation, reuse existing components and helpers, preserve typed contracts, reject unauthorized states server-side, keep content sanitation and audit writes transactional, and avoid storing file bytes in the database. Before delivery, run `pnpm check`, `pnpm test -- --run`, `pnpm build`, inspect relevant server logs, review `todo.md`, synchronize the private GitHub branch and save a recoverable checkpoint.

## 14. Source references

[1]: [API_CONTRACTS_V1.md](./API_CONTRACTS_V1.md) — versioned public API response and negotiation contract.

[2]: [DEPLOYMENT_SECURITY_RUNBOOK.md](./DEPLOYMENT_SECURITY_RUNBOOK.md) — CORS, CSRF, TLS/proxy and retention activation runbook.

[3]: [BRANDING_AND_DOMAIN_CHANGE_GUIDE.md](./BRANDING_AND_DOMAIN_CHANGE_GUIDE.md) — detailed domain and product-name replacement map.

[4]: [RELEASE_GATES.md](./RELEASE_GATES.md) — repository-verifiable controls and deployment evidence gates.

[5]: [RETENTION_AND_DELETION_POLICY.md](./RETENTION_AND_DELETION_POLICY.md) — retention defaults, legal holds and deletion boundaries.

[6]: [RESEARCH_PRODUCTION_DECISIONS.md](./RESEARCH_PRODUCTION_DECISIONS.md) — Telegram and shared-rate-limit decision research, including official external sources.
