# 11 · Property details

Status: done

Design: `assets/prompt-imgs/property-details.png` (attach again if building in a new session).

## Goal
A guest taps a stay on Home or Search and sees its details from live Sanity data: photo gallery, title, rating, place, highlights, house rules, cancellation policy, host and price. "Book this stay" shows a short "coming soon" message. Opening a stay is tracked in PostHog.

## Decisions
- Route: `src/app/stay/[id].tsx`, a root Stack screen shown only when signed in (add to the `Stack.Protected guard={!!isSignedIn}` group in `src/app/_layout.tsx`, outside `(tabs)`, so the tab bar is hidden). `[id]` is the Sanity `_id` (Home's `FeaturedStay.id` and Search results already carry it).
- Data: read from the public Sanity CDN in `src/lib/stay-details.ts` (`useStayDetails(id)`, same pattern as `src/lib/stays.ts`: fixed GROQ, `id` passed as a `$id` param, loading / error with retry / not-found states). No API route: content is public, as for Home.
- Query projects: `title, category, rating, reviewCount, location, nightlyPrice, cleaningFee, minNights, maxGuests, bedrooms, beds, bathrooms, petsAllowed, amenities, checkInTime, checkOutTime, summary, description, neighborhood`, `images[].asset->url` (+ `alt`), `host->{name, isSuperhost, hostingSince, bio, "photoUrl": photo.asset->url}`, `cancellationPolicy->{title, summary, body, refundWindowDays}`, `policies[]->{title, kind, summary, body}`.
- Copy shown is Sanity's own text, word for word: the cancellation card shows the policy `title` and `summary`; sheets show `body`. Nothing is generated.
- Price: `$nightlyPrice / night` and under it `$total total · N nights`, where total = `nightlyPrice × minNights + cleaningFee` (cleaning fee 0 if missing). Computed in code, shown as an estimate for the minimum stay.
- Highlights row: up to four items. The design shows "Pet Friendly" among them, but it is `petsAllowed`, not an amenity, so: take the stay's amenities in order (first four are its highlights per the schema), titled from the fixed list, and when `petsAllowed` is true insert "Pet Friendly" as the second item and drop the last amenity to keep four. An icon per value lives in a code map (`Icon`, lucide).
- Gallery: horizontal paging `FlatList` of `images` with `expo-image`, counter pill `n / total` (`scrim` / `on-scrim`) bottom right. Image URLs use the same `withSize` params as Home.
- Header buttons over the photo: back (router back, falls back to `/home`), share (React Native `Share.share` with the title and city; no deep link yet), favorite (local on-screen toggle only, not saved, as on list cards).
- "Ask about policies" card opens a bottom sheet (Expo Router `formSheet` route `src/app/stay/[id]/policies.tsx`, or a `Modal` if the sheet route is awkward: decide after reading the Expo Router v58 docs) listing the stay's `policies` (house rules, pets, check-in, ...) each as a title and its exact `body`. If the stay has no policies, say so and point to support (per AGENTS.md rule). No Q&A: the card's subtitle is the design's "Cancellation, house rules, pets, check-in and more.".
- Cancellation card: title and summary from the referenced policy ("Free cancellation", "Full refund up to 7 days before check-in."); tap opens the same sheet showing the cancellation `body`. House rules are always the first item in the policies sheet (policy with `kind == 'house-rules'`, found in the stay's `policies`).
- Host row: avatar (`Avatar` with `photoUrl`), "Hosted by {name}", "Superhost" with its icon when `isSuperhost`, else "Hosting since {year}". Not tappable (no chevron) until a host screen exists.
- Sticky bottom bar: price block left, yellow `Button` "Book this stay" right (primary variant). Press shows an `Alert`-style message "Booking is coming soon." (inline toast at the bar, auto-dismiss, `accessibilityLiveRegion`), no navigation.
- Rating box: star + `rating.toFixed(1)` and `(reviewCount)` in a `bg-surface-alt` rounded box top right of the title.
- Home (`FeaturedCard`) and Search (`ListingCard`) navigate with `router.push({ pathname: "/stay/[id]", params: { id } })`. Add `from: "home" | "search"` param for analytics.
- Analytics: when the screen has loaded the stay, capture `stay_opened` once per visit with `{ stay_id, category, price_per_night, rating, source: "home" | "search" | "link" }`. No guest text. Also capture `stay_book_tapped` `{ stay_id }` on the coming-soon press (shows intent for booking). Load failure logs `stay_details_load_failed` via `posthogLog.warn`. PostHog never blocks (`posthog?.capture`).
- Dark mode and Reduce Motion follow the existing tokens and `useEntering`.

## Out of scope
Booking, dates and availability, real totals, saved favorites, host screen, policy Q&A (Jev), deep links for share, review list, map.

## Steps
### 1. Data layer
Create `src/lib/stay-details.ts`: types (`StayDetails`), the GROQ query with `$id`, `useStayDetails(id)` returning `loading | error(retry) | not-found | ready`, a `priceSummary(stay)` helper, the amenity title/icon map keyed by the schema's amenity values. Done when a script/console call for a seeded id returns the full shape, and a bogus id yields `not-found`.

### 2. Components (added to `src/components/index.ts` and shown in `/design-system`)
`StayGallery` (paging images, back/share/favorite overlay slots, counter), `AmenityHighlight` row item (icon over label), `RatingBox`, `HostRow` (reuses `Avatar`), `BookingBar` (price + button). Reuse `PolicyCard`, `IconButton` (new size for the 56 px white circle if `md` does not fit: list as proposed token usage, no hex), `Button`, `Text`, `Icon`, `Divider`. Token mapping from the design: surface sheet over photo with `rounded-t-lg`; policy cards `bg-secondary-soft`; icon tile `bg-secondary/50`; chevrons `text-secondary-strong`; booking button `bg-primary` with `text-on-primary`; title `text-heading` (closest to the design's 28/34 bold; if it looks smaller than the design, propose a new `text-title-lg` token instead of a raw size). Values with no token get listed in the Result.

### 3. Screen and navigation
Build `src/app/stay/[id].tsx` with loading skeleton, error + "Try again", not-found message, and the content in the design's order: gallery, title and rating, location, highlights, divider, Ask about policies, cancellation card, host row, bottom bar. Register in `_layout.tsx`. Wire cards on Home and Search to navigate. Done when tapping any card opens the right stay and back returns.

### 4. Policies sheet
Add the sheet with the policies' exact text; opened from both policy cards (cancellation scrolls/highlights to its entry or opens alone). Handles no-policies state.

### 5. Coming soon and analytics
Book button message; `stay_opened`, `stay_book_tapped`, `stay_details_load_failed`. Add the events to the Analytics line in AGENTS.md.

### 6. Visual check
Open in the iOS simulator (`/stay/<id>` via `xcrun simctl openurl`), screenshot, compare to the design, list and fix every difference. Report values estimated from the image.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass.
- A seeded cabin, a stay without pets, and a stay with fewer than four amenities all render; a bogus id shows not-found; airplane mode shows error and retry works.
- Cancellation and policy sheet text equals the Sanity `body` (compare with an MCP query).
- Book press shows the coming-soon message and does not navigate.
- PostHog receives `stay_opened` with the right properties (check via the PostHog MCP) and no query text.
- End to end: sign in, Home, tap a cabin, scroll the gallery, open both sheets, press Book, back to Home.

## AGENTS.md updates
- Routes (Design system section): add `stay/[id]` and its sheet to the route list.
- Own-by-who (Content/Home bullet in Rules): stay details read live from the CDN through `src/lib/stay-details.ts`.
- Analytics: add `stay_opened`, `stay_book_tapped`.
- Add `StayGallery`, `AmenityHighlight`, `RatingBox`, `HostRow`, `BookingBar` to the shared components list.

## Result
Built as planned. Differences: the policies sheet is a root `formSheet` screen (`stay/[id]/policies`) that reads the stay cached by the details screen. The Avatar got an `lg` size (`size-18`). No new tokens were added; the title uses `text-heading` and wraps where the design's slightly smaller type does not (the cancellation summary wraps "check-in." to a second line). Estimated from the image: photo height (about 0.85 of screen width), counter pill position.
