# NikahSaathi Retention and Deletion Policy

## Principles

NikahSaathi stores only what is needed to provide matrimonial discovery, community safety, support and legally required operational records. User deletion requests must remove or anonymize user-facing data and revoke media access; billing, safety and incident evidence may be retained for the minimum period required for fraud prevention, dispute handling or legal obligations.

## Default retention classes

| Data class | Default retention | Deletion behavior |
|---|---:|---|
| Draft, paused or deleted profile content | 30 days after deletion request | Hard-delete profile fields and linked profile-photo metadata; revoke storage objects through the storage lifecycle worker |
| Published posts, comments and messages | 30 days after account deletion | Delete or anonymize author identity and remove content unless it is attached to an active safety case |
| Profile photos and verification evidence | 30 days after deletion/rejection | Mark media deleted immediately, deny signed URLs, then purge bytes after the hold period |
| Match, block and community membership records | 30 days after account deletion | Delete user-facing relationship rows and leave no discoverable membership |
| Reports, review cases, support tickets and incidents | 24 months after resolution | Retain redacted operational evidence; remove unnecessary personal content and restrict access to authorized operators |
| Audit logs and security events | 24 months | Retain immutable action metadata with minimized actor/resource information |
| Telegram receipts and outbox messages | 90 days after processing/dead-letter | Purge message text and provider identifiers after operational replay window |

## Operational requirements

Deletion is an authenticated, ownership-checked, idempotent workflow. It must first disable discovery, messaging, community posting and media URL issuance, then delete or anonymize dependent rows in dependency order, and finally enqueue storage-object deletion. Safety, incident and legal holds override ordinary deletion only for the documented hold duration and must be visible to operators.

The retention worker is exposed at `POST /api/scheduled/retentionSweep` and accepts only authenticated Heartbeat cron identities. It is idempotent at the batch level, bounded to 500 rows per call, reports candidate/deleted counts and runs in dry-run mode unless `RETENTION_WORKER_ENABLED=true`. `RETENTION_LEGAL_HOLD=true` forces dry-run regardless of the request body. The first implementation purges only expired rate-limit buckets and processed Telegram outbox/receipt records; user-facing content, evidence, reports, incidents and audit logs remain protected until a dedicated legal-hold-aware deletion workflow is approved. Schedule the endpoint only after deployment and verify it with the Heartbeat execution log. Until then, this document is a release requirement and the platform must not claim automated deletion is active.
