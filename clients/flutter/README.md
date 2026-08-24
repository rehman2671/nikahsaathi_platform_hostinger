# NikahSaathi Flutter foundation

This directory contains the shared Dart foundation for the future Flutter Web and mobile clients. Both clients must use the same server-enforced policies: profile fields are received only through the server projection, and posts, comments, messages and profiles must be checked by the server safety contract before write operations.

The client transport targets the existing tRPC gateway at `/api/trpc/{procedure}` and expects the standard `{ result: { data: { json: ... } } }` envelope. `NikahSaathiApiClient` now exposes the platform login URI, optional session-cookie forwarding, and `getSession()` with safe unauthenticated handling. Authentication remains server-owned; clients must never decide entitlements locally or send private evidence to Telegram.

The client foundation has been validated with Flutter 3.47.1 and Dart 3.13.1. Run `flutter pub get`, `flutter test`, and `flutter analyze` from this directory. The package includes focused tests for typed `ApiErrorCode` mapping, unauthenticated session fallback, cookie forwarding, and OAuth login URI construction. Platform-specific OAuth callback/navigation UI remains a client-application layer to be built on top of this package. Clients must preserve the server-authoritative entitlement, privacy projection, safety decision and human-review boundaries.
