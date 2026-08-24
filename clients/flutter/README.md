# NikahSaathi Flutter foundation

This directory contains the shared Dart foundation for the future Flutter Web and mobile clients. Both clients must use the same server-enforced policies: profile fields are received only through the server projection, and posts, comments, messages and profiles must be checked by the server safety contract before write operations.

The client transport targets the existing tRPC gateway at `/api/trpc/{procedure}` and expects the standard `{ result: { data: { json: ... } } }` envelope. `NikahSaathiApiClient` now exposes the platform login URI, optional session-cookie forwarding, and `getSession()` with safe unauthenticated handling. Authentication remains server-owned; clients must never decide entitlements locally or send private evidence to Telegram.

The sandbox does not currently include the Flutter SDK, so this foundation is contract-first and has not been compiled here. When Flutter is installed, run `flutter pub get` and `flutter analyze`, then add platform-specific OAuth callback/navigation UI. The current Dart files were not compiled in this sandbox because neither `flutter` nor `dart` is installed; this is an explicit validation gate before shipping.
