# 10 · Search results from Sanity, with PostHog tracking

Status: done

Builds on `07-home-search-tabs.md` (Search tab, `src/lib/search.ts`, `ListingCard`, `SearchField`, `Chip`) and `09-generated-copy-embeddings-live-home.md` (Dataset Embeddings are `ready` on `production`, `src/lib/stays.ts` reads Sanity from the app). Design: `assets/prompt-imgs/search.png` (attached again if building in a new session).

## Goal
Typing a sentence on the Search tab returns stays from Sanity, ranked, in the layout of the design. Every search is tracked in PostHog as either "returned results" or "returned nothing", without sending what the guest typed.

## Design (what to build)
Screen is `src/app/(tabs)/search.tsx` with a query. Top to bottom, `px-5` edges:
1. **Search bar row:** round back button (`IconButton`, chevron-left), grey pill field (`bg-surface-alt`, magnifier, text "Cabins in California" in `font-jakarta-medium`), and on the right inside the pill a sliders/filter icon (`SlidersHorizontal`, visual only). `SearchField` gets an optional trailing slot.
2. **Chip row** (horizontal scroll): the active filters parsed from the query, shown selected (lavender `bg-secondary`, bold label "Cabins"), tap removes. In the design only "Cabins" is selected; the unselected "Under $300 / Pet Friendly / Quiet" are sample content and are not built (decision below).
3. **Count and sort row:** left "124 stays" (`text-body`, ink), right "Sort by **Best match**" followed by a chevron-down, bold value. The count is the real number of matches.
4. **Result cards:** `ListingCard` with `favoritePlacement="inline"`: photo left (rounded, ~130 wide), title in bold (2 lines), heart in a grey circle top right, map-pin + "City, ST" in muted, yellow star + rating + "(reviews)" in muted, two amenity badges (icon + label, neutral), "$289 / night" with the price bold. Cards are separated by `gap-3`, the white card background and `shadow-card` as built today.
5. **Bottom bar:** the existing native tabs (Search selected). Nothing new.

`ListingCard`, `Chip`, `Badge` already exist; most of this screen is built. The work is the trailing filter icon, the sort row, and replacing the data source. Token mapping: every color/size above uses existing tokens (`bg-surface-alt`, `bg-secondary`, `text-muted`, `text-primary`, `shadow-card`, `text-body|caption|small|title`). Proposed new tokens: none. Values estimated from the image: photo width and the gap between cards (kept as the existing `w-32`, `gap-3`).

States: **loading** (placeholder cards in the list area, header and chips already rendered), **error** (existing `Alert` plus "Try again" `Button`), **empty** (existing "No stays match" block, "Clear filters"), **results**.

## Decisions
Answers from the question round:
- **Data path:** a new API route `src/app/api/search+api.ts`. It replaces the AGENTS.md rule "Search runs on `src/data/properties.ts` and `src/lib/search.ts` until Jev and an API route exist". Jev is still not used here: the code parser stays, and a later plan can add Jev behind the same route.
- **Chip row:** active filters only (selected chips, tap to remove). No suggested quick-add chips.
- **Sort:** working. A sort dropdown with **Best match** (default), Price low to high and high to low, Rating high to low and low to high. The filter icon is visual only.

