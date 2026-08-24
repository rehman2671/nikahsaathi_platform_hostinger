# Branding and domain change guide

## Current defaults

The product defaults are **NikahSaathi Platform** and the current Manus preview origin. Production hostnames are intentionally not hardcoded into application logic. The frontend API path remains relative (`/api/trpc`) so the web client and API can share a host or be split behind a reverse proxy without code changes.

## Minimum-change rename procedure

1. Change the built-in website title value `VITE_APP_TITLE` in the WebDev project settings. The frontend document title and server-side branding fallback read this configuration.
2. Update the visible product copy in `client/src/pages/Home.tsx` and the Telegram message prefix in `server/telegramOps.ts` if the new name must appear in user-facing copy. These are the only intentionally literal brand-copy locations in the current source.
3. Review `client/index.html` and replace its static fallback title if a non-Vite/static export is required. The runtime React title still comes from `VITE_APP_TITLE`.
4. Update the project title in WebDev settings and the repository README/project metadata if the public product identity changes. Do not rename database tables, API route prefixes, cookie names, or migration history solely for a branding change.
5. Replace the example and production values for `CORS_ALLOWED_ORIGINS` with the final frontend origins. Keep the API origin separate when using a split-host deployment.
6. Configure the OAuth callback/allowed origins in the identity provider and update any Telegram webhook URL outside the application if the API hostname changes.
7. Install and verify TLS for the new API/frontend hosts, keep `FORCE_HTTPS=false` during certificate setup, then set `FORCE_HTTPS=true` after HTTPS verification. Set `TRUST_PROXY=true` only behind a trusted proxy that supplies `x-forwarded-proto`.
8. Update Flutter client construction to use the new API base URL through deployment configuration; the shared API contracts and route paths do not need renaming.

## What must not be changed casually

Do not change `X-NikahSaathi-API-Version`, `ns_csrf`, `app_session_id`, database table names, migration filenames, Telegram receipt identifiers, or storage keys as part of a display-name change. They are compatibility and security identifiers. If the API vendor name itself changes, add a new versioned header or compatibility alias rather than silently changing the v1 contract.

## Verification checklist

After a change, verify the home page title, OAuth callback, CORS preflight from every frontend origin, cookie-authenticated CSRF-protected mutation, Flutter bearer request, Telegram webhook secret validation, API v1 response header, storage authorization and HTTPS redirect behavior. Keep the old hostname redirect active only for the migration period and remove it after traffic and OAuth logs confirm that clients have moved.
