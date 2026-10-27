# 23 · Manage stays: host overview, bookings, pause, full edit

Status: done

## Goal
The Hosting screen becomes a place to run your stays, not just list them. A host sees every stay with its status and next booking, opens one to see its upcoming bookings, pause or resume it, and edit everything about it (not only price and cleaning fee). Builds on plans 20 (host side) and 21 (add stay); read both `Result`s first.

## Decisions
From the question panel:
- **Scope:** per-stay overview, upcoming bookings, pause/unpause, edit more fields.
- **No delete.** Pause only; a stay with bookings never disappears.

Defaults picked (change any before approving):
- **Pause is `property.listed` (boolean, optional, missing = listed).** Paused stays are filtered out of Home, Search, the host's "other stays" on the host sheet and Saved with `listed != false` in GROQ. A paused stay still opens by direct link/Saved id, shows a "Not available right now" banner, and `Book this stay` is disabled. The server refuses quotes and checkouts for a paused stay (`booking_unavailable`, `reason: paused`). Confirmed bookings and open holds are untouched. Pausing never cancels anything. This is a schema change with content in place, covered only by approving this plan; deploy from `studio/` (never the MCP `deploy_schema`).
- **Host bookings are read only, from Neon.** `GET /api/host/bookings` gets the caller's stay ids from Sanity (owner check as in plan 20), then selects confirmed `bookings` for those ids with `check_out >= today`, soonest first. It returns dates, guests, `amountCents` (what the guest paid: nights x price + cleaning fee) and the stay id. **No guest name, email or Clerk id** leaves the server in this plan (a "guest first name" would need a Clerk lookup and a privacy decision; later). No payouts or Stripe fees shown.
- **Edit more fields reuses the add-stay rules.** `PATCH /api/host/stays/[id]` accepts any subset of `StayInput` keys (not `rating`, `reviewCount`, `slug`, `host`). The server loads the stay, merges the changes, and validates the merged result with the same `stayErrors` (`src/lib/host-stay-rules.ts`). Price, cleaning fee, photos and cancellation policy write directly. If any copy fact changes (title, category, city, state, guests, bedrooms, beds, bathrooms, pets, amenities, min nights, check-in/out, vibe notes), the server regenerates `summary`/`description`/`neighborhood` with `writeCopy` + `check-copy`, updates `copyFactsHash`, and on failure returns 422 and writes nothing. When `petsAllowed` changes, the shared `policies` references are recomputed with `sharedPolicyIds`. Slug never changes (links stay stable).
- **Old stays that fail the merged validation** (a seeded stay with fewer than 5 photos, say) return 400 `incomplete` listing the field names, and the edit screen shows those fields as "Needs attention". Nothing is half-saved.
- **Changing a stay never touches confirmed bookings** (they store a snapshot and the amount paid). New limits (guests, min nights) apply to new quotes only.
- **Pause toggle and price edits are instant** (optimistic with rollback on error). Edits that regenerate copy show "Writing your listing…" like add-stay.
- **Same tools as before:** live Sanity API with `SANITY_API_WRITE_TOKEN`, `getUserId` on every route, not-yours and not-found both 404, `drafts.` ids rejected. No new dependency.

## Out of scope
Deleting stays, guest names or contact, messaging, cancelling or refunding bookings, blocking dates, payouts, earnings reports, co-hosts, changing a stay's host, editing `rating`/`reviewCount`, regenerating embeddings by hand (the index follows the dataset).

## Steps
### 1. Schema: `listed`
Add `listed` (boolean, group `basics`, `initialValue: true`, not required, description "Turn off to hide the stay from guests") to `studio/schemaTypes/property.ts`. Deploy with `cd studio && npx sanity schema deploy` and `npx sanity deploy`. Add a `listed != false` filter to the places that list stays: `src/lib/stays.ts`, `buildQuery` in `src/lib/search-query.ts`, `src/lib/host-profile.ts` and `src/lib/saved-stays.ts` (the Saved screen drops paused stays; the saved id list is not changed). `studio/scripts/generate-copy.ts` keeps seeing all stays.
Done when: `get_schema` shows the field, existing stays still validate and still appear everywhere, and setting `listed: false` on one stay in Studio removes it from Home, Search, Saved and the host sheet but not from `stay/[id]` by link.

