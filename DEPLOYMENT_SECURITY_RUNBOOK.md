# Split-host Deployment Security Runbook

## Required production configuration

Set `CORS_ALLOWED_ORIGINS` to a comma-separated allowlist containing only the deployed Flutter Web/site origins, for example `https://app.example.com,https://web.example.com`. Do not use `*` with credentials. Serve the API and cookie-authenticated web client over HTTPS so the double-submit CSRF cookie uses `SameSite=None; Secure`.

## Verification steps after deployment

1. Send an `OPTIONS` request from each configured origin and confirm `204`, the exact `Access-Control-Allow-Origin` echo, `Access-Control-Allow-Credentials: true`, and `Vary: Origin`.
2. Send a mutation from an unlisted origin and confirm `403` before authentication.
3. Send a cookie-authenticated mutation without `x-csrf-token` and confirm `403`.
4. Send the same mutation with a matching `ns_csrf` cookie and `x-csrf-token` header and confirm the typed tRPC response.
5. Send an `x-nikahsaathi-api-version: 2` request and confirm `400`; send no version or version `1` and confirm `X-NikahSaathi-API-Version: 1`.
6. Confirm Bearer-authenticated Flutter requests continue without a browser CSRF token, while origin allowlisting still applies to browser cookie mutations.

The repository contains local HTTP integration coverage for these boundaries. A deployed split-host run remains a release gate because it depends on the final API hostname, frontend hostname, TLS termination and proxy header behavior.
