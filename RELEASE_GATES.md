# NikahSaathi Release Gates

This document distinguishes repository-verifiable controls from deployment- or provider-dependent controls. An unchecked gate must not be described as complete.

| Gate | Repository status | Closure evidence required |
| --- | --- | --- |
| P0-03 Safety transaction scope | Implemented | Policy rows and blocked-domain snapshot loaded inside the same transaction that persists sanitized content and its safety audit decision for posts, comments, messages and profiles; rollback tests must prove no content/audit half-write. |
| P0-05 Split-host security | Implemented; deployment evidence pending | Run `DEPLOYMENT_SECURITY_RUNBOOK.md` against the final API and frontend HTTPS hostnames, including proxy `x-forwarded-proto`, credentialed preflight, CSRF acceptance/rejection and Bearer Flutter requests. |
| P1-05 Telegram provider acknowledgement | Implemented with at-least-once delivery | Telegram webhook retries are deduplicated by `update_id`; outbound replies use a durable unique outbox and sent-state reuse. Telegram Bot API does not expose an outbound `sendMessage` idempotency key, so exact-once external delivery is impossible at this boundary. The accepted platform policy is at-least-once delivery with operator-visible retry/dead-letter state and no silent claim of exactly-once delivery. |
| P1-06 Distributed abuse controls | Implemented with MySQL shared ledger | A shared MySQL window ledger is now used by the rate-limit middleware across instances, with a local fallback only when the database is unavailable. The adapter is replaceable with Redis/Valkey later. Existing reporter/review idempotency remains route-specific; new externally retried mutations must adopt the same pattern before public launch. |
| P2 Retention and CI | Implemented; deployment evidence pending | Conservative defaults and legal-hold precedence are approved in `RETENTION_AND_DELETION_POLICY.md`; the worker contract is dry-run capable, bounded, observable and idempotent. Heartbeat scheduling and real GitHub-runner execution require deployment/runner access and must be verified before claiming automated deletion is active. |

## Decisions recorded on 25 Aug 2026

The initial deployment will use configuration-driven placeholder origins (`https://web.example.com` for the web client and `https://api.example.com` for a split API host) until the owner purchases or binds final domains. The exact replacement map is maintained in `BRANDING_AND_DOMAIN_CHANGE_GUIDE.md`; no database identifiers or API compatibility headers need to change during a rename.

The Telegram policy is durable inbound deduplication plus a unique outbound outbox with bounded retries and dead-letter handling. Because Telegram retries failed webhooks and does not document outbound send idempotency, the service deliberately uses at-least-once semantics and exposes the residual duplicate-send risk instead of pretending it can guarantee exactly once.

The initial shared limiter is the existing MySQL/TiDB database, using an atomic window ledger so all autoscaled instances share counters. Redis/Valkey is the future scale adapter, not an unapproved mandatory dependency. Retention defaults from `RETENTION_AND_DELETION_POLICY.md` are approved, and legal holds always override ordinary deletion. Automated deletion remains disabled until a deployed Heartbeat worker and real runner validation are completed.

## Remaining deployment evidence

P0-05 still requires a smoke test against the final DNS/TLS/proxy topology. P2 still requires an actual deployed Heartbeat schedule and a successful GitHub Actions run. These are operational evidence gates, not missing application design decisions. The application remains safe before those checks: HTTPS enforcement is opt-in, retention destructive execution is disabled by default, and covered replay/idempotency boundaries are explicit.