### 2. Booking guard and stay banner
`src/lib/booking-server.ts`: the stay query also reads `listed`; quote and checkout return `unavailable` / `paused` when it is false (existing availability checks stay). `src/lib/stay-details.ts` reads `listed`; `stay/[id]/index.tsx` shows an `Alert` ("Not available right now") and disables `BookingBar` when paused. Availability endpoint returns the same reason.
Done when: a paused stay can't be quoted or checked out by direct API call (409 `paused`), and a listed stay behaves exactly as before.

### 3. API: host bookings
`src/app/api/host/bookings+api.ts`, `GET`: `getUserId` or 401; stay ids via `sanityQuery` with `ownerKey`; Neon `bookings` filtered by those ids, confirmed, `check_out >= current_date`, ordered by `check_in`; returns `{ bookings: [{ id, stayId, checkIn, checkOut, guests, amountCents }] }` with no user data. No stays means an empty list without touching Neon. Pool is closed in `finally`, as in `bookings+api.ts`.
Done when: the owner sees bookings only for their own stays; another host gets none of them; a guest with no host gets an empty list; the response contains no `clerk_user_id`.

### 4. API: pause and full edit
Extend `src/app/api/host/stays/[id]+api.ts`:
- `GET`: the stay as `StayInput` plus `listed`, `id`, `slug` (owner only, else 404), with photo ids and urls and `cancellationPolicyId`, so the edit screen has every value.
- `PATCH`: body is a subset of `StayInput` keys plus `listed` (boolean). Unknown keys, empty body or a merged result that fails `stayErrors` return 400 (nothing written). Copy facts changed means regenerate (`writeCopy`, 422 on failure) and refresh `copyFactsHash` and `policies`. Photos are checked with `assetsAreImages`, the cancellation policy with the same `kind == "cancellation"` query as create. Returns the saved summary fields.
- Overview data: extend `GET /api/host/stays` rows with `listed`.
Done when: owner can change each field group; changing only price/fees/photos/policy/`listed` doesn't call the model; changing a copy fact does and `generate-copy.ts` then skips the stay; a forced checker failure returns 422 and leaves the document byte-for-byte unchanged; cross-user 404; extra field 400.

### 5. Client lib
`src/lib/host.ts`: `HostStay` gains `listed`; `useHostBookings()` (same pattern and `invalidate()` as `useHost`), `useHostStay(id)` (GET one for the edit form), `updateStay(id, changes)` (replaces `saveStay`, same `host_stay_edited` event), `setListed(id, listed)` (optimistic, rollback with an error). Map new reasons through `hostMessage`: `paused`, `incomplete`, `copy_failed`. `LIMITS`/`EditableField` are removed in favor of `STAY_LIMITS` and `stayErrors`.
Done when: `tsc` passes and no screen imports the removed names.

### 6. Overview screen
Rework `src/app/host/index.tsx` (keep header: back, "Hosting", add button):
- A `StatsRow`: Stays (count), Listed, Upcoming bookings.
- One card per stay (new `HostStayCard` in `src/components/`): cover photo, title, place, price, a `Badge` for `Listed` / `Paused`, next booking line ("Nov 3 – 6 · 2 guests" or "No upcoming bookings"), and a `Toggle` for listed. Tapping the card opens the stay manager. Paused cards are visually muted by token (opacity token or `text-muted`), not hex.
- Loading skeletons, error with retry, empty state as today. Pull to refresh refetches both stays and bookings.
Done when: all four states look right and the toggle pauses a stay in one tap.