Defaults I picked:
- **Route contract:** `POST /api/search` with JSON `{ query: string, sort?: "best" | "price" | "rating" }`, header `Authorization: Bearer <Clerk session token>`. Response: `{ total, stays: SearchStay[], filters: { key, label }[] }`. `SearchStay` is `{ id, title, category, city, state, rating, reviewCount, price, amenities: Amenity[], petsAllowed, imageUrl }`. The route verifies the Clerk session first (401 otherwise), validates the body (query trimmed, max 200 characters, known sort), and does nothing else for an invalid one.
- **Parsing stays in code, shared:** `src/lib/search.ts` keeps `parseQuery` and `removeFilter` and is imported by both the screen (for chips) and the route. It no longer imports `properties`: place names for matching come from a fixed list of known cities and states (the 30 seeded cities plus the state names) kept in `search.ts`. `searchProperties` and `src/data/properties.ts` are deleted once nothing uses them (`Category`, `Amenity`, `Tag` types move to `search.ts`). Deleting local seed data is code, not Sanity content; the Sanity seed in `studio/seed/` is untouched.
- **Hard filters are GROQ params:** `_type == "property"`, `category == $category`, `nightlyPrice <= $maxPrice`, `maxGuests >= $guests`, `petsAllowed == true`, `$amenities` all in `amenities` (`count(amenities[@ in $amenities]) == count($amenities)`), `location.city == $city` or state in `$states`. Only the params that apply are included. Guest text never enters the query string.
- **Soft intent ranks:** when the query has soft words (quiet, cozy, secluded, romantic, family, luxury, modern, or leftover keywords), the query appends `| score(text::semanticSimilarity($q))`, `$q` being only the soft words and leftovers, not the whole sentence. With none, order is `rating desc, reviewCount desc`. Sort `price` and `rating` override ranking with `order(nightlyPrice asc)` and `order(rating desc, reviewCount desc)`. Each semantic query counts against the monthly quota, so the route only uses it when there is soft text.
- **Server token:** the semantic query needs a Sanity token. A new server-only env var `SANITY_API_READ_TOKEN` (Viewer role), never `EXPO_PUBLIC_`, name added to `.env.example`. The route reads from `https://<project>.api.sanity.io` (not the CDN) with that token. Asking you to create it is under "You need to".
- **Client:** `src/lib/search-stays.ts` exports `useSearchStays(query, sort)` with `status: "loading" | "error" | "ready"`, abort on change/unmount, and `retry`, calling the route with the Clerk token from `useAuth().getToken()`. Query, filters and the screen's own chips come from `parseQuery` locally so chips render instantly.
- **Images and badges:** `imageUrl` is the asset URL with `?w=1000&q=80&auto=format`, same as Home. Badges show the first amenity, then "Pet Friendly" when `petsAllowed`, then the next amenity, first two kept (the logic already in the screen).
- **Count:** the header count is `total` from the route, not `stays.length`. The route returns at most 30 stays (the dataset has 30); pagination is out of scope.

