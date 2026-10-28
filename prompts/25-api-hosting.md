# 25 · API hosting

Status: approved (production only, 2026-10-28; steps 1, 3, 4, 5 done; production https://nico17-roam.expo.app)

## Goal
Roam's API routes (`src/app/api/**`) run on EAS Hosting as a single production deployment, and release builds of the app talk to the production URL. Stripe stays in test mode and Clerk stays on the dev instance.

## Decisions
- Host: EAS Hosting (Cloudflare Workers, `web.output: "server"` already set). No second platform.
- URL: the EAS default production URL for now. It gets compiled into app builds, so changing it later needs a new app release. Revisit with a custom domain before public launch.
- Scope: hosting and environments only. Clerk dev instance, Stripe test mode (`BOOKINGS_LIVE` unset), Apple off.
- Environments: production only (changed from staging + production, 2026-10-28). Env vars live in the EAS `production` environment (`eas env:create`), never in the repo. A staging deployment, Neon branch and `preview` env vars were created while trying it and are unused.
- Deploys: an EAS Workflow (`.eas/workflows/`) deploys production on push to `main`, after lint and `tsc`. No PR previews.
- Rollback: deployments are immutable; roll back by moving the `production` alias to a previous deployment (`eas deploy:alias --prod --id=<id>`).
- Found in the repo: API calls are relative (`fetch("/api/search")`), which only works in dev. The `expo-router` plugin needs `origin` for release builds.

## Known limitation
Web pages return 500 on EAS Hosting (`Cannot read properties of undefined (reading 'generated')` from Expo Router's server render on Workers; the same build renders 200 under Node). API routes are unaffected and the native app never loads pages. Decided to leave it (2026-10-28).

## Out of scope
Custom domain, live Stripe, Clerk production instance, rate limiting, host photo uploads moving to presigned URLs, landing page hosting.

## Steps
### 1. Prove the code runs on the Workers runtime
Run `npx expo export -p web` then `npx expo serve` and call each route from `src/app/api/` (curl with a Clerk test token; Stripe webhook via `stripe listen`). Pay special attention to: `getDb()` (`Pool` over WebSocket + `pg_advisory_xact_lock` in `booking-server.ts` and `booking-finalize.ts`), `constructEventAsync` on the raw body, `@clerk/backend` `verifyToken`, `ai` + `@ai-sdk/deepseek` with the 5 s timeout, and the 10 MB photo upload. Note: a Pool must not outlive a request on Workers; confirm `pool.end()` is awaited or the connection is released per request, and fix if not. Done = every route answers locally from the exported server bundle, with any fixes listed.

### 2. Point release builds at the API
Done by `prompts/25-eas-builds.md`: `app.config.js` sets the `expo-router` plugin `origin` from `EXPO_ROUTER_ORIGIN`. `EXPO_ROUTER_ORIGIN=https://nico17-roam.expo.app` is set in the EAS `production` environment, and `expo config` shows the origin with it set and none without. `eas.json` now has a `production` profile (`environment: production`, `distribution: store`, `autoIncrement`). The user has no Apple Developer or Google Play account yet, so it can't be installed on a device until they do; for a device smoke test before then, use a temporary `internal` Android APK profile. The other plan's `preview`/`development` builds have no EAS vars after the staging cleanup; that plan owns restoring them.

### 3. First deploys
`eas login`, `eas init` if the project isn't linked. `npx expo export -p web`, then `npx eas-cli@latest deploy` and `deploy --prod`. Done = an unauthenticated route returns 401 (not 500) on the production URL.

### 4. Environment variables
Create every server secret in the EAS `production` environment; `EXPO_PUBLIC_*` values are public by design. Set `BOOKING_HOLD_MINUTES` explicitly. Update `.env.example` (add `DATABASE_URL_POOLED`, `EXPO_PUBLIC_API_ORIGIN`, `BOOKINGS_LIVE` commented out). Run `npx drizzle-kit migrate` against each database. Done = `eas env:list` shows the same variable names in both environments, and no secret is behind `EXPO_PUBLIC_`.

### 5. Stripe webhook
Create one test-mode webhook endpoint for `payment_intent.succeeded|payment_failed|canceled` pointing at `https://nico17-roam.expo.app/api/stripe/webhook`, and store its signing secret as `STRIPE_WEBHOOK_SECRET` in `production`. Done = a real PaymentIntent confirmed with `pm_card_visa` produces a booking.

### 6. CI/CD
Add `.eas/workflows/deploy-production.yml` (push to `main`, `type: deploy`, `prod: true`, lint and `tsc --noEmit` first). Done = a merge to `main` updates production.

### 7. Observability and runbook
Confirm logs, crashes and requests show in the EAS dashboard. Check PostHog still receives events from a release build. Add `docs/` runbook: deploy, roll back, rotate a secret, add an env var. Done = one induced 500 appears in the dashboard.

### 8. Release build smoke test
Build a `production`-profile app with EAS, install it, and run the full flow against production in Stripe test mode: sign in, search, ask a policy question, book with a test card, see the trip, host a stay. Ask before running builds.

## Verification
- `npx expo export -p web` succeeds; `npx tsc --noEmit` and `npx expo lint` pass.
- Every route answers on the production URL; unauthenticated calls return 401, webhook with a bad signature returns 400.
- Booking end to end on production: quote, checkout, PaymentSheet with `pm_card_visa`, webhook creates the booking, `/api/bookings/status` confirms, double-booking attempt is refused.
- Rollback rehearsal: move the alias back, confirm the old behavior returns.
- Release build on a real device or simulator calls the hosted API (check request log in the EAS dashboard), not localhost.
- No secret appears in the app bundle (`grep` the export for key prefixes `sk_`, `whsec_`, `postgres://`).

## AGENTS.md updates
- Add a **Hosting (API)** entry under "Who owns what": EAS Hosting, environments, URL source (`origin`), alias rollback, workflows. Note the existing "Hosting" entry is about stay hosts, so name the new one "API hosting" to avoid confusion.
- Replace "Hosting not chosen yet" is only for the landing page and stays; leave it.
- Add `npx expo export -p web`, `npx expo serve` and `eas deploy` to Commands.
