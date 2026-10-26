# 05 · Sign up, verification and sign in (mocked auth)

Status: done

Builds on `04-onboarding.md` (routes, Wordmark, Button, placeholders `sign-up.tsx` and `sign-in.tsx`) and the design system. Design: `assets/prompt-imgs/auth.png` (Create account). Ask for it again if building in a new session. Verification and Sign in are not in the design; they reuse its layout.

## Goal
A guest can go onboarding → Create account → enter a code → home, or onboarding → Sign in → home, with real form behavior (validation, loading, errors, resend) and no real authentication. Everything auth-related sits behind one mock module so Clerk can replace it later.

## Decisions
Answers from the question round:
- **Verification:** six single-digit boxes in the field style, yellow Verify button, "Resend code" with a 30 s cooldown.
- **Mock rules:** client validation plus a simulated delay. Code `123456` verifies, any other code shows an error. Sign in accepts any valid email and a password of 8+ characters, and fails for `wrong@example.com` (to exercise the error state). Social buttons run the same fake success.
- **After auth:** success replaces the stack with `/home`, so back does not return to auth. Apple button shows on all platforms, as in the design; its logo is a marked placeholder.

Defaults I picked:
- **Mock module:** `src/lib/auth.ts` exports `signUp({name,email,password})`, `verifyCode(email, code)`, `resendCode(email)`, `signIn({email,password})`, `signInWithProvider(provider)`. Each is async, waits about 900 ms, and returns `{ ok: true }` or `{ ok: false, error: string }`. No state is stored, no tokens exist. It is the only file that changes when Clerk arrives. `src/lib/` is new (utils outside `src/app/`).
- **Session:** none yet. The home placeholder stays reachable by Skip, so no gating or route protection now.
- **Routes:** `sign-up.tsx`, `verify.tsx` (takes `email` as a search param), `sign-in.tsx`. A Stack animation of the default slide is kept. Forgot password is not built (out of scope).
- **Shared pieces:** a `AuthScreen` layout component (safe-area top, back `IconButton` left, small Wordmark right, heading, subtitle, scrolling content, keyboard avoiding with `KeyboardAvoidingView` and `ScrollView keyboardShouldPersistTaps="handled"`). `TextField` gets an optional visible `title` (label above the value, inside the box) as in the design. New `CodeInput` (six boxes, one hidden `TextInput`, paste support, `textContentType="oneTimeCode"`). New `Divider` with centered label ("or"). `SocialButtons` (Google and Apple) used by sign up and sign in. All added to `/design-system` (extend sections 05 Input fields and 04 Buttons).
- **Form behavior:** validate on submit, then on change once a field has been touched. Errors under the field with `TextField` `error`. Server-style failures show in an `Alert` (danger tone) above the button. Submit disabled while loading (`Button loading`). Return key moves name → email → password → submit. Email `keyboardType="email-address"`, `autoCapitalize="none"`, `autoComplete`, password `textContentType` set for autofill.
- **Validation rules:** name 2+ characters after trim; email matches a simple pattern (`/^\S+@\S+\.\S+$/`); password 8+ characters.
- **Navigation:** Sign up footer "Sign in" link goes to `/sign-in` with `replace`, and the reverse on sign in, so the auth stack never grows. Sign up success pushes `/verify?email=...`. Verify back returns to sign up. Success on any screen: `router.dismissAll()` then `router.replace("/home")` (or the nearest equivalent from the expo-router docs for the current SDK; check before writing).
- **Privacy:** no analytics events and no logging of form values.
- **Accessibility:** every field has its label as `accessibilityLabel`, errors announce via `accessibilityRole="alert"`, code boxes expose one labeled input ("Verification code"), all hit targets at least 44 pt.
- **Dark mode:** tokens only; the one hardcoded value is TextField's placeholder color, which already exists.