PostHog (no guest text, no tokens, no personal data; failures never block):
- **`stay_search_completed`** fired once per resolved search request: `{ outcome: "results" | "no_results", result_count, filter_count, filter_types: string[] (keys such as "category", "price", "amenity:hot-tub"), has_soft_intent: boolean, sort, source: "results" | "suggestion" | "home" | "filter_removed" }`. `outcome` is the single property to break down by; `no_results` is the "searches that return nothing" segment.
- **`stay_search_failed`** `{ reason: "network" | "unauthorized" | "server" }` for requests that error, so a failure is never counted as "no results".
- The existing client-side `stay_search_submitted` (which counted local results) is removed, since the real count now comes from the route. `search_suggestion_selected`, `search_filter_removed` and `stay_favorite_toggled` stay.
- The event is captured from the client hook when the response arrives (the route never has the guest's PostHog identity). The route sends no PostHog events or logs of its own, so there is a single place to look.
- Firing is deduped by (query, sort) so a re-render never sends it twice; a retry after an error does send.

## Out of scope
- Jev, typed decisions, and the policy Q&A.
- A working filter sheet behind the filter icon, pagination, saved searches, favorites persistence, tapping a card (stay details).
- Changing the Sanity schema or content.
- Dashboards or insights in PostHog (events only; a funnel/insight can follow).

## Steps
### 1. Shared parser without local data
Move `Category`, `Amenity`, `Tag` types and a fixed list of cities and states into `src/lib/search.ts`; make `parseQuery` use that list. Keep `removeFilter`, `AMENITY_LABELS`, `SUGGESTED_QUERIES`. Do not delete `properties.ts` yet. Done when `npx tsc --noEmit` passes and the app behaves as before.

### 2. API route
Read the current Expo Router API routes docs and the Clerk Expo server-auth docs (`clerk-expo` skill) before writing. Create `src/app/api/search+api.ts`: verify the Clerk session (401 if missing/invalid), validate the body, build the GROQ and params from `parseQuery`, call Sanity with `SANITY_API_READ_TOKEN`, return the contract above. Add the variable name to `.env.example`. Done when `curl` without a token returns 401, with an invalid body returns 400, and with a valid session returns real stays.

### 3. Client hook and screen
Create `src/lib/search-stays.ts`. Update `search.tsx` to use it with loading, error and empty states; add the sort row and sort sheet (Best match / Price / Rating); add the filter icon slot to `SearchField` and update `/design-system` for it. Remove the local `searchProperties` call. Done when the screen shows live results for "quiet pet friendly cabin with a hot tub under $300" and the count matches `total`.

### 4. PostHog
Add `stay_search_completed` and `stay_search_failed` from the hook as above and remove `stay_search_submitted`. Done when events with the right properties appear in PostHog (`mcp__claude_ai_PostHog__exec`, query the events) for one results search, one empty search and one forced failure.

### 5. Retire local data
Delete `searchProperties` and `src/data/properties.ts` once `grep` shows no import. Done when `tsc` and `expo lint` pass.

### 6. Visual check
Run per AGENTS.md "Visual checks", open the screen with a deep link (`roam:///search?q=Cabins%20in%20California` or the scheme in `app.json`), screenshot in light and dark, and compare with `search.png`. List every difference and fix.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass.
- Route: no token → 401; empty/too long query, unknown sort → 400; valid → stays whose fields satisfy every filter (check 3 queries: price cap, pets + amenity, category + state). A guest-style injection string (`" || true`) returns normal results and no error (values are params).
- Realistic queries on the simulator, with the cause explained for anything wrong: "quiet pet friendly cabin with a hot tub under $300", "Cabins in California", "romantic villa with a pool", "beach house with ocean view", "something near the moon" (nothing → empty state), and a pure soft query ("cozy and secluded") to see the semantic ranking.
- Sort: Price low-high is ascending, Rating is descending, Best match restores ranking.
- Loading, error (airplane mode or wrong host, temporary), empty and results states each screenshotted.
- PostHog: events found for a results search (`outcome: "results"`, count > 0), an empty search (`outcome: "no_results"`, `result_count: 0`), and a failed request (`stay_search_failed`, no `stay_search_completed`). Inspect payloads: no query text, no token, no user id beyond the identified Clerk id.
- Not verifiable here (reported as ❌): the monthly semantic quota behavior, a release build, and a slow network.

## AGENTS.md updates
- **Who owns what, Soft intent:** Search calls it from `src/app/api/search+api.ts` (soft words only, after the GROQ hard filters).
- **Rules:** replace the sentence "Search still runs on `src/data/properties.ts` and `src/lib/search.ts` ... until Jev and an API route exist, and screens call `parseQuery` / `searchProperties` only" with: Search reads Sanity through `src/app/api/search+api.ts` (Clerk-verified, parser in `src/lib/search.ts`, `SANITY_API_READ_TOKEN` server-only); screens use `useSearchStays` and `parseQuery` for chips. Add `SANITY_API_READ_TOKEN` to the secret-keys list.
- **Analytics:** add `stay_search_completed` (`outcome: results | no_results`) and `stay_search_failed`.
- **Design system:** note the filter icon slot on `SearchField` and the sort sheet.

## Result
Built as planned, plus `@clerk/backend` (approved), `search_sort_changed` and `source: "sort"`. Verified on the simulator: results ("quiet pet friendly cabin with a hot tub under $300" returns 3, "Cabins in California" returns 4) and the empty state. PostHog shows `stay_search_completed` with `outcome: results` and `no_results`, and `stay_search_failed` with `reason: server` from the run before the token was set. Known differences from the design: selected chips are not bold, and two badges wrap onto two lines on narrow cards. Not checked: route 400 cases, sort dropdown on screen, the error screen.
