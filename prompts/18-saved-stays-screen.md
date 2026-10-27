# 18 · Saved stays screen and yellow stars

Status: done

## Goal
Guests can open a "Saved stays" screen from Profile and see every stay they hearted (built on [17-saved-stays.md](17-saved-stays.md)), and can unsave from it. Stars on the listing card and the Home featured card are yellow.

## Decisions
- Screen shows saved stays, not bookings: Trips tab stays the "No trips yet" placeholder. Answered in the question panel.
- Route `src/app/saved.tsx`, a pushed screen (not a tab or sheet), registered inside `Stack.Protected` for signed-in users in `src/app/_layout.tsx`. Opened by tapping the Saved stat on Profile. No design was attached, so it reuses existing patterns: Search results layout (`ListingCard` rows with the `inline` heart, `px-5`, `gap-3`, `useEntering` stagger) with a header row (back `IconButton` with `ChevronLeft`, `Text variant="heading"` "Saved stays").
- Data: `src/lib/saved-stays.ts` (`useSavedStayDetails(ids)`), one request to the public Sanity CDN, fixed query `*[_type == "property" && _id in $ids]` with the same projection as search (`id`, `title`, `city`, `state`, `rating`, `reviewCount`, `price`, `amenities`, `petsAllowed`, first image). The CDN client used by `src/lib/stays.ts` can't pass params, so ids are validated against `/^[A-Za-z0-9_.-]+$/` and written as JSON string literals into the query; they come from the user's own metadata, never guest text. Result order follows the saved order, newest saved first. IDs of deleted stays are dropped silently and the count above the list uses what was found.
- Unsaving from this screen uses `useSavedStays().toggle`. The card stays in the list until the screen reloads, with the heart empty, so a mistaken tap can be undone; no animation beyond the existing press scale.
- States: loading (three placeholder blocks like Search), error (`Alert` danger plus retry `Button`), empty ("No saved stays yet" with a Heart icon in a `bg-surface-alt` circle, like Trips, plus a "Find a stay" button to `/search`).
- Card badges: move `badges()` and `amenityIcons` from `search.tsx` into `src/lib/stay-badges.tsx` so both screens share them.
- Profile `StatsRow`: `Stat` gets an optional `onPress`; a stat with it renders inside `PressableScale` (role button, label "Saved: N, open saved stays"). Trips and Rating stay static.
- Stars: `ListingCard` already uses `text-primary` (`#ffc629`, yellow in both themes), so it keeps it. `FeaturedCard`'s star is `Icon` default `text-ink`; it becomes `className="text-primary"`. No new token. "Preview" = `FeaturedCard` on Home.
- Analytics: `saved_stays_opened` (`count`) once per visit. Never IDs.

## Out of scope
- Bookings, upcoming or past trips.
- Sorting, filtering, or notes on saved stays.
- Hearts on Home cards.
- Moving saves to a database (see 17).

## Steps
### 1. Yellow star
In `src/components/featured-card.tsx` set the star icon to `className="text-primary" filled`. Done when the Home card star is yellow in light and dark and the rating text is unchanged.

### 2. Shared badges
Create `src/lib/stay-badges.tsx` with `amenityIcons` and `badges(stay)` moved verbatim from `src/app/(tabs)/search.tsx`; import them there. Done when Search looks the same.

### 3. Data hook
Create `src/lib/saved-stays.ts` with `useSavedStayDetails(ids: string[])` returning `{ status: "loading" } | { status: "error"; retry } | { status: "ready"; stays }`, following the pattern of `useFeaturedStays` (abort on unmount, attempt counter, `posthogLog`). Refetch only when the set of IDs the screen opened with changes (not on each unsave), so removed cards stay visible. Zero IDs resolves to ready without a request.

### 4. Screen and entry points
Create `src/app/saved.tsx` and register it in `_layout.tsx`. Make the Profile Saved stat open it (`StatsRow` `onPress`). Add `saved_stays_opened`. Done when the states above all render.

### 5. Design system
Add a "Saved stays" example to `/design-system`: the tappable stat in the StatsRow section and the empty state if it becomes a shared component (`EmptyState`, only if Trips and Saved both use it; otherwise leave inline and note it).

## Verification
- `npx tsc --noEmit` (src only) and `npx expo lint` pass.
- Save three stays, open Profile, tap Saved: three cards in saved order; tap a card: stay details; heart on the card empties and stays listed; leave and reopen: it is gone.
- Zero saves: empty state; "Find a stay" opens Search.
- Airplane mode on open: error with retry; retry works once online.
- Delete a saved stay's ID from reality (use an ID that doesn't exist, set via the Clerk MCP): screen ignores it, no crash.
- Home `FeaturedCard` star is yellow in light and dark; `ListingCard` star unchanged.
- Screenshots in the iOS simulator of Saved (filled, empty, error), Home card and a search card, compared with the design system; list differences.

## AGENTS.md updates
- **Design system → Routes:** add `saved.tsx` (opened from the Profile Saved stat); `StatsRow` stats take `onPress`.
- **Design system → Extra tokens / components:** stars use `text-primary`.
- **Rules → Home:** mention `src/lib/saved-stays.ts` loads saved stays by ID from the public CDN.
- **Analytics:** `saved_stays_opened` (`count`).

## Result
Built as planned. `FeaturedCard` star is `text-primary`; `ListingCard` already was. The Saved stat on Profile opens `src/app/saved.tsx` with loading, error and empty states. Step 5: the `/design-system` account section now shows the tappable Saved stat; the empty state stays inline (only Saved uses it). No runtime or visual checks were run (needs a signed-in simulator session).
