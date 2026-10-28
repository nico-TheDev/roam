# 28 · Share the demo

Status: approved

## Goal
A reviewer can try Roam without help: open the landing page, download a sideloadable Android APK, sign in with a published demo account, and read a README that shows the app, how it is built and why. A public demo can't run up a DeepSeek or Sanity semantic-search bill.

## Decisions
- Android only. iOS needs the Apple Developer Program, which isn't available; the README says so and points iOS reviewers to the screenshots. Use the existing `production-apk` profile in `eas.json`; no new profile.
- APK distribution (answered): a GitHub Release on `nico-TheDev/roam`; the README links the download. The APK talks to the production API (`https://nico17-roam.expo.app`, plan 25), Clerk dev instance and Stripe test mode.
- Demo login (answered): a Clerk test-email user (`<name>+clerk_test@example.com`) with a password. Clerk dev instances accept the fixed code `424242` for `+clerk_test` emails, so device trust stays on and no Clerk setting changes. Created with the Clerk MCP `create_user`. Credentials are published in the README and shown as a hint on the sign-in screen (one line from `src/lib/demo.ts`, same single-source rule as plan 27). Shared account, so saved stays and bookings made on it are visible to the next reviewer; the README says so. Reviewers can still sign up with their own email.
- Landing page (answered): Vercel, project root `landing/`, build `npm run build`, output `dist`. Free Hobby plan. Hosting moves from "not chosen yet" to Vercel in AGENTS.md. The landing page still shows no store badges; the only new link is the GitHub Release APK once it exists (plan the CTA then, since AGENTS.md bans CTA buttons until real links exist; the APK is a real link, so one "Download for Android" link is allowed).
- Spend caps (answered): per-user and per-address limits already exist (`src/lib/rate-limit.ts`, plan 26). Add on top:
  - A global daily budget in Neon (new table `daily_budget`: `day`, `kind`, `count`; one atomic upsert like `rate_limits`; migration `0003`/next number, applied with `npx drizzle-kit migrate`). Kinds: `model_search` (DeepSeek read of a search sentence), `semantic_search` (Dataset Embeddings query), `model_ask` (DeepSeek pick of policy entries). Caps live in one `DAILY_BUDGET` map next to `LIMITS`, overridable with env vars so they change without a deploy of code.
  - When a cap is hit: search skips the model and uses the regex reading (`interpreter: fallback`, already supported) and skips semantic ranking (results stay hard-filtered, ordered by rating); Ask returns 503 `demo_busy` and the chat shows "Roam is busy today, try again tomorrow" with the retry, not the support card. Fails open like the rate limiter (log `daily_budget_failed`).
  - The user sets a monthly spend limit in the DeepSeek dashboard and watches Sanity's semantic quota (user action, not code).
- Sign-up throttling is not added (not selected). The daily budget is the backstop for account farming.
- README (replaces the Expo template): what Roam is, hero screenshot strip, "Try it" (landing link, APK link, demo credentials, test card `4242 4242 4242 4242`, what is demo-only), screenshots from `docs/screenshots/` (24 files exist, not 22; pick the ones that tell the story and group them by flow), an architecture diagram, "Decisions" (short, drawn from AGENTS.md), run-it-yourself commands and env var names (no values). The diagram is Mermaid in the README so GitHub renders it and it stays editable; no exported image.
- Decisions section content, one or two lines each: Clerk for auth and private saved stays; Sanity as the one content store with typed fields for hard filters and prose for soft intent; code finds every option and the model only labels them; GROQ filters are the only hard constraints and embeddings only rank; no model writes shown text (policy answers are word for word); server prices every booking and only a verified Stripe payment creates one; rate limits and daily budgets in Neon. Each line must match AGENTS.md.

## Out of scope
- iOS TestFlight, Play Store listing, custom domain, production Clerk instance, live Stripe.
- A public web privacy page, sign-up throttling, per-feature dashboards for spend.
- Changing search or Ask behavior beyond the fallback when the budget is exhausted.

