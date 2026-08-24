# Flutter Client Integration Notes

## Contract boundary

Flutter Web and Flutter mobile clients must treat the NikahSaathi backend as the single policy authority. Clients must never implement independent bad-word, phone-number, link, entitlement, community-status or moderator-permission decisions. Every write path should call the server content-safety contract first, and every profile view should consume the server-projected field set.

## Shared domain vocabulary

The canonical contract names live in `shared/platformContracts.ts`. Mirror these enums and response shapes in Dart using sealed classes or enums: `ContentSurface`, `SafetyAction`, `CommunityStatus`, `CommunityCategory`, `ReviewCaseType`, `PlanCode` and `ProfileVisibilityContext`.

## Required client calls

| Client need | Backend contract |
|---|---|
| Test text before submit | `operations.contentSafetyCheck` |
| Load profile safely | `operations.profileProjection` |
| Browse staged communities | `operations.communities` through an authorized client endpoint when member-facing read access is enabled |
| Check participation permissions | `operations.communityAccess` |
| Join or leave an active community | `operations.joinCommunity` / `operations.leaveCommunity` |
| Submit uncertain or unsafe content for human review | `operations.createHumanReviewCase` |

## Privacy rules

The client should render only fields returned by `profileProjection`. It must not infer that a paid plan unlocks private photos, phone numbers, exact location, social handles or hidden community identity. A declined, expired or missing subscription is represented by the server as Free access.

## Error handling

Map authorization failures to a protected-state screen, Coming Soon member-list failures to a read-only community screen, safety blocks to a respectful explanation with no raw rule pattern disclosure, and review-case creation to a human-review pending state. Preserve request correlation IDs when the API adds them.

## Release checklist

Before releasing either Flutter client, verify policy parity against the backend for all four surfaces: posts, comments, messages and profiles. Test active, Coming Soon and archived community states; Free, Basic and Advanced entitlement fallback; owner privacy denial; missing consent; matched and blocked relationship states; and human-review escalation.

## Generated-client workflow

The backend contract is tRPC-first. Until the Flutter client repository is created, `shared/platformContracts.ts` is the canonical hand-maintained contract source and the generated TypeScript `AppRouter` type remains the web reference. The Flutter client phase should introduce a small code-generation adapter in the client repository rather than duplicating business rules in Dart.

The client repository should pin the backend contract version in a generated `nikahsaathi_contract_version.dart` file. A contract refresh is performed only after a backend checkpoint: export or inspect the current `AppRouter` input/output shapes, update the Dart DTO/enums and API adapter, run `dart format`, `flutter analyze` and the client contract test suite, then record the backend checkpoint version in the client changelog. Breaking field removals or renamed enum values require a new major contract version; additive optional fields are minor changes.

Authentication must attach the Manus session cookie or the approved mobile session mechanism through the shared API adapter. UI screens must not manually construct authorization headers or bypass the adapter. All requests should carry a request correlation identifier once the backend adds one, and logs must exclude private profile values, photos, phone numbers, exact locations and message bodies.

The adapter should map backend outcomes into a stable Dart error model: `unauthorized` for sign-in, `forbidden` for role or community access, `policyBlocked` for safety decisions, `readOnly` for Coming Soon communities, `reviewPending` for human fallback, `validation` for malformed operator input and `server` for unexpected failures. The UI then renders these states consistently on Web and mobile.

Regeneration gate:

| Gate | Required result |
|---|---|
| Contract source | `shared/platformContracts.ts` and `AppRouter` reviewed at the recorded checkpoint |
| Dart models | Enums and DTOs match backend names and nullability |
| Auth adapter | Session is attached centrally; no screen-level cookie/header handling |
| Policy parity | Four surfaces tested: posts, comments, messages and profiles |
| Community parity | Active, Coming Soon and archived behavior covered |
| Entitlement parity | Free fallback, active Basic/Advanced, expiry and owner privacy covered |
| Release evidence | `flutter analyze`, client tests and backend `pnpm check && pnpm test` recorded together |
