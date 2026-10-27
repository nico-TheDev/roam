# 20 · Host side: become a host and edit your stays

Status: approved

## Goal
Any signed-in guest can tap "Become a host" on Profile, which creates their public host profile in Sanity. A host then sees the stays they own and can change a stay's nightly price and cleaning fee. Hosting is a feature of a normal account, like Airbnb: there is no separate host sign-up and guest flows don't change.

## Decisions
From the question panel:
- **Same app.** Host screens are pushed screens opened from Profile, not a second tab bar. A guest sees no host UI until they opt in.
- **Ownership by Clerk user, no organizations.** Clerk Organizations stays off (it was enabled and switched back off while exploring). Co-hosts would be a later plan with a migration.
- **Scope:** become a host, list own stays, edit own stays. No co-hosts, creating stays, bookings or payouts.

Defaults picked (change any before approving):
- **Ownership is stored as `host.ownerKey`, not the user ID.** The dataset is public, so a raw Clerk ID would be readable by anyone. `ownerKey` = HMAC-SHA256 of the verified Clerk user ID with the server secret `HOST_OWNER_SECRET` (hex). Computed only in API routes; it can't be reversed or linked to a Clerk account. The field is read-only in Studio and is excluded from every app projection.
- **A property is owned by the user whose `ownerKey` is on its `host` reference.** Existing seeded hosts have no `ownerKey`, so no one owns them.
- **Editable fields: `nightlyPrice` and `cleaningFee` only.** `minNights`, `maxGuests`, `petsAllowed` and amenities feed the generated copy (`generate-copy.ts`), so changing them would leave `summary`/`description` stale; copy regeneration is a local script today. Price and cleaning fee aren't copy facts. Step 3 re-checks this before building.
- **Bounds:** price integer 1–10,000, cleaning fee integer 0–2,000, both required to be integers (prices are code-parsed, never guest or model text).
- **All host reads and writes go through API routes** with a server-only Sanity token `SANITY_API_WRITE_TOKEN` (new, never `EXPO_PUBLIC_`). The routes call the Sanity HTTP API with plain `fetch` (query endpoint with real parameters, `data/mutate`); no new dependency. The live API is used, never the CDN, so ownership checks can't read stale data.
- **The client never sends a user ID.** Routes take it from `getUserId` (`src/lib/api-auth.ts`), which verifies the Clerk token.
- **Not-yours and not-found look the same** (404), so IDs can't be probed.

