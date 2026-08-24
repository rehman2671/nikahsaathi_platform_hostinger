# Production decision research notes

## Telegram Bot API

The official Telegram Bot API states that webhook updates are delivered as HTTPS POST requests and that unsuccessful requests (non-2xx responses) are repeated for a reasonable number of attempts before Telegram gives up. It also documents `update_id` as the update identifier and supports a webhook `secret_token` header. The API does not document an idempotency key for outbound `sendMessage`; therefore outbound sends cannot be made exactly-once by Telegram alone. The platform decision is to keep durable local deduplication for inbound updates, stage outbound messages in a unique durable outbox, use a deterministic internal idempotency reference, and reconcile provider success/failure with an operator-visible delivery state rather than claiming exactly-once external delivery.

Source: [Telegram Bot API](https://core.telegram.org/bots/api), webhook `setWebhook` and message methods.

## Distributed rate limiting

Redis documentation recommends centralized rate-limit state for consistent per-user, per-API or per-tenant quotas across distributed service instances and presents atomic token-bucket implementations. Because this project already depends on MySQL and no Redis/Valkey credential or provider has been selected, the implementation decision is a MySQL-backed shared quota ledger with transactional updates and bounded retention, exposed through configuration and replaceable behind a small adapter. This avoids silently introducing an unapproved external dependency while remaining consistent across autoscaled instances. Redis/Valkey remains the scale-up adapter when traffic requires it.

Source: [Redis rate limiter documentation](https://redis.io/docs/latest/develop/use-cases/rate-limiter/).

## Retention and legal hold

The existing retention policy remains conservative: data classes have explicit defaults, legal holds override deletion, deletion is bounded and auditable, and no automated deletion is claimed until the worker is deployed and verified. The implementation will remain dry-run capable and will not invent legal periods beyond the documented defaults.

Source: project policy in `RETENTION_AND_DELETION_POLICY.md`.

## Configuration and branding decision

The platform name and public origins should be read from environment/configuration, while the current project defaults remain NikahSaathi and the existing Manus preview origin. Future changes should be made through the documented configuration map rather than scattered string edits. Production domains remain owner-supplied deployment values, not hardcoded application constants.

Redis official documentation confirms that local per-process counters break behind load balancers because one client can bypass limits across instances. It recommends a centralized store and describes atomic `INCR`/`EXPIRE` fixed-window counters and Lua-based atomic token-bucket decisions. For this project, MySQL is selected as the initial shared store because the project already has a MySQL/TiDB database and no Redis credential/provider was approved; the adapter boundary will allow Redis/Valkey later when scale warrants it.

Source: [Redis rate limiter documentation](https://redis.io/docs/latest/develop/use-cases/rate-limiter/).

## References

[1]: [Telegram Bot API](https://core.telegram.org/bots/api) — official webhook, retry, secret-token and message API documentation.

[2]: [Redis rate limiter documentation](https://redis.io/docs/latest/develop/use-cases/rate-limiter/) — centralized distributed quota and atomic counter guidance.
