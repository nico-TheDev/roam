# 25 · EAS build profiles (eas.json)

Status: approved

## Goal
`npx eas-cli@latest build --profile <name>` produces a Roam build that works outside the dev server: a development client for the iOS simulator, a development client for a physical device, and a preview build for testers, all calling a deployed API on EAS Hosting.

## Decisions
- "EAS manifest" means `eas.json` build profiles. No `expo-updates`, runtime version or channels yet.
- API routes are hosted on EAS Hosting (`eas deploy`). Native builds reach them through the `origin` option of the `expo-router` plugin, which `app.config.js` fills from `EXPO_ROUTER_ORIGIN` (default: unset, so dev server behavior is unchanged).
- Profiles: `development-simulator` (dev client, iOS simulator), `development` (dev client, internal distribution), `preview` (internal distribution, production-like). No `production` profile and no `submit` section until there are store accounts.
- The user has no Apple Developer or Google Play account yet. Consequences: the simulator build works today; the iOS device build and any iOS internal build need the Apple Developer Program; Android `development` and `preview` build as APKs without a Play account.
- App identifiers are proposed, not chosen: `ios.bundleIdentifier` and `android.package` = `com.roam.stays` (placeholder, user to confirm; they are permanent once a store listing exists).
- `cli.appVersionSource` = `remote`, `autoIncrement` only on the future production profile.
- Public values (`EXPO_PUBLIC_*`, `EXPO_ROUTER_ORIGIN`, `POSTHOG_*`) go in EAS environment variables, not in `eas.json`. Secret keys never go in a build profile or the app bundle (they live only with the EAS Hosting deployment).
- `@stripe/stripe-react-native` is a native module, so every profile is a dev client or standalone build, never Expo Go. `expo-dev-client` is a new dependency and needs approval.

## Out of scope
Store submission, production profile, EAS Update / OTA, push notifications, CI workflows, custom domain for the API, Stripe live mode.

## Steps
### 1. Identifiers and origin in app config
Read `https://docs.expo.dev/versions/v58.0.0/` for the config fields first. In `app.json` add `ios.bundleIdentifier` and `android.package`. In `app.config.js` set the `expo-router` plugin's `origin` from `process.env.EXPO_ROUTER_ORIGIN` when present (map over `plugins`, replace the string entry `"expo-router"` with `["expo-router", { origin }]`). Done when `npx expo config --type public` shows the origin with the env var set and no origin without it, and `npx expo start` still works.

### 2. Dependency
After approval, `npx expo install expo-dev-client`. Done when `npx expo-doctor` is clean.

### 3. eas.json
Create `eas.json` at the root:
- `cli`: `{ "version": ">= <current eas-cli major>", "appVersionSource": "remote" }`
- `base`: shared `env` placeholder only if needed (no secrets).
- `development-simulator`: `extends` base, `developmentClient: true`, `distribution: internal`, `ios.simulator: true`.
- `development`: `developmentClient: true`, `distribution: internal`.
- `preview`: `distribution: internal`, `android.buildType: apk`, `channel` omitted.
Check the property names against `https://docs.expo.dev/eas/json/`. Done when `npx eas-cli@latest build:configure` reports no changes and `npx eas-cli@latest config --profile preview --platform ios` prints the resolved profile.

### 4. EAS environment variables
Create environment variables with `npx eas-cli@latest env:create` for each of `development`, `preview`: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_SANITY_PROJECT_ID`, `EXPO_PUBLIC_SANITY_DATASET`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `POSTHOG_PROJECT_TOKEN`, `POSTHOG_HOST`, `EXPO_ROUTER_ORIGIN` (set after step 5). Visibility: plain text/sensitive as the CLI offers; none of these are secret keys. Update `.env.example` with `EXPO_ROUTER_ORIGIN=`. Done when `eas env:list` shows them.

### 5. Deploy the API to EAS Hosting
Follow the `expo:eas-hosting` skill. `npx expo export --platform web`, then `eas deploy --environment preview` (server secrets from `.env.example` set as EAS Hosting secrets, not in the app profile). Set `EXPO_ROUTER_ORIGIN` to the deployment URL. Point the Stripe webhook endpoint at `<origin>/api/stripe/webhook` (test mode) and set `STRIPE_WEBHOOK_SECRET` for that deployment. Done when `curl <origin>/api/ask` returns 401 (route up, Clerk guard working).

### 6. Build and run
`eas build --profile development-simulator --platform ios`, install on the simulator, sign in, load Home, run a search. Then `eas build --profile preview --platform android` (APK), install, repeat. iOS device and iOS preview wait for an Apple Developer account.

## Progress
Steps 1-3 done (EAS project `@nico17/roam` created, `projectId` in `app.json`). Steps 4-6 wait on the user: env values, API secrets for EAS Hosting, and the first deploy.

## Verification
- `npx expo lint`, `npx tsc --noEmit`, `npx expo-doctor` pass.
- `npx expo config --type public` with and without `EXPO_ROUTER_ORIGIN`.
- Simulator dev-client build installs, signs in with Clerk, Home loads stays from Sanity, Search returns ranked stays (proves `/api/*` reaches EAS Hosting).
- Android preview APK: same flow, plus a test-mode booking with `4242 4242 4242 4242` reaching the confirmation screen (Stripe webhook through the deployed URL).
- End to end: a fresh clone plus `eas env:pull` and `eas build --profile development-simulator` yields a working app without a local dev server running.
- Not checkable now: iOS device and iOS preview builds (no Apple account).

## AGENTS.md updates
Add an **EAS builds** entry under "Who owns what": profile names and purpose, where public env lives (EAS environment variables), `EXPO_ROUTER_ORIGIN` behavior, API on EAS Hosting, no production profile or submit config yet. Update Commands with `eas deploy`. Update the Hosting note that API hosting is chosen.
