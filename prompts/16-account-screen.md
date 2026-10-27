# 16 · Account screen

Status: done

Design: `assets/prompt-imgs/profile.png` (Profile tab). If building in a new session, ask for it to be attached again.

## Goal
The Profile tab becomes the Account screen from the design. A guest sees their Clerk profile (photo, name, email), edits their name and photo, sees and signs out their other devices, signs out, and deletes their account.

## What I found (inspection and research)
- `@clerk/expo` 4.14.1 (Core 3), `@clerk/shared` 4.42.0, Expo SDK 58. Auth lives in `src/lib/auth.ts` (hooks returning `AuthResult`, Clerk errors mapped by `describe`, `useSignOut`, `splitName`). The route guards in `src/app/_layout.tsx` already send a signed-out user to onboarding and reset PostHog, so sign out and delete must not navigate.
- Types in `node_modules/@clerk/shared/dist/types/user.d.ts` and `session.d.ts` (read, not guessed):
  - `user.update({ firstName, lastName })`; `user.setProfileImage({ file: Blob | File | string | null })` (`null` removes); `user.imageUrl`, `user.hasImage`, `user.createdAt`, `user.passwordEnabled`, `user.deleteSelfEnabled`, `user.delete()`.
  - `user.getSessions()` returns `SessionWithActivitiesResource[]` (`id`, `status`, `lastActiveAt`, `latestActivity { deviceType, browserName, city, country, isMobile, ipAddress }`, `revoke()`). The current session is `useSession().session.id`.
  - `useReverification` is exported from `@clerk/expo`. `user.updateMetadata` replaces `update({ unsafeMetadata })`, which is deprecated (not needed here).
- Clerk dev instance (read with the Clerk MCP): multi-session off, password re-verification on, Google on, first/last name on, no username. The config output has no account-deletion setting, so I can't confirm `deleteSelfEnabled` is on; the screen reads it at runtime and hides Delete account when it's false.
- `expo-image-picker` is not installed. `ProfileRow`, `ProfileList`, `PolicyCard`, `Avatar`, `Badge`, `IconButton`, `TextField`, `Wordmark`, `Surface`, `Alert`, `Button` already exist. The `/design-system` route already shows `ProfileList` with Personal info, Payment methods and Trips.
- Nothing stores per-guest data outside Clerk and PostHog (Sanity holds stays, hosts, policies only).

## Decisions
Answers from the question panel:
- **Design data:** keep the layout, show honest empty values. Stats row: Trips `0`, Saved `0`, Rating `–`. Payment methods shown as "Coming soon" (disabled row).
- **Photo:** add `expo-image-picker` (via `npx expo install expo-image-picker`).
- **Delete:** client delete with `user.delete()`, shown only when `user.deleteSelfEnabled`.
- **Sessions:** a devices list with "Sign out other devices".

