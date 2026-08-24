# NikahSaathi Release Gates

This document distinguishes repository-verifiable controls from deployment- or provider-dependent controls. An unchecked gate must not be described as complete.

| Gate | Repository status | Closure evidence required |
| --- | --- | --- |
| P0-03 Safety transaction scope | Partial | Policy rows and blocked-domain snapshot loaded inside the same transaction that persists sanitized content and its safety audit decision for posts, comments, messages and profiles; rollback tests must prove no content/audit half-write. |
| P0-05 Split-host security | Partial | Run `DEPLOYMENT_SECURITY_RUNBOOK.md` against the final API and frontend HTTPS hostnames, including proxy `x-forwarded-proto`, credentialed preflight, CSRF acceptance/rejection and Bearer Flutter requests. |
| P1-05 Telegram provider acknowledgement | Partial | Use a Telegram/provider idempotency key or durable delivery receipt so a successful external send followed by a local `markSent` failure cannot produce a duplicate on redelivery. Add a failure-injection regression test. |
| P1-06 Distributed abuse controls | Partial | Choose a shared production limiter (Redis or managed equivalent), define quotas and key scopes, add idempotency keys for every externally retried mutation, and test behavior across two independent processes. |
| P2 Retention and CI | Partial | Implement and operate the retention/deletion worker under the Heartbeat/schedule workflow, verify deletion of each data class against legal holds, and execute the Flutter GitHub workflow in a real repository runner. |

## Required owner inputs

The owner must provide final production frontend/API origins and TLS/proxy topology for P0-05, approve a Telegram provider idempotency strategy for P1-05, select the shared rate-limit store and quota policy for P1-06, and approve retention periods/legal-hold rules plus the repository runner configuration for P2. These are intentionally not guessed or hardcoded.
