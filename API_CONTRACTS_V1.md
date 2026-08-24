# NikahSaathi API Contracts v1

## Scope

The Flutter mobile and Flutter Web clients consume the server-authoritative tRPC procedures under `/api/trpc`. Contract version `v1` is represented by the stable procedure names and the shared TypeScript/Dart models in `clients/flutter/lib/platform_contracts.dart`.

## Safety response

Every content write returns a safety object containing the applied action, optional masked text, and highest observed risk. Clients must render the server-returned text and must never re-evaluate policy locally as an authorization decision.

## Privacy response

Profile and photo responses are projections. The server decides which fields and media are visible from plan, owner privacy, consent, verification, relationship and safety state. Clients must treat absent fields as intentionally unavailable, not as an invitation to fetch an alternate representation.

## Matrimonial procedures

The v1 surface includes profile upsert/read, interest replacement/listing, eligible discovery, match request/list/accept/reject, profile-photo linking/listing, user block/unblock, user reports, verification submission/listing, accepted-match-gated conversations, and published conversation messages. All identifiers are positive integers and all user-controlled content is bounded and safety checked server-side.

## Error compatibility

The Dart client maps transport failures into stable `ApiErrorCode` values. New server errors must preserve the existing mapping categories (`unauthorized`, `forbidden`, `notFound`, `validation`, `rateLimited`, `conflict`, `server`, `unknown`) rather than exposing database or provider error text.

## Compatibility rules

Additive fields are allowed. Removing or changing the meaning of a field, procedure input, enum value, or privacy rule requires a new contract version and a migration note. The server remains authoritative during rolling client upgrades.
