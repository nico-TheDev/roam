# 07 · Home, search results and native tabs

Status: done

Designs: `assets/prompt-imgs/home.png` and `assets/prompt-imgs/search.png` (attach again if building in a new session). Builds on `05-auth-screens.md` and `06-clerk-auth.md` (route guards, `home.tsx` placeholder with Sign out). Animation decisions follow the `expo-animation` skill.

## Goal
A signed-in guest lands on the Home tab, sees the greeting, a search bar they can type into, category chips and featured stays. Submitting the bar opens the Search tab with ranked results for that sentence ("quiet pet friendly cabin with hot tub under $300"). The app has a native tab bar (Home, Search, Trips, Profile). All data is local.

## Decisions
Answers from the question round:
- **Trips and Profile:** placeholder screens. Trips is an empty state. Profile holds the Sign out button that `home.tsx` has today.
- **Search logic:** code parses the sentence into filters and ranks the rest by keyword overlap on local data. No AI, no network. It mirrors the later split (exact constraints = GROQ filters, soft intent = embeddings), so it will be replaced by Sanity without touching the screens.
- **Photos:** remote Unsplash placeholder URLs in the local data (`expo-image`). No assets to add.
- **Search flow:** the home bar is a real `TextInput`. Submit (keyboard "search" key or the arrow button) navigates to `/search?q=<text>`. The top-right magnifier on Home focuses the input. The Search tab shows an editable bar with the same text.

Defaults I picked:
- **Routes:** `src/app/(tabs)/_layout.tsx` (`NativeTabs` from `expo-router/unstable-native-tabs`) with `home.tsx`, `search.tsx`, `trips.tsx`, `profile.tsx`. The group name keeps URLs (`/home`, `/search`). The root `_layout.tsx` guard changes from `name="home"` to `name="(tabs)"`. Old `src/app/home.tsx` is deleted (content moves to `(tabs)/home.tsx` and `(tabs)/profile.tsx`). The `Link` to `/design-system` moves to Profile.
- **Tab bar:** the real native bar (liquid glass on iOS 26, Material 3 on Android), not the presentational `TabBar` component. SF Symbols + `md` icons (`house.fill`, `magnifyingglass`, `calendar`, `person.fill`). It will not match the design's yellow pill exactly; the system selection tint is set to the primary token. `TabBar` stays in the design system as a showcase component. Search is a normal tab (not `role="search"`, since the design has its own in-screen bar).
- **Tint color:** `NativeTabs` takes a color value, not a class, so read the token with NativeWind's `useCSSVariable("--color-primary")` (check it exists in the installed `nativewind@5.0.0-rc.0` before using). No hex in code.
- **Data:** `src/data/properties.ts`, 16 typed properties: `id` (local string slug; Sanity will generate real IDs later), `title`, `location`, `category` (`cabin | beach | city | villa`), `rating`, `reviews`, `price`, `maxGuests`, `petFriendly`, `amenities` (`hot-tub`, `pool`, `fireplace`, `ocean-view`, `wifi`, ...), `tags` (`quiet`, `cozy`, `secluded`, ...), `imageUrl`. Cabins, beach, city and villa all have entries, with the four stays in the design included (Modern Cabin with Hot Tub $289, Oceanview Villa $412, A-Frame in the Redwoods $236, Designer Home in Wine Country).
- **Search module:** `src/lib/search.ts`, pure functions, no React. `parseQuery(text)` returns `{ maxPrice?, guests?, pets?, category?, amenities[], tags[], place?, keywords[] }`. Price and guest counts are parsed with regexes (`under $300`, `below 300`, `for 4 guests`), never guessed. Category, amenity and tag words come from small synonym tables. `searchProperties(query)` applies hard filters (price, guests, pets, category, amenities, place) then ranks by tag and keyword overlap, ties broken by rating. Unknown words are ignored for filtering and only affect rank.
- **Filter chips on results:** show what the parser understood (`Cabins`, `Under $300`, `Pet Friendly`, `Quiet`, plus `Hot Tub`...). Tapping a chip removes that filter and re-runs the search (chips are state, the query text updates to match). Selected chips use `Chip variant="soft"` (lavender), as in the design.
- **Result count and sort:** "N stays" is real. "Sort by Best match" is a static label (no chevron, no menu) because sorting is out of scope. The design's filter-sliders button in the search bar is left out for the same reason (no dead controls).
- **Result card:** the existing `ListingCard`, with favorite toggled in local state (not persisted). Amenity badges get icons from lucide.
- **Home content:** greeting uses Clerk `useUser()` first name ("Hey, there" fallback); avatar uses `user.imageUrl`, initials fallback. Category chips (`Chip variant="accent"`: All Stays, Cabins, Beach, City, Villas) filter the featured list on Home. Featured cards are large image cards (new `FeaturedCard`).
- **Tapping a stay:** no property detail screen exists yet (`property-details.png` is a later plan), so cards give press feedback only. Listed under out of scope.
- **Empty and error states:** Search with no query shows suggested sentences as tappable chips; no matches shows "No stays match" plus the filters the parser found and a "Clear filters" button; there is no loading state because data is local (search runs synchronously on submit). Home category with no stays can't occur with the seed data.
- **Keyboard:** Home `ScrollView` uses `keyboardShouldPersistTaps="handled"` and `keyboardDismissMode="on-drag"`.
- **No new dependencies.** Reanimated 4.7.1, worklets, gesture handler, `expo-image` and `expo-symbols` are installed. `expo-haptics` is not, so **no haptics** in this plan (adding it needs approval).

