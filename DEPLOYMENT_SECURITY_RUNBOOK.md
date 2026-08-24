# Split-host Deployment Security Runbook

## Required production configuration

During certificate setup, leave `FORCE_HTTPS=false` (or unset) so HTTP remains available. After the certificate and HTTPS proxy route are verified, set `FORCE_HTTPS=true` to return a `308` redirect for HTTP API requests. Set `TRUST_PROXY=true` only when the API is behind a trusted reverse proxy that sets `x-forwarded-proto`; otherwise leave it unset.

Set `CORS_ALLOWED_ORIGINS` to a comma-separated allowlist containing only the deployed Flutter Web/site origins, for example `https://app.example.com,https://web.example.com`. Do not use `*` with credentials. Keep `SHARED_RATE_LIMIT_ENABLED=true` (the default) to use the shared MySQL/TiDB window ledger across autoscaled instances; set it to `false` only for a controlled emergency fallback while investigating database availability. The current API envelope limit is 120 requests per IP per 60 seconds and Telegram webhook limit is 60 per IP per 60 seconds. Redis/Valkey can replace this adapter later if scale requires lower-latency counters. Serve the API and cookie-authenticated web client over HTTPS so the double-submit CSRF cookie uses `SameSite=None; Secure`.

## Verification steps after deployment

1. Send an `OPTIONS` request from each configured origin and confirm `204`, the exact `Access-Control-Allow-Origin` echo, `Access-Control-Allow-Credentials: true`, and `Vary: Origin`.
2. Send a mutation from an unlisted origin and confirm `403` before authentication.
3. Send a cookie-authenticated mutation without `x-csrf-token` and confirm `403`.
4. Send the same mutation with a matching `ns_csrf` cookie and `x-csrf-token` header and confirm the typed tRPC response.
5. Send an `x-nikahsaathi-api-version: 2` request and confirm `400`; send no version or version `1` and confirm `X-NikahSaathi-API-Version: 1`.
6. Confirm Bearer-authenticated Flutter requests continue without a browser CSRF token, while origin allowlisting still applies to browser cookie mutations.
7. First validate with `FORCE_HTTPS=false`; then enable `FORCE_HTTPS=true` at the deployment environment and repeat the health/API checks over HTTPS. Disable the HTTP listener or redirect at the proxy only after the HTTPS path is confirmed.

The repository contains local HTTP integration coverage for these boundaries. A deployed split-host run remains a release gate because it depends on the final API hostname, frontend hostname, TLS termination and proxy header behavior.

## Retention worker activation

The Heartbeat callback is `POST /api/scheduled/retentionSweep`. It authenticates the cron identity through the platform SDK, limits each sweep to 500 rows, and remains dry-run unless `RETENTION_WORKER_ENABLED=true`. Keep `RETENTION_LEGAL_HOLD=true` during any legal hold or incident investigation; this forces dry-run. After deployment, create the Heartbeat job with a six-field UTC cron expression, run it once in dry-run mode, confirm the candidate counts and execution logs, and only then enable destructive operational cleanup. The worker currently purges expired rate-limit buckets and old processed Telegram delivery records; it does not delete user content or evidence.
