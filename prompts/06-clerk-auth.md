# 06 · Clerk auth (replace the mock)

Status: done

Builds on `05-auth-screens.md` (screens, `src/lib/auth.ts` mock, `useEnterApp`). No new designs: the screens keep their layout and copy.

## Goal
A guest can create an account with email, password and an emailed 6-digit code, sign in with email and password, continue with Google, stay signed in across app restarts, reach `/home` only when signed in, and sign out. The custom screens stay; Clerk replaces the mock behind them.

## Decisions
Answers from the question round:
- **Password rule:** the Clerk dev instance currently requires 15+ characters. Lower `auth_password.min_length` to 8 through the Clerk MCP (dry run first) so it matches `validation.ts`.
- **Name:** enable `user_model.first_name` and `last_name` (not required) in Clerk. Sign up keeps one "Full name" field; code splits it on the first space (`Adrian Hajdin` → first `Adrian`, last `Hajdin`; one word → first only).
- **Social:** Google works through `useSSO()` (browser flow, runs in Expo Go; the dev instance uses Clerk's shared Google credentials). The Apple button is hidden on both screens. `SocialButtons` gets a `providers` prop, so Apple returns later without a rewrite.
- **Sign in:** email + password. Sign up verifies the email with a code.

Defaults I picked:
- **Current SDK API only:** `useSignUp()` / `useSignIn()` from `@clerk/expo` (v4.14.1 installed; the skill was written for 3.6, so check the installed `.d.ts` for each method before using it). No `setActive` / `prepareFirstFactor`. Social uses `useSSO()` and `setActive`.
- **Hooks module:** `src/lib/auth.ts` is rewritten as hooks (`useSignUpFlow`, `useSignInFlow`, `useVerifyFlow`, `useGoogleAuth`, `useSignOut`), still returning `AuthResult` (`{ ok: true } | { ok: false; error: string }`) so screens change little. Clerk error → message mapping lives here (uses `error.errors[0].longMessage`, falls back to a generic line). No logging of form values.
- **Device trust:** the instance has `device_trust` on, so password sign in from a new device can end in `needs_client_trust`. `/verify` takes a `flow` param (`sign-up` | `sign-in`) and handles both: sign-up uses `signUp.verifications.verifyEmailCode`, sign-in uses `signIn.mfa.sendEmailCode` / `verifyEmailCode`. Copy for the sign-in case: "Confirm it's you" / "We sent a 6-digit code to {email} because you're signing in from a new device."
- **Session persistence:** `tokenCache` from `@clerk/expo/token-cache` (already on `ClerkProvider`), which needs `expo-secure-store`.
- **Protected routes:** `Stack.Protected` in the root `_layout.tsx`, no file moves, so URLs stay the same. `guard={isSignedIn}` wraps `home`; `guard={!isSignedIn}` wraps `index`, `sign-up`, `verify`, `sign-in`. `design-system` stays public (dev tool). Render nothing (splash stays up) until `useAuth().isLoaded`. A signed-in cold start lands on `/home`, and signing out lands on onboarding. Expo Router handles the redirect, so `useEnterApp` is deleted and screens no longer navigate after success.
- **Onboarding "Skip":** home is protected now, so Skip goes to `/sign-in`. The onboarding "Continue with Google" button runs the Google flow directly.
- **Sign out:** a "Sign out" button on the home placeholder (`useClerk().signOut()`), with loading state. A proper profile screen comes with the real home.
- **Bot protection:** sign-up renders `<View nativeID="clerk-captcha" />` (captcha is off on the dev instance but needed if turned on).
- **Session tasks:** if `finalize` reports `session.currentTask`, show a generic error pointing to support (no task UI exists; none are enabled on the instance).
- **Env:** `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` already in `.env.local`. `CLERK_SECRET_KEY` is there too and is not used by the app yet (API routes later). Add `.env.example` with names only.

## Out of scope
- Forgot password / reset, MFA, passkeys, Sign in with Apple, native Google sheet.
- API routes verifying the Clerk session (no API routes exist yet; the rule applies when they do).
- PostHog identify, profile screen, account deletion.
- Production Clerk instance and Google credentials of our own.

## Steps
### 1. Dependencies and config
Ask-first items (approved with this plan): `npx expo install expo-secure-store expo-auth-session` (`expo-web-browser` is already installed). Add `"expo-secure-store"` and `"@clerk/expo"` to `app.json` plugins. Remove the stray `"packageManager": "yarn@..."` line from `package.json` (the repo uses npm and `package-lock.json`). Create `.env.example` (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, no values). Done when `npx tsc --noEmit` passes and the app boots with no provider errors.

### 2. Clerk instance settings (Clerk MCP)
Read `get_instance_config_schema`, then `patch_instance_config` with `dry_run` first: `auth_password.min_length: 8`, `user_model.first_name` and `last_name` `{ enabled: true, required: false }`. Apply, then re-read to confirm. Done when the re-read shows the three values.

### 3. Auth hooks
Rewrite `src/lib/auth.ts` as described, checking method names against `node_modules/@clerk/expo/dist/hooks/*.d.ts` first. Sign up: `signUp.password({ emailAddress, password, firstName, lastName })` then `verifications.sendEmailCode()`. Verify: `verifyEmailCode({ code })` then `finalize()`. Resend: `sendEmailCode()`. Sign in: `signIn.password({ emailAddress, password })`, then `finalize()` on `complete`, or `needs_client_trust` → send email code and report `{ ok: true, next: "verify" }`. Google: `startSSOFlow({ strategy: "oauth_google" })`, `setActive`; cancel is not an error. Done when it type-checks.

### 4. Screens
Switch `sign-up.tsx`, `verify.tsx`, `sign-in.tsx` to the hooks; add the `flow` param and copy variants to `verify.tsx`; add the captcha mount to sign-up; delete `use-enter-app.ts`; add `providers` to `SocialButtons` and pass `["google"]`; update the `/design-system` section that shows it. Done when each screen shows loading, field and form errors from Clerk, and has no navigation-after-success code.

### 5. Route protection and sign out
Edit `src/app/_layout.tsx` (`isLoaded` gate, `Stack.Protected` groups), change onboarding Skip and Google button, add Sign out to `home.tsx`. Done when signed-out users cannot open `/home` (including by deep link `roam://home`) and sign out returns to onboarding.

### 6. Visual check
Screenshots of sign up, verify (both variants) and sign in in the simulator, light and dark, against the 05 result. Done when nothing regressed (Apple button gone, spacing without the second social button is acceptable).

## Verification
- `npx expo lint` and `npx tsc --noEmit` pass; `npx expo-doctor` has no new issues.
- Sign up: new email → code arrives → wrong code shows an error → right code lands on `/home`. Weak/breached password shows Clerk's message. Existing email shows an error. Resend works after the 30 s cooldown.
- Sign in: right credentials → `/home`; wrong password → alert; unknown email → alert (Clerk returns a generic error with enumeration protection on); new-device case → `/verify` in sign-in mode → `/home`.
- Google: completes and lands on `/home`; cancelling the browser shows no error.
- Persistence: sign in, kill the app, relaunch → straight to `/home`, no onboarding flash.
- Protection: signed out, `xcrun simctl openurl booted roam://home` does not show home. Signed in, `roam://sign-in` does not show sign-in.
- Sign out: Sign out → onboarding; relaunch stays signed out; back gesture cannot return to home.
- End to end: fresh install → Get started → sign up → code → home → kill/relaunch → home → sign out → sign in → home.
- Not checkable here and listed as ❌ if not run: receipt of the real email, Google on a physical device.

## AGENTS.md updates
- **Who owns what → Auth:** Clerk with custom screens via `useSignUp` / `useSignIn` / `useSSO`; dev instance settings (password min 8, names on, email-code verification, device trust on).
- **Design system → Routes / Auth:** replace the "Auth is mocked" bullet and the `useEnterApp` mention. Routes are protected with `Stack.Protected` in `_layout.tsx`; `src/lib/auth.ts` holds the Clerk hooks; test values `123456` / `wrong@example.com` are gone.
- **Shared components:** `SocialButtons` takes `providers`; Apple hidden.
- **Rules:** unchanged (already cover secret keys and session verification in API routes).

## Result
Built as planned. Added `expo-secure-store` and `expo-auth-session`, Clerk instance updated (min password 8, names on), `auth.ts` rewritten as hooks, screens switched, `use-enter-app.ts` deleted, `Stack.Protected` guards, Sign out on home. Session lifetime on the dev instance is 7 days (`session_settings.maximum_lifetime`), so "persistent" means up to a week unless changed. Verified in the simulator: boot to onboarding, signed-out deep link to `/home` is blocked, sign-up renders with Google only. Not verified: typing into forms, receiving the real email code, Google flow, persistence after relaunch, sign out.