## Steps
### 1. Daily budget
Add the `daily_budget` table to `src/lib/db/` schema, generate and apply the migration. Add `spendBudget(kind)` to `src/lib/rate-limit.ts` (or a sibling `src/lib/daily-budget.ts`, matching the surrounding pattern): one upsert on the UTC day, returns `{ ok: true } | { ok: false }`, fails open. Wire it in `src/lib/search-server.ts` (before the DeepSeek call), `src/app/api/search+api.ts` (before the semantic score) and `src/lib/ask-server.ts` / `src/app/api/ask+api.ts` (before the DeepSeek call); the Ask chat in `src/app/stay/[id]/ask.tsx` maps `demo_busy` to the busy message. Done: with a cap of 0 via env, search still returns hard-filtered results with `interpreter: fallback` and Ask shows the busy message; with the normal cap everything behaves as before.

### 2. Demo account and sign-in hint
Create the demo user with the Clerk MCP (dry run is not available for users; confirm the email first). Add `DEMO_LOGIN` (email, password) to `src/lib/demo.ts` and a one-line hint on `src/app/sign-in.tsx` ("Reviewing the demo? Use demo@..., password ..., code 424242"). Done: signing in with the demo account on a fresh device works, the code step accepts 424242, and the hint renders in light and dark.

### 3. Deploy the landing page to Vercel
Add `landing/vercel.json` only if the dashboard defaults aren't enough. The user imports the repo in Vercel with root `landing/`. Set Astro `site` in `landing/astro.config.mjs` to the final URL. Done: the Vercel URL serves the page, theme toggle and typing demo work, and `npm run build` passes locally.

### 4. Android APK and GitHub Release
Run `npx eas-cli@latest build --platform android --profile production-apk` (user runs it or approves; it uses EAS build credits). Download the APK, install on an emulator or device, sign in with the demo account, search, open a stay, and complete a test-card booking. Create a GitHub Release (for example `v0.1.0-demo`) with the APK attached; ask before publishing it. Done: the release page has the APK and it installs and works against production.

### 5. Landing download link
Add one "Download for Android" link on the landing page pointing at the release asset, plus a short "Demo build: Stripe test mode, sample stays" line, matching existing landing styles. Done: the link downloads the APK.

### 6. README
Write `README.md` per the Decisions. Use relative paths to `docs/screenshots/*.png`. Verify every command and env var name against `package.json`, `.env.example` and AGENTS.md. Done: README renders on GitHub (Mermaid diagram displays, images load, links work).

## Progress
- Step 1 done (migration `0003_daily_budget` applied; not yet deployed to production).
- Step 2 done: dev-instance user `demo+clerk_test@example.com`, credentials in `src/lib/demo.ts`; sign-in plus code 424242 verified against Clerk's API.
- Step 6 done as a draft: README written; the APK link points at `releases/latest` and the landing URL is not in it yet.
- Steps 3, 4, 5 wait on the user (Vercel import, EAS build and release approval).

## Verification
- `npx tsc --noEmit` (app files) and `npx expo lint` pass.
- Budget: set each cap to 0 in turn; search falls back, Ask shows the busy card; reset and confirm normal behavior. Check `daily_budget` counts increase by one per call and reset on a new UTC day.
- Existing rate-limit checks from plan 26 still pass.
- Demo login: fresh install of the APK, sign in with the published credentials and code 424242.
- Landing: Vercel URL loads in light and dark, mobile width, no console errors; APK link works.
- README: preview on GitHub; every link and image resolves.
- End to end as a reviewer: landing page, download APK, install, sign in with demo account, search "quiet pet friendly cabin under $300", open a stay, ask a policy question, book with the test card, see the trip.

## AGENTS.md updates
- Landing page: hosting is Vercel (root `landing/`); add the Android download link rule.
- Rate limiting: add the global `daily_budget` (kinds, fallback behavior, `demo_busy`, env overrides).
- Auth: record the demo account (Clerk test email, code 424242) and where its credentials live (`src/lib/demo.ts`).
- Add `README.md` as the public overview; AGENTS.md stays the source of decisions.
