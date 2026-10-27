# 21 · Host side: add a stay

Status: done

## Goal
A host taps "Add a stay" on the host dashboard, picks 5–30 photos, fills a short form (core facts plus 3–6 vibe notes), and publishes. The server writes the summary, description and neighborhood with the same Agent Action and the same copy checker the seed uses, creates the published `property` owned by that host, and the stay shows on the dashboard and in Home/Search. Builds on plan 20 (host side); replaces its "creating stays" exclusion.

## Decisions
From the question panel:
- **Copy is generated and checked on the server.** Host never types summary/description/neighborhood. Failing copy is never written (no stay is created).
- **Photos: minimum 5, maximum 30**, picked from the library and uploaded to Sanity assets through an API route. First photo is the cover.
- **Fields: the core set.** Title, category, city, state, nightly price, cleaning fee, min nights, max guests, bedrooms, beds, bathrooms, pets allowed, amenities (fixed list), 3–6 vibe notes, photos, cancellation policy (picked from existing shared policies).

Defaults picked (change any before approving):
- **No schema change.** The existing `property` schema already holds everything; the 30-photo cap is enforced by the API. Nothing to redeploy in Studio.
- **Facts are typed, bounded values only** (same rule as plan 20): title 3–60 chars; category from `CATEGORIES`; state from the 13 states `check-copy.ts` knows (extending that table is a one-line change later); city 2–60 chars; price integer 1–10,000; cleaning fee 0–2,000; min nights 1–30; max guests 1–16; bedrooms 0–10 (0 = studio); beds 1–20; bathrooms 0.5–10 in steps of 0.5; amenities must be on the fixed list, unique, in the order picked (first four are highlights); vibe notes 3–6, each 1–140 chars.
- **Server-set fields:** `host` reference (the caller's host, never from the body), `slug` (title + short random suffix), `rating: 0`, `reviewCount: 0` (schema requires them; a new stay has no reviews, so the card shows no rating; verified in step 5), `checkInTime 15:00`, `checkOutTime 11:00`, `copyFactsHash` (so `generate-copy.ts` skips it), and the shared policies the seed attaches (house rules, check-in, payments, safety, plus the pet policy when pets are allowed).
- **Copy prompt is shared, not duplicated.** The instruction text, fact sheet and hash move from `studio/scripts/generate-copy.ts` into `studio/seed/copy-prompt.ts` (pure, no imports from Sanity) and both the script and the API route import it, so the rules can't drift. Generation retries once with the checker's problems fed back, like the script.
- **Agent Actions over plain `fetch`** with `SANITY_API_WRITE_TOKEN` (no new dependency), `noWrite: true`, same `_.schemas.default` schema ID. Step 1 confirms the write token is allowed to run Agent Actions; if not, I stop and ask.
- **Create is one request.** `POST /api/host/stays` generates, checks, and creates the published document in one mutation. On copy failure it returns 422 (`copy_failed`) and writes nothing. Uploaded photos that never got attached are orphan assets, which Sanity already allows; no cleanup job.
- **Photo upload is its own route**, `POST /api/host/photos`, one image per request (raw body, `image/jpeg|png|webp|heic`, 10 MB max). It returns the asset ID. The create call receives asset IDs; the server confirms each exists and is an image asset before using it.
- **Cap of 10 stays per host**, to bound generation quota. Over the cap: 409.
- **Ownership as in plan 20.** `getUserId`, then `ownerKeyFor`, then `findHost`; no host yet → 404 `not_host`. Client never sends a user ID or host ID.
- **UI is one pushed screen** `src/app/host/add.tsx` (long form; a form sheet clipped pinned footers in plan 19). Sections: Photos, Basics, Place, Pricing, Space, Amenities, Vibe notes, Cancellation. A pinned "Publish stay" button.

## Out of scope
Editing anything beyond price and cleaning fee (plan 20 still applies), deleting or unpublishing stays, drag-to-reorder photos beyond "make cover", alt text, coordinates, check-in/out times, availability, drafts saved across app launches, other states/countries, regenerating copy after creation, content moderation of vibe notes beyond the copy checker.

## Steps
### 1. Shared copy prompt and write-token check
Read `studio/scripts/generate-copy.ts` and `studio/seed/check-copy.ts`. Move `INSTRUCTION`, `factSheet`, `hashOf`, `STATE_NAMES` into `studio/seed/copy-prompt.ts`; the script imports them. Run `cd studio && npx sanity exec scripts/generate-copy.ts --with-user-token -- --baseline` before and after: output identical (no behavior change). Then call the Agent Actions HTTP endpoint once with `SANITY_API_WRITE_TOKEN` and `noWrite: true`.
Done when: baseline output is unchanged and the write token returns generated copy. If it is refused, stop and ask which token to use.

### 2. Server helpers
Extend `src/lib/host-server.ts`: `generateCopy(facts, problems)` (Agent Action by `fetch`), `uploadImage(bytes, contentType)` (`/assets/images/<dataset>`), `assetsAreImages(ids)`, `policyIdsForNewStay(pets)`. Server imports `check-copy` and `copy-prompt` from `studio/seed/` by relative path; confirm Metro's API route bundling resolves them (if not, stop and propose a `src/lib/` copy kept in sync by a test).
Done when: a script run through the helpers generates copy that passes `checkCopy` for a sample fact sheet, and a missing variable throws the existing "Hosting is not configured".

### 3. API routes
- `src/app/api/host/photos+api.ts`, `POST`: 401 without session, 404 `not_host`, 413 over 10 MB, 415 wrong type; returns `{ assetId }`.
- `src/app/api/host/stays+api.ts`: add `POST` next to the existing `GET`. Validates the body against the limits above (unknown or missing key → 400, nothing written); 409 over the cap; checks photo asset IDs and the cancellation policy ID (must be `kind == "cancellation"`); generates and checks copy (two attempts); creates the `property` with Sanity-generated ID; returns `{ id }`.
- `src/app/api/host/policies+api.ts`, `GET`: the cancellation policies (`id`, `title`, `body`) for the picker.
Done when: no token 401; non-host 404; each bound rejected with 400; 4 or 31 photos 400; a bad asset ID 400; a valid body creates a published stay owned by the caller whose copy passes `check-copy --baseline`; a forced checker failure returns 422 and creates nothing.

### 4. App: client lib
Extend `src/lib/host.ts`: `LIMITS` for the new fields, `validateStay(draft)` returning per-field errors, `uploadPhoto(uri)`, `createStay(draft)`, `useCancellationPolicies()`. Errors map through `hostMessage` (add `copy_failed`, `too_many`, `not_host`, `too_large`). Success calls `invalidate()`.
Done when: `tsc` passes and the validators match the server limits case for case.

### 5. App: add-stay screen
- `src/app/host/add.tsx` (pushed; registered in the signed-in group) using existing `Section`, `TextField`, `Stepper`, `Toggle`, `SegmentedControl`, `Chip`, `Alert`, `Button`, `PressableScale`.
- New `PhotoGrid` in `src/components/` (picks with `expo-image-picker` multi-select, shows thumbnails with upload state per photo, remove, "make cover", count `n / 30`, min-5 hint; failed uploads retry individually). Added to `/design-system` as the next section. Read the SDK 58 `expo-image-picker` docs before writing it.
- States: default, validation (shown after first Publish tap or blur), uploading (progress `3 / 8`), publishing ("Writing your listing…", can take several seconds), error (Alert with retry, form keeps its values), copy_failed ("We couldn't write a listing from these notes. Make the notes more specific and try again."), success (`router.replace("/host")`, stay visible in the list).
- Dashboard (`src/app/host/index.tsx`): "Add a stay" `IconButton` in the header and a button in the empty state; the empty-state text drops "coming soon".
- Tokens only; any value with no token is listed under Notes as a proposed token.
Done when: a host can add a stay end to end in the simulator and see it on the dashboard; a card with 0 reviews looks right (checked against `ListingCard`; fix the card only if it shows "0.0").

### 6. Analytics
`host_stay_created` (`stay_id`, `category`, `photo_count`, `amenity_count`, `outcome: created | failed`, `reason` on failure). Never title, city, notes, prices, photos or user IDs. PostHog failures never block.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass; `check-copy-selftest.ts` still passes; generate-copy `--baseline` output unchanged from before step 1.
- Server, with real tokens from two users (every case in step 3), plus: second user can't attach the first user's host, cap of 10 returns 409, `drafts.` IDs and non-image assets rejected.
- Dataset check: the new `property` validates (`documents_validate`), has `host` set to the caller's host, 5+ images, copy that passes the checker, `copyFactsHash` set, and no `user_` ID anywhere.
- `generate-copy.ts` run afterward skips the new stay (facts unchanged).
- Search: after the embeddings index catches up, a sentence matching the new stay's vibe notes returns it.
- Simulator screenshots vs design system: add screen (default, validation, uploading, publishing, error, copy_failed), dashboard header and empty state, `PhotoGrid` in `/design-system`.
- End to end: sign in as a host → Add a stay → pick 6 photos → fill the form → Publish → land on the dashboard with the new stay → open it from Home as a guest and see the generated copy and photos → price edit from plan 20 still works on it.

## AGENTS.md updates
- **Who owns what → Content:** hosts can create stays through `POST /api/host/stays` (server-set `host`, `slug`, `rating`/`reviewCount` 0, check-in/out defaults, `copyFactsHash`); copy for those stays is generated and checked on the server from the shared `studio/seed/copy-prompt.ts`; photos 5–30 via `/api/host/photos`; 10 stays per host. Replaces "creating stays" as not possible from the app.
- **Generated copy:** the script and the API route share `copy-prompt.ts`.
- **Rules:** host stay routes list; stay details/host sections mention the add screen.
- **Analytics:** add `host_stay_created`.
- **Design system → Routes and components:** `host/add`, `PhotoGrid`, new `/design-system` section.

## Result
Built as planned, with these differences: the limits and `stayErrors` live in `src/lib/host-stay-rules.ts` (shared by app and server) instead of `host.ts`; `hashOf` is async (Web Crypto SHA-1, same digest, so stored hashes stay valid); photos accept jpeg/png/webp only; tiles in `PhotoGrid` are sized from the measured width because `aspect-square` collapsed them; `serverError` now logs the cause. Not exercised: the 10-stay cap (409), the form's validation/uploading/publishing states in the simulator (no tap automation available), and an on-device photo pick and upload. Three test stays ("Pine Hollow Cabin", "Pine Hollow Cabin 2") exist in production under test user roamuser1 and need removing.
