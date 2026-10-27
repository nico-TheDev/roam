# 15 · Host profile sheet

Status: done

Design: none attached. Built from existing components and tokens.

## Goal
On a stay's details page, a guest taps the "Hosted by" row and a sheet opens with the host's profile: photo, name, Superhost or hosting-since, bio, and the host's other stays. Tapping one of those stays opens its details.

## Decisions
- Presentation: form sheet (the guest picked this over a full-screen push), like `stay/[id]/policies`. Route `src/app/stay/[id]/host.tsx`, registered in the signed-in `Stack.Protected` group in `src/app/_layout.tsx` with `presentation: "formSheet"`, `sheetAllowedDetents: [0.6, 1]`, `sheetGrabberVisible: true`. `id` is the stay the guest came from.
- Entry: `HostRow` becomes tappable (`PressableScale`, `onPress` prop, a `ChevronRight` icon on the right in `text-muted`). On the stay screen it pushes `/stay/[id]/host`. `HostRow` without `onPress` renders as today.
- Host data: the stay query in `src/lib/stay-details.ts` also reads `host->{ "id": _id, bio }`, and `StayDetails.host` gains `id` and `bio: string | null`. The sheet reads the host from `getCachedStay(id)`, so it opens instantly with no request. No schema change (`bio` already exists on `host`).
- Host's other stays: new `src/lib/host-profile.ts` with `useHostStays(hostId, excludeStayId)`. Fixed GROQ query on the public CDN, ids passed as `$` params (same pattern as `stay-details.ts`): `*[_type == "property" && host._ref == $hostId && _id != $stayId] | order(rating desc)` projecting the `FeaturedStay` shape from `src/lib/stays.ts`. Handles loading, error (with retry) and empty (section hidden when the host has no other stays).
- Content, top to bottom: `Avatar` (xl if it exists, else lg), `Text variant="heading"` with the full name, Superhost line or "Hosting since <year>" (same wording as `HostRow`), "About <first name>" with the bio word for word from Sanity (section hidden when `bio` is empty), "More stays by <first name>" with a vertical list of `ListingCard`s. Cards push `/stay/<id>`.
- Missing cache (sheet opened by deep link): show "Host details aren't available. Open the stay and try again." Same approach as the policies sheet when its cache is empty.
- Analytics: `host_profile_opened` with `stay_id` and `host_id`, sent once on open. Never names or bio text. PostHog failures never block.
- Tokens only: `bg-surface`, `px-5`, `gap-*`, `border-border`. No new tokens expected.

## Out of scope
Message host button (messaging doesn't exist), host reviews, a host list or search, host photo gallery, changing the Sanity schema.

## Steps
### 1. Data
Extend the stay query and types in `src/lib/stay-details.ts` (`host.id`, `host.bio`). Create `src/lib/host-profile.ts` with `useHostStays`. Done when `npx tsc --noEmit` passes and a host with several stays returns the others, not the current one.

### 2. Component
Make `HostRow` pressable with the chevron (`onPress` optional). Add a "Host profile" part to the `/design-system` route: the tappable `HostRow` and the profile header. Export anything new from `src/components/index.ts`.

### 3. Sheet and navigation
Build `src/app/stay/[id]/host.tsx`, register it in `src/app/_layout.tsx`, wire `HostRow` on `src/app/stay/[id]/index.tsx`, send `host_profile_opened`. Done when tapping the host row opens the sheet and a listed stay opens its details.

### 4. Visual check
Open a stay in the iOS simulator, open the sheet (`xcrun simctl openurl booted` for `/stay/<id>/host`), screenshot light and dark, at both detents. List and fix differences.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass.
- A host with a bio and other stays (for example Alex Rivera) shows header, bio and the other stays, not the current stay.
- A host with one stay hides "More stays". A host without a bio hides "About".
- Superhost shows the badge line; a non-Superhost shows "Hosting since <year>".
- Loading and error states of the stays list show, and retry works.
- Tapping a listed stay opens its details; back returns to the stay.
- End to end: sign in, Home, open a stay, tap the host row, scroll the sheet, open another stay by the same host.

## AGENTS.md updates
- Stay details bullet (Rules): add the host profile sheet `stay/[id]/host.tsx`, read from the cached stay plus `src/lib/host-profile.ts`.
- Analytics: add `host_profile_opened`.
- Shared components: note `HostRow` takes `onPress`; update the `/design-system` section count if one is added.

## Result
Built as planned. The host row is not its own design section: the tappable `HostRow` is in section 19. `Avatar` has no `xl` size, so the header uses `lg`. Queries were checked against the live dataset; the sheet was not opened in the simulator because taps can't be driven from here.