### 7. Stay manager screen
Replace the form sheet `host/stay/[id]` with a pushed screen `src/app/host/stay/[id].tsx` (update `_layout.tsx`):
- Header with title, status `Badge`, and "View as guest" (opens `stay/[id]`).
- **Status** section: listed `Toggle` with one line explaining what pausing does.
- **Upcoming bookings** section: `BookingCard`-style rows (new compact `HostBookingRow`): dates, nights, guests, total. Empty line when none.
- **Details** sections, each an edit row that opens the shared form: Price and fees, Basics (title, type, place), Rooms and guests, Pets and amenities, Check-in/out, Vibe notes, Photos, Cancellation policy.
- Extract the field groups from `src/app/host/add.tsx` (`Group`, `StepRow`, photo and amenity pickers) into `src/components/stay-form/` so add and edit use the same controls and the same `stayErrors`. Add-stay behavior must not change. Edit saves only what changed; the button reads "Save" and "Writing your listing…" while copy regenerates. Fields flagged by 400 `incomplete` show "Needs attention".
Done when: every group can be edited and saved on a stay created by plan 21, and add-stay still works end to end.

### 8. Design system and analytics
Add `HostStayCard`, `HostBookingRow` and the extracted form groups to `/design-system` (next section number). Events: `host_stay_listed_toggled` (`stay_id`, `listed`), `host_bookings_viewed` (`count`), `host_stay_edited` keeps `fields` (names only) and adds `regenerated: boolean`. Never dates, amounts, names or text.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass; `check-copy-selftest.ts` passes; existing add-stay, booking and search flows unchanged.
- Server, with two real users: cross-user 404 on GET/PATCH, no token 401, extra field 400, merged-invalid 400, forced copy failure 422 with an unchanged document, `drafts.` id rejected, host bookings contain no user ids, paused stay returns 409 on quote and checkout.
- Dataset: `documents_validate` on all properties after the schema change; stays without `listed` still appear everywhere.
- Search and embeddings: a paused stay never appears in results, including for a sentence that matches its vibe notes.
- Simulator screenshots against the design system: overview (loading, error, empty, populated with a paused stay), stay manager (with and without bookings, needs-attention field, saving, copy failure), stay details banner for a paused stay.
- End to end: sign in as a host with a stay → book it as another user (test card `pm_card_visa`) → host overview shows the booking and the count → pause the stay → it disappears from Home and Search for the guest, the link shows the banner, booking is blocked → resume → edit amenities and vibe notes → copy regenerates and still passes `check-copy` → edit price and see it on the details page after the CDN refreshes.

## AGENTS.md updates
- **Who owns what → Content:** `property.listed` (missing = listed) and where it is filtered; hosts can edit every stay field through `PATCH /api/host/stays/[id]` validated by `stayErrors`, with copy regenerated when a copy fact changes; replaces "Hosts can edit only `nightlyPrice` and `cleaningFee`".
- **Who owns what → Hosting / Bookings:** `GET /api/host/bookings` (owner's stays only, no guest data); paused stays can't be quoted or checked out.
- **Rules (stay details):** paused banner and disabled booking bar.
- **Analytics:** add the three events above.
- **Design system → Routes and components:** `host/stay/[id]` is a pushed screen, `HostStayCard`, `HostBookingRow`, `stay-form/`.

## Result
Built as planned, with these differences: older stays are only validated on the fields being changed unless the copy is rewritten (so a seeded stay with 4 photos can still change its price); `GET /api/host/stays/[id]` and the field groups live in `src/components/stay-form/` with the draft helpers in `src/lib/stay-draft.ts` and `src/lib/use-photo-picker.ts`; each detail section edits inline on the manager screen (no extra routes); the paused banner reuses the `danger` Alert tone (there is no neutral one). Not exercised: a forced 422 copy failure, the 10-stay cap, the populated overview and stay manager in the simulator (no host account with stays signed in, no tap automation), a real booking showing up in host bookings (the list was empty for both test users), and the CDN-side removal of a paused stay from Home and Search. `pine-hollow-cabin` test stays from plan 21 still exist; the one used for testing ended with its original values.