Defaults I picked (change any of them in review):
- Header card: `Avatar` (lg), full name, email line (replaces the city line, since Clerk has no city), `Badge` "Member since <Mon YYYY>" from `user.createdAt` (replaces "Roam Explorer", which has no data source).
- Gear `IconButton` (top right) opens the Settings sheet. Settings holds Signed-in devices, Sign out and Delete account. The design has no place for them, so this is the least invasive spot.
- Personal info opens a Personal info sheet: photo (change / remove), first name and last name in one "Full name" field (split with `splitName`, same rule as sign-up), email read-only. Email and password changes are out of scope.
- Trips row switches to the Trips tab (`router.navigate("/trips")`).
- Notifications and Help & support: disabled "Coming soon" rows (no notification feature and no support address exist yet; Ask chat only says "point to support").
- Free cancellation card: `PolicyCard` with the text "Full refund up to 7 days before check-in." as in the design. It is static copy, so it is not shown as a Sanity policy and has no `onPress`. Flagged in Notes because AGENTS.md says policy text comes word for word from Sanity.
- Sheets use `presentation: "formSheet"`, `sheetAllowedDetents: [0.6, 1]`, `sheetGrabberVisible: true`, like `stay/[id]/policies`, registered in the signed-in `Stack.Protected` group. Routes: `src/app/account/personal.tsx`, `src/app/account/settings.tsx`.
- Delete lives inside the Settings sheet: a "Delete account" row expands a danger section (what's removed, `TextField` "Type DELETE", destructive `Button`). Enabled only when the field equals `DELETE` exactly.
- Sign out asks first with the native `Alert.alert` (Cancel / Sign out), then calls the existing `useSignOut`.
- Reverification: sensitive actions (`user.delete`) may need a fresh credential. Wrap them with `useReverification` and, if Clerk asks for it, show a password field (password accounts) in the sheet. Google-only accounts (`passwordEnabled` false) are told to sign in again first. **The exact Expo flow must be confirmed in the Clerk docs before building step 4** (the hook's callback shape and the first-factor call on native); if it can't be done with the custom screens, stop and ask rather than invent it.
- Analytics (PostHog, never names, emails, or image data): `profile_updated` (`field: name | photo`), `profile_photo_removed`, `devices_signed_out` (`count`), `account_deleted`, `account_delete_failed` (`reason`). Existing `user_signed_out` stays.
- Tokens only. Proposed new tokens: none expected. If the stats-row divider or circle behind row icons has no token, list it and add it to `src/global.css` instead of hardcoding.

## Out of scope
Email or password change, phone, MFA, connected accounts, real trip/saved/rating numbers, payments, notifications, a support channel, server-side deletion, deleting PostHog person data.

## Steps
### 0. Docs check (no code)
Read the current docs before writing anything: `https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/`, Clerk's Expo custom flow for user profile, `useReverification` on Expo, and `https://docs.expo.dev/llms.txt` as the fallback. Record in the plan's Result anything that differs from "What I found". Confirm `setProfileImage` accepts a `data:` URI string on React Native and what the picker returns (`base64: true` vs URI to Blob).

### 1. Account hooks (`src/lib/account.ts`)
Keep `src/lib/auth.ts` as the only place that handles Clerk errors: export `describe` (or add the helpers there) and reuse `AuthResult`. New hooks, each returning `AuthResult`:
- `useUpdateName()` → `user.update(splitName(full))`; a one-word name must also clear `lastName` (send `lastName: ""`).
- `useProfilePhoto()` → `{ pick, remove }`: `launchImageLibraryAsync` (square crop, image only, quality ≤ 0.7, small size), then `user.setProfileImage`; `remove` passes `file: null`. Cancel resolves ok with no change.
- `useDevices()` → loads `user.getSessions()` into `{ devices, status: loading | ready | error, reload, revokeOthers }`. Marks `current` by `session.id`; `revokeOthers` revokes every non-current session, then reloads.
- `useDeleteAccount()` → checks `user.deleteSelfEnabled`, sends `account_deleted`, calls `user.delete()` (reverified per Step 0). Failure returns an error and sends `account_delete_failed`.
Add form rules to `src/lib/validation.ts` only if needed (`validateName` already exists). Done when `npx tsc --noEmit` passes.

### 2. Components
Reuse before adding. Likely new (each exported from `src/components/index.ts` and added to a section of `/design-system`):
- `StatsRow`: three stats with hairline dividers in a bordered `rounded-lg` box (`value` + `label`, optional star icon on the third).
- `ProfileSection`: the design's panel (`Surface variant="flat"`, section title, then a `ProfileList`).
- `ProfileRow` gets an optional `detail` (right-hand text such as "Coming soon") and a `disabled` look; icon sits in a `size-11 rounded-full bg-surface-alt` circle (as in the design). `DeviceRow` (device label, place, last active, "This device" `Badge`).
Done when the design-system page shows each in light and dark.

### 3. Account screen
Rebuild `src/app/(tabs)/profile.tsx` to match the design: `Wordmark` + gear `IconButton`, header card, `StatsRow`, Account section (Personal info, Payment methods, Trips), Preferences section (Notifications, Help & support), Free cancellation `PolicyCard`. Scroll view with `px-5` and bottom space above the native tab bar. Entrances through `useEntering`; all tappables `PressableScale`. Remove the "Open the design system" link from this screen (reach it by URL; mention in Notes). Loading state while `useUser` isn't loaded; the guards mean a signed-in user always exists after that.

### 4. Sheets and navigation
Register `account/personal` and `account/settings` in `src/app/_layout.tsx`. Personal info: photo with "Change photo" / "Remove photo", Full name field with inline validation and Save (disabled until changed), read-only email, `Alert` for errors. Settings: Signed-in devices (loading, error with retry, empty, list; "Sign out other devices" only when others exist), Sign out, Delete account section. No screen navigates after success; the guards do. Send the analytics events.

### 5. Visual check
Follow AGENTS.md "Building from designs": run `npx expo start` on a free port without `CI=1`, open in the iOS simulator, deep link to `/profile`, `/account/personal`, `/account/settings`, screenshot light and dark, compare with the design, list every difference and fix. Report values estimated from the image.

## Verification
- `npx tsc --noEmit`, `npx expo lint` pass.
- Name: change "Joanna Smith" to "Joanna Lee": header updates, Clerk Dashboard shows first Joanna, last Lee. A one-word name clears the last name. A name under 2 characters shows the validation error and doesn't call Clerk.
- Photo: pick a photo, it appears in the header and Personal info; Remove returns to initials. Cancelling the picker changes nothing.
- Devices: sign in on a second device or simulator; it appears, "This device" is marked on the current one, "Sign out other devices" removes the other and the other lands on onboarding.
- Sign out: Alert cancel does nothing; confirm lands on onboarding and PostHog resets.
- Delete: row hidden when `deleteSelfEnabled` is false; with it on, the button stays disabled until `DELETE`, a password account reverifies, the user disappears from Clerk and the app lands on onboarding. Use a throwaway test account.
- Failure paths: airplane mode on save, devices load, revoke and delete shows an error, never a crash or a half state.
- Coming-soon rows aren't tappable; Trips row opens the Trips tab.
- End to end: sign up a new user, open Profile, change name and photo, view devices, sign out, sign back in (new name and photo persist), delete the account, confirm sign-in with that email fails.

## AGENTS.md updates
- **Who owns what → Auth:** add that profile edits, sessions and deletion use `user.update`, `user.setProfileImage`, `user.getSessions` / `session.revoke` and `user.delete` from `@clerk/expo`, through `src/lib/account.ts`; deletion is client side and gated on `user.deleteSelfEnabled`; reverification approach from Step 0.
- **Analytics:** add the new events.
- **Rules (routes bullet):** Profile is now the Account screen with sheets `account/personal` and `account/settings`; replace "Trips and Profile are placeholders, Profile holds Sign out".
- **Design system → shared components:** add `StatsRow`, `ProfileSection`, `DeviceRow`; update the `/design-system` section count.
- Note `expo-image-picker` as a dependency.

## Result
Built as planned. Step 0 findings: `launchImageLibraryAsync` needs no runtime permission (config plugin added in `app.json` with a photo string, camera and microphone off); `useReverification` accepts `onNeedsReverification` with `complete` / `cancel`, and the Expo docs have no page for it, so the password flow uses `session.startVerification` + `attemptFirstFactorVerification` from the installed types. Deviations: `Button` got a `danger` variant; `ProfileRow` now puts its icon in a circle itself; Delete lives inline in Settings. Not done: the simulator visual check, the end-to-end flows and the reverification path (signing in needs an emailed code, so they were not run from here).
