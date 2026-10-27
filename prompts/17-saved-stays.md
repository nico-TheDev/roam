# 17 · Persistent saved stays

Status: done

## Goal
A signed-in guest can tap the heart on a stay and it stays saved across app restarts, devices and reinstalls. The Profile "Saved" stat shows the real count. Property content stays in Sanity; the private list of IDs lives with the user in Clerk.

## Decisions
- Storage: Clerk `unsafeMetadata.savedStayIds` (string[] of Sanity `_id`s), written from the client. No new service, no Sanity schema change, nothing private in the public dataset. Chosen over server-written metadata, on-device storage and a hosted database (the last is for when trips and bookings need relational data).
- Write with `user.updateMetadata({ unsafeMetadata: { savedStayIds } })` (deep merge, so future keys aren't clobbered), not `user.update` (replaces the whole object). Verify this method exists in the installed `@clerk/expo` before building; fall back to `user.update` with the full object if not.
- Clerk caps metadata at 8 KB total. Cap saves at 100 (about 3 KB); at the cap, show "You can save up to 100 stays." and don't add.
- Not for authorization: saved IDs are the user's own preference data, validated on read (must be strings, deduped, capped).
- Optimistic UI: the heart flips at once, the write is debounced (400 ms, last write wins), and a failure rolls back and shows a short error. Offline toggles fail visibly instead of being lost.
- All access goes through one hook, `useSavedStays` in `src/lib/saved.ts` (`isSaved(id)`, `toggle(id)`, `count`, `ids`), so a later move to a database changes one file.
- IDs of stays deleted from Sanity are harmless; they only matter when a list screen exists (out of scope).
- Analytics: keep the existing `stay_favorite_toggled` in search and send it from the hook for every surface (`property_id`, `action: saved | removed`). Never send the ID list.
- Signed-out state can't happen (tabs are protected). Data goes with the account on delete; nothing is stored on the device, so accounts never leak into each other.

## Out of scope
- A Saved list screen or a tab for it (the stat count only).
- Hearts on Home cards (only if Home already renders them; otherwise left alone).
- Syncing in real time between two devices already open (picked up on next launch or `user.reload()`).
- Moving to a database.

## Steps
### 1. `useSavedStays` hook (`src/lib/saved.ts`)
Read `savedStayIds` from `useUser().user.unsafeMetadata` and parse defensively (array of strings, dedupe, cap 100). Keep an optimistic local copy. `toggle(id)` updates it at once, debounces the Clerk write, rolls back and exposes an error on failure, and returns `AuthResult` like the hooks in `src/lib/account.ts`. Emit `stay_favorite_toggled` via `posthog?.capture`. Done when a throwaway call from a screen persists across a reload.

### 2. Wire hearts
Replace the local `useState` in `src/app/(tabs)/search.tsx` (lines around 76-96) and `src/app/stay/[id]/index.tsx` (line around 69) with the hook. Both surfaces must agree because they share the hook state. Show the error through the existing `Alert` component. Done when a heart set in search is filled on the stay details and after an app restart.

### 3. Profile stat
In `src/app/(tabs)/profile.tsx` replace the hardcoded Saved `"0"` with `String(count)`, and update the comment above it. Done when the number follows the hearts.

### 4. Design system
No new component, so no `/design-system` change.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass.
- Save from search, open the same stay: heart is filled. Unsave on details, go back: search heart is empty.
- Force quit and reopen in Expo Go: saved hearts persist and Profile shows the right count.
- Sign out and in as a second account: it starts empty. Sign back in as the first: its saves return.
- Airplane mode: toggle fails, the heart rolls back, an error shows.
- Cap: seed 100 IDs through the Clerk MCP `update_user_metadata`, then try a 101st: refused with the message.
- Malformed metadata (set `savedStayIds` to a string through the Clerk MCP): the app treats it as empty and doesn't crash.
- PostHog receives `stay_favorite_toggled` with no ID list. Screenshots of search, details and profile in the iOS simulator.

## AGENTS.md updates
- **Who owns what → Auth** (or a new bullet): saved stay IDs live in Clerk `unsafeMetadata.savedStayIds`, via `useSavedStays` in `src/lib/saved.ts`, capped at 100 (8 KB metadata limit); written with `updateMetadata`, never `user.update`.
- **Rules → stay details:** the heart is no longer local state; replace that sentence.
- **Analytics:** note `stay_favorite_toggled` (`property_id`, `action`).
- **Design system → Routes / Profile:** Saved stat shows the real count.

## Result
Built as planned: `src/lib/saved.ts` (`useSavedStays`, shared store via `useSyncExternalStore`), hearts in search and stay details use it, Profile Saved shows the count. Deviations: after a successful write the optimistic copy stays until app restart (avoids flicker while Clerk's user object updates); the limit and failure errors share one `error` field with `dismissError`. Runtime checks on a device are still to be run by the user (see the report).