## Design to token mapping
Estimated from the image (1024 px frame, about 1.77x scale of a 402 pt screen):
- Screen `bg-surface`, edge padding `px-5`. Back button: `IconButton` `size="sm"` with `border border-border` on a `bg-surface` fill (design shows an outlined circle, not the gray fill). Needs a `variant="outline"` on `IconButton`.
- Wordmark top right at about 32 px. **Add `size="xs"`** (Outfit, 32/34) to `Wordmark`; the existing sizes are 56 and 88.
- Heading "Create your account": `text-headline` (42/44) is the nearest; design looks about 40. Check in the visual pass.
- Subtitle: `Text variant="lead"` (muted).
- Fields: `bg-surface-alt`, `rounded-md`, about 60 pt tall, leading Lucide `User`, `Mail`, `Lock` (`size="lg"`, `text-ink`), trailing `EyeOff`/`Eye` on password. Title `text-caption` ink, value/placeholder `text-body` muted. Field height with a title is `h-16`; focused style stays `border-secondary bg-secondary-soft`. No border in the resting design: keep the existing `border-border`, which is nearly invisible on `surface-alt`.
- Create account: `Button` primary with `ArrowRight` trailing. Google and Apple: `Button variant="secondary"`.
- "or" divider: `bg-border` hairlines, `text-small` muted.
- Footer: `text-small` muted plus an underlined `text-caption` link, centered.
- **Missing assets:** Google "G" (still the placeholder from onboarding) and the Apple logo (placeholder glyph). No new colors.
- Verification and Sign in titles and copy (mine, editable): "Verify your email" / "We sent a 6-digit code to {email}. Enter it below to finish creating your account."; "Welcome back" / "Sign in to see your saved stays and pick up where you left off."

## Out of scope
- Clerk, real sessions, token storage, route protection, sign out.
- Forgot password and password reset.
- Real social sign in (OAuth) and Sign in with Apple.
- Analytics events.

## Steps
### 1. Mock auth module
Create `src/lib/auth.ts` as above with typed results. Done when `tsc` passes and a quick manual call returns the documented results (code `123456` ok, `wrong@example.com` error).

### 2. Shared components
Extend `TextField` (`title`), `IconButton` (`outline` variant), `Wordmark` (`xs`). Add `AuthScreen`, `CodeInput`, `Divider`, `SocialButtons`; export from `index.ts`; add them to `/design-system`. Done when `/design-system?only=04,05` shows them and lint and tsc pass.

### 3. Sign up screen
Replace the placeholder with the design: three fields, validation, loading, error alert, Google and Apple, footer link. On success push `/verify?email=`. Done when each rule and state can be triggered.

### 4. Verification screen
Create `verify.tsx`: code input, Verify, resend with a 30 s countdown, wrong-code error, success to home. Done when `123456` reaches home and other codes show an error.

### 5. Sign in screen
Replace the placeholder with the same layout: email and password, Sign in, social buttons, footer link to sign up. Done when valid input reaches home and `wrong@example.com` shows the error alert.

### 6. Visual comparison
Per AGENTS.md: simulator screenshot of Create account against `auth.png`, list every difference, fix, repeat. Check keyboard open on a small device, and dark mode.

## Verification
- `npx expo lint` and `npx tsc --noEmit` pass.
- Sign up: empty submit shows three errors; bad email and short password show their messages; valid input shows loading then Verify.
- Verify: wrong code error, `123456` goes to home, resend is disabled during the cooldown then enabled, back returns to Sign up.
- Sign in: link switches without growing the stack; `wrong@example.com` shows the alert; valid input goes to home; back from home does not return to auth.
- Social buttons show loading and reach home.
- Keyboard: return key order, nothing hidden behind the keyboard, tapping outside keeps the keyboard handling usable.
- Screenshot vs `auth.png`, with differences listed.
- End to end: cold start → Get started → sign up → code → home.

## AGENTS.md updates
- Add a "Auth (mocked)" line under Who owns what or Design system: `src/lib/auth.ts` is the only mock, replaced by Clerk in the auth feature; test values (`123456`, `wrong@example.com`).
- Routes line: add `verify.tsx`, and say sign-up and sign-in are real screens.
- Shared components list: AuthScreen, CodeInput, Divider, SocialButtons; Wordmark sizes md|sm|xs.

## Result
Built as planned. Changes: auth title uses a new `text-headline-sm` (36/40) and the sign up title breaks as "Create / your account" like the design; subtitle is `text-body` with right padding to match the design's wrap; validation lives in `src/lib/validation.ts` and the post-auth navigation in `src/lib/use-enter-app.ts`; an `AuthSwitch` footer component was added; `Text` now drops its default color when a color class is passed (fixes `text-danger` losing to `text-ink`); a field is flagged on blur only once it has text. Apple mark is Lucide `Apple`, a placeholder. Not verified: tapping and typing in the app (no way to drive Expo Go here), dark mode, small screens, keyboard behavior.
