# 29 · Google sign-in return route

Status: done

## Goal
After Google sign-in on Android, the guest lands on Home, not an "Unmatched Route" screen.

## Decisions
- Cause: Clerk's `useSSO` defaults the redirect to `AuthSession.makeRedirectUri({ path: "sso-callback" })` (`roam://sso-callback` in a build). Android delivers it as a deep link, so Expo Router also tries to open `/sso-callback`, which doesn't exist.
- Fix with a route (like `stripe-redirect.tsx`), not `+native-intent`, so the screen can read auth state: a signed-in guest goes to `/home`, otherwise back to `/sign-in` until the session is active.
- Route sits outside both `Stack.Protected` groups, so it resolves in either state.
- Clerk still reads the URL itself through AuthSession; the route only absorbs the router's copy.

## Out of scope
iOS behavior changes, a custom `redirectUrl`, and other deep links.

## Steps
### 1. Add `src/app/sso-callback.tsx`
Render `<Redirect href={isSignedIn ? "/home" : "/sign-in"} />` using `useAuth` from `@clerk/expo`; render nothing until `isLoaded`. Register it in `src/app/_layout.tsx` as an unguarded `Stack.Screen`.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass.
- Open `roam://sso-callback` while signed in and signed out (simulator `xcrun simctl openurl`): no unmatched route.
- Android APK: Google sign-in ends on Home. (Needs a new build.)

## AGENTS.md updates
Routes bullet: mention `sso-callback.tsx` and `stripe-redirect.tsx` as deep link landing routes.


## Result
Added `src/app/sso-callback.tsx` and registered it in `_layout.tsx`. Type check and lint clean for `src/`; device check pending a new APK.