## Out of scope
Organizations, co-hosts, invitations, creating or deleting stays, photos, availability, bookings and payouts (plan 19's private store is where those go), regenerating copy or embeddings, webhooks, a separate host app.

Known consequence: a new host owns no stays, because stays can't be created from the app yet. The host home shows an honest empty state ("No stays yet"). Until creation exists, a stay is attached to a host by setting its `host` reference in Studio.

## Steps
### 1. Sanity: owner field
Read `studio/schemaTypes/host.ts` and `property.ts` (find the host reference field name). Re-confirm in `studio/scripts/generate-copy.ts` and `studio/seed/check-copy.ts` that `nightlyPrice` and `cleaningFee` aren't copy facts; trim the editable list if they are. Add `ownerKey` (string, hidden from app projections, read-only in Studio, not required so seeded hosts stay valid) to `host`. This changes the schema with content in place, so it is covered only by approving this plan. Deploy with `cd studio && npx sanity schema deploy` and `npx sanity deploy` (never the MCP `deploy_schema`).
Done when: `get_schema` shows the field and the seeded hosts and stays still validate (`documents_validate`).

### 2. Server helper
`src/lib/host-server.ts`: `ownerKeyFor(userId)` (HMAC with `HOST_OWNER_SECRET`, error if unset), a tiny `sanityQuery(groq, params)` and `sanityMutate(mutations)` over `fetch` using `EXPO_PUBLIC_SANITY_PROJECT_ID`, `EXPO_PUBLIC_SANITY_DATASET` and `SANITY_API_WRITE_TOKEN`, and `findHost(ownerKey)`. Add the new variable names (no values) to `.env.example`.
Done when a script run through the helper returns the same `ownerKey` for the same user, a different one for another user, and throws a clear error if a variable is missing.

### 3. API: host state and become a host
- `src/app/api/host/stays+api.ts`, `GET`: `getUserId` or 401. Returns `{ isHost, stays }`. `isHost` is whether a `host` with this `ownerKey` exists; `stays` is `*[_type=="property" && host->ownerKey == $ownerKey]` (card fields plus `nightlyPrice`, `cleaningFee`), params passed as real query parameters.
- `src/app/api/host/join+api.ts`, `POST`: `getUserId` or 401. If a host with this `ownerKey` exists, return it; otherwise create one (name from the Clerk user's first name via `@clerk/backend`, fallback "Host"; slug from the name plus a short random suffix; `hostingSince` this year; `isSuperhost: false`; Sanity-generated ID) and return `{ hostId }`. Idempotent per user; a double tap that races is cleaned up by re-querying and keeping the oldest.
Done when: no token → 401; a user with no host gets `isHost: false`; join twice returns the same `hostId`; the stored document contains no Clerk user ID anywhere.

### 4. API: edit a stay
`src/app/api/host/stays/[id]+api.ts`, `PATCH`: 401 without a session; loads the property by ID with its host's `ownerKey`; 404 unless it matches the caller's key; accepts only `nightlyPrice` and `cleaningFee` as integers within bounds (anything else in the body → 400, nothing written); patches the published document; returns the saved values.
Done when: the owner can change a price; another user gets 404 on the same ID; a draft ID (`drafts.…`) is rejected; out-of-range, non-integer or extra fields get 400; and the stored `copyFactsHash`-based copy is untouched.

### 5. App: Profile entry, become a host, host home, edit sheet
- `src/lib/host.ts`: `useHost()` (calls `GET /api/host/stays` with the Clerk token; loading, error, `isHost`, `stays`, `refresh`), `becomeHost()`, `saveStay()`. Results are `AuthResult`-style; API errors are mapped, never shown raw.
- Profile: a "Hosting" row. Not a host: "Become a host" opens form sheet `host/start` (what hosting means, one button, loading and error with retry). A host: "Host dashboard".
- `src/app/host/index.tsx` (pushed screen): the owner's stays as `ListingCard`s with loading, error and the empty state above. Tapping a stay opens form sheet `host/stay/[id]` with `TextField`/`Stepper` fields for price and cleaning fee, a Save button, validation text and an error line.
- Routes sit in the signed-in group; screens never navigate after success except to dismiss their own sheet.
- Existing components and tokens only; anything new (a row, a header) goes into `src/components/` and `/design-system`.
Done when: a fresh guest can become a host and land on the empty state; a host with an attached stay can change its price and see it on the dashboard and, after the CDN refreshes, on the stay's details.

### 6. Analytics
`host_started` (no properties) and `host_stay_edited` (`stay_id`, `fields`: names only, `outcome: saved | failed`). Never names, typed values or user IDs. PostHog failures never block.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass.
- Existing guest sign-in, new sign-up and sign-out are unchanged (Organizations stays off).
- Server, with real tokens from two users: every case under steps 2–4, including cross-user 404, no token 401, bad values 400, draft ID rejected.
- Dataset check: query `host` documents and confirm `ownerKey` is a hex digest and no document contains a `user_` ID.
- Simulator, screenshots checked against the design system: Profile row in both states, start sheet (default, loading, error), host home (loading, error, empty, populated), edit sheet (default, saving, error, validation).
- End to end: sign up a new guest → Become a host → empty state → attach a seeded stay to the new host in Studio → pull to refresh → change its price → open the stay from Home as a guest and see the new price (allow for CDN delay) → sign in as another user and confirm the stay isn't listed and a direct PATCH returns 404.

## AGENTS.md updates
- **Who owns what → Content:** `host.ownerKey` (HMAC of the Clerk user ID) is the ownership link; a stay is owned by its host's owner; host writes go only through `/api/host/*` with `SANITY_API_WRITE_TOKEN`; the editable fields are `nightlyPrice` and `cleaningFee`, and why the others are read-only.
- **Rules:** `HOST_OWNER_SECRET` and `SANITY_API_WRITE_TOKEN` join the secret-key list; host routes take the user from the verified token only.
- **Analytics:** add `host_started` and `host_stay_edited`.
- **Design system → Routes:** the Profile "Hosting" row and the `host/` screens.