### Animation (expo-animation skill)
Gate result per element (frequency tier, purpose, tool):
- **Tab switching:** 100+ times a day, so no animation. The native bar's own behavior only. Tabs never slide.
- **Press feedback** on cards, chips, arrow button, magnifier, heart: tens of times a day, purpose feedback. Reanimated CSS transition, `transform: scale(0.97)`, 120 ms, `cubicBezier(0.23, 1, 0.32, 1)`, `hitSlop` to reach 44 pt, `pressRetentionOffset: 16`. Implemented once as a shared `PressableScale` component in `src/components/` and used by `ListingCard`, `FeaturedCard`, `Chip`. Replaces the current `active:opacity-*`.
- **Chip selected/unselected color:** state indication, CSS transition on `backgroundColor`, 150 ms ease-out.
- **Arrow button on the home search bar:** appears when the field has text (state indication). CSS transition on `opacity` + `transform: scale(0.95 → 1)`, 150 ms, ease-out. Stays mounted (never `scale(0)`), `pointerEvents` off while hidden.
- **Home first render:** occasional (once per cold start), purpose preventing a jarring change. `FadeInDown.duration(250).delay(index * 50)` on the header block, search bar, chips and the first three featured cards only, memoized per row (built outside render or in `useMemo`). Not repeated when switching back to the tab (the tab stays mounted).
- **Search results:** content the user asked for and waited on. `FadeInDown` 250 ms, stagger 40 ms, capped at the first 6 rows. Rows are in a `ScrollView` (16 items max), not a virtualized list, so `entering` is safe. Results container re-keyed per submitted query so the entrance replays once per search, not per keystroke. `itemLayoutAnimation={LinearTransition}` (200 ms) when a chip removal reflows the list.
- **Heart toggle:** tens of times a day, near-imperceptible: the press scale above plus color change only.
- **Reduced motion:** `useReducedMotion()`; when on, entrances are opacity-only (`FadeIn`), no translate, no scale on press (color only).
- **Rejected:** screen-to-screen animation (native stack default), tab bar animation, parallax or collapsing header on Home (the native bar's `minimizeBehavior="onScrollDown"` is skipped too: it changes the design), spring bounce (no gesture with momentum here), haptics (no dependency).
- **Properties:** only `transform` and `opacity` (plus `backgroundColor` on a small chip, which is a paint-only change). No height, width, margin or blur animation. Everything runs on the UI thread; no `setState` per frame.

## Out of scope
- Property detail screen, booking, favorites persistence, real Trips and Profile content.
- Sorting menu, filter sheet (sliders button), recent-search history.
- Sanity, Jev, embeddings and API routes (search is local; replace later).
- Haptics (needs `expo-haptics`), dark-mode photo treatment.
- Matching the design's custom yellow pill tab bar (native tabs by request).

## Steps
### 1. Local data and search logic
Create `src/data/properties.ts` (type `Property`, 16 entries, remote Unsplash `imageUrl`s, mixed categories, prices $120 to $520, some pet friendly, varied amenities and tags) and `src/lib/search.ts` (`parseQuery`, `searchProperties`, `describeFilters` returning the chip list for a parsed query, `removeFilter`). Pure TypeScript, no React imports. Done when `npx tsc --noEmit` passes and a throwaway script or REPL run shows: `"quiet pet friendly cabin with hot tub under $300"` returns only pet-friendly cabins with a hot tub at or under $300, with Modern Cabin with Hot Tub ranked first; `"cabins in California"` returns cabins only; `"xyz"` returns an empty list; `"under 50"` returns an empty list.

### 2. Shared components and press feedback
In `src/components/` add `PressableScale` (CSS transition, reduced-motion aware), `SearchPill` (lavender pill: sparkles icon, `TextInput`, white arrow button that fades in when there is text; props `value`, `onChangeText`, `onSubmit`, `ref` focus support), `SearchField` (back button + search icon + input, for the results screen), `FeaturedCard` (full-width image card: rating pill top right in `bg-surface`, location with pin and title bottom left over a dark gradient or `scrim`, white round chevron button bottom right), `Avatar` (image with initials fallback). Update `Chip` and `ListingCard` to use `PressableScale` and the 150 ms background transition. Export from `index.ts`. Add sections 16 (Search bar), 17 (Featured card) and 18 (Avatar) to `src/app/design-system.tsx`. Map every value to existing tokens; list any value with no token under Notes as a proposed new token instead of hardcoding it. Done when the design-system route renders the new sections and existing sections still look right.

### 3. Native tabs and route move
Create `src/app/(tabs)/_layout.tsx` with `NativeTabs`, four triggers (`home`, `search`, `trips`, `profile`) with SF Symbol and `md` icons and labels, `tintColor` from the primary token. Create placeholder `trips.tsx` (empty state: "No trips yet", one-line explanation) and `profile.tsx` (name, email, Sign out button with loading state from the old `home.tsx`, the design-system link). Create stub `home.tsx` and `search.tsx` that render a title. Delete `src/app/home.tsx`. In `src/app/_layout.tsx` change the protected screen to `name="(tabs)"`. Done when signing in lands on the Home tab, all four tabs switch, Sign out from Profile returns to onboarding, and `npx tsc --noEmit` passes (typed routes regenerate when the dev server starts).

### 4. Home screen
Build `(tabs)/home.tsx` from `home.png`: `roam` wordmark and avatar row, "Hey, {first name} 👋" in `text-lead`/muted, "Find your next stay" in `Text variant="headline"`, circular magnifier button (focuses the `SearchPill`), `SearchPill` with placeholder `quiet pet friendly cabin with hot tub`, category chips (wrapping row, `Chip variant="accent"` with lucide icons: House, TreePine, Waves, Building2, Palmtree), then a vertical list of `FeaturedCard`s filtered by the selected category. Submit navigates to `router.navigate({ pathname: "/search", params: { q } })` and trims; empty submit does nothing. Apply the entrance and press animations from the Animation section. Screen edge padding `px-5`; extra bottom padding so the last card clears the tab bar. Done when typing, submit, the arrow button and the magnifier all behave as described and the screen matches the design (step 6 checks that).

### 5. Search screen
Build `(tabs)/search.tsx` from `search.png`: `SearchField` (back button goes to `/home`; the input is pre-filled from `q` and re-submits through `router.setParams`), filter chips from `describeFilters`, "N stays" and the static sort label, results as `ListingCard`s with amenity badges and local favorite state. Empty-query state (suggested sentences), no-match state, and chip removal behave as in Decisions. The entrance and layout animations from the Animation section apply. Done when each example query in Verification returns the expected stays and chip row.

### 6. Visual check and polish
Run the app (see AGENTS.md "Visual checks"), open Home and Search in the iOS simulator, screenshot, compare with both designs, list every difference, fix, repeat. Note which values were estimated from the images. Check light and dark mode, large text (200%), and Reduce Motion on.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass.
- Search module cases from step 1 pass.
- Flows in the simulator: cold start signed in lands on Home; type the example sentence and submit, land on Search with the expected results and chips; remove the `Under $300` chip and see the count grow; clear the field and see suggestions; tap a suggestion; tap each home category chip and see the featured list change; tap the magnifier and see the keyboard open; switch all four tabs; sign out from Profile and land on onboarding.
- Animations: press scale visible on cards and chips, arrow button fades in on first character, home entrance runs once, results entrance runs once per search, nothing replays on tab switch, no animation on tab switching, Reduce Motion removes translate and scale.
- Screenshots of Home and Search compared with the designs, with the differences listed (the native tab bar is a known difference).
- End to end: sign in, type "quiet pet friendly cabin with hot tub under $300" on Home, submit, see Modern Cabin with Hot Tub ($289) first, with chips Cabins / Under $300 / Pet Friendly / Quiet / Hot Tub.
- Not verifiable here: feel on a release build on a slow Android device. Report that as unchecked.

## AGENTS.md updates
- **Design system:** routes line (`(tabs)` group with `home`, `search`, `trips`, `profile`; guard on `(tabs)`), shared component list (PressableScale, SearchPill, SearchField, FeaturedCard, Avatar), `/design-system` section count (18), `Chip`/`ListingCard` now use `PressableScale`.
- **Who owns what:** add "Local seed data in `src/data/` and `src/lib/search.ts` stand in for Sanity and Jev until those exist; screens call `searchProperties` only".
- **New rule under Design system:** motion follows the `expo-animation` skill (press scale 0.97 / 120 ms, no tab animation, entrances capped, reduced motion respected).
- Replaces: the "`home.tsx` is the signed-in home placeholder with Sign out" text.

## Result
Built as planned, with these changes: the home arrow button is always visible (as in the design) and, with nothing typed, searches the placeholder sentence instead of doing nothing; chip removal remounts the results (keyed by query), so the entrance replays and no separate reflow animation exists; `PressableScale` and `useTokenColor` were added; native tabs use `expo-router/native-tabs`; tab tint is ink with a primary Android indicator (iOS selection pill is the system's); the home search pill input uses `text-caption` to fit the design. Verified visually in the iOS simulator with the auth guard temporarily opened (restored afterwards).
