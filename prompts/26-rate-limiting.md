# 26 · Rate limiting

Status: done

## Goal
Every API route in `src/app/api/` caps how often one guest (or one unauthenticated address) can call it, so spam can't run up DeepSeek, Sanity semantic-search, Stripe, photo upload or database costs. A guest who hits a cap gets a clear "slow down" instead of a crash, and normal use never notices the limits.

## Decisions
- Store: Neon Postgres (answered 2026-10-28), no new service or dependency. EAS Hosting runs on Cloudflare Workers, so in-memory counters would be per isolate and reset on cold start.
- Algorithm: fixed window, 60 s, one atomic upsert (`INSERT ... ON CONFLICT DO UPDATE SET count = count + 1 RETURNING count`). Up to 2x the limit can land across a window boundary; fine for spam control.
- Keys (answered): signed-in routes use the verified Clerk user ID (`u:<id>:<route>`); requests with a missing or invalid token use the IP (`ip:<addr>`), checked before returning 401. The IP is `cf-connecting-ip`, then the first `x-forwarded-for` entry, then a shared `unknown` bucket. Never trust a user ID or IP from the body.
- Order in each route: `getUserId` first (no DB), then the limit, then any other work. One DB call on the happy path.
- Limits tiered by cost (answered). Requests per minute, per user per route:

  | Route | Limit | Why |
  |---|---|---|
  | `POST /api/search` | 20 | DeepSeek + monthly semantic quota |
  | `POST /api/ask` | 15 | DeepSeek + Sanity |
  | `POST /api/bookings/checkout` | 10 | creates holds and PaymentIntents |
  | `POST /api/bookings/quote` | 30 | Sanity read + DB |
  | `GET /api/bookings/status` | 90 | app polls 1/s for ~25 s |
  | `GET /api/bookings/availability`, `GET /api/bookings` | 60 | DB reads |
  | `POST /api/host/join` | 5 | one-time action |
  | `POST /api/host/stays` | 5 | Agent Action copy + Sanity writes |
  | `PATCH /api/host/stays/[id]` | 20 | may regenerate copy |
  | `POST /api/host/photos` | 40 | 5-30 photos per stay, 10 MB each |
  | other `GET /api/host/*` | 60 | Sanity/DB reads |
  | any route, no valid session (per IP) | 30 | cuts spam before any work |

- Over the limit: `429` `{ error: "rate_limited", retryAfter }` plus a `Retry-After` header (seconds to the end of the window).
- Fail open: if the counter query fails, log `rate_limit_failed` and let the request through. A DB blip must not lock guests out; the routes' own work would fail anyway if the DB is truly down.
- `/api/stripe/webhook` is not limited: Stripe signs it, a bad signature is rejected before any work, and a dropped real event would strand a paid guest (Stripe retries, but not worth the risk).
- Cleanup: about 1 request in 100 deletes rows with a window older than 1 hour. No cron.
- Counters hold a hashed key only (user ID and IP are hashed with SHA-256 before storage), never text, tokens or dates.

## Out of scope
Per-IP limits on signed-in routes, CAPTCHA, blocking or banning accounts, Clerk's own sign-in/sign-up limits (Clerk enforces these), Cloudflare WAF rules, limits on the landing site, and PostHog events for rate limiting (add if wanted later).

## Steps
### 1. Counter table
Add `rateLimits` to `src/lib/db/schema.ts`: `key` text, `windowStart` timestamptz, `count` integer not null default 0, primary key `(key, windowStart)`. Generate the migration with `npx drizzle-kit generate` (it becomes `drizzle/0002_*.sql`), apply with `npx drizzle-kit migrate` to the dev database. Ask before running migrate against the production database. Done = table exists, `tsc` passes.

### 2. Limiter
New `src/lib/rate-limit.ts` (server only):
- `LIMITS` map of route name to requests per minute (the table above) and `WINDOW_SECONDS = 60`.
- `clientAddress(request)`.
- `checkRateLimit(name, subject)` returns `{ ok: true } | { ok: false, retryAfter }`. It uses one `neon()` HTTP query (already in `@neondatabase/serverless`) instead of the booking `Pool`, so it needs no `pool.end()` and adds one round trip. Window start is computed in SQL (`to_timestamp(floor(extract(epoch from now()) / 60) * 60)`) so isolates with skewed clocks agree.
- `limited(retryAfter)` returns the 429 `Response` with the header.
- Fails open and logs on error. Read the URL like `getDb` (`DATABASE_URL_POOLED ?? DATABASE_URL`).
Done = a throwaway script calling `checkRateLimit` 21 times for limit 20 returns ok x20 then not ok.

### 3. Wire every route
In each handler listed in the table, replace the 401 branch with: no user → `checkRateLimit("unauth", ip)` (return 429 if over) → 401; with a user → `checkRateLimit("<route>", userId)` before body parsing or other work. Touch only the top of each handler. Leave the webhook alone. Files: `ask`, `search`, `bookings`, `bookings/{availability,checkout,quote,status}`, `host/{bookings,join,photos,policies,stays}`, `host/stays/[id]` (GET and PATCH have separate names).
Done = each route imports from `@/lib/rate-limit`, none reads a user ID from the body, and `npx tsc --noEmit` passes.

### 4. App handling of 429
In `src/lib/search-stays.ts`, `src/lib/ask-policies.ts` and `src/lib/bookings.ts` (the only places that map statuses), map `429` to a `rate_limited` error with copy "You're doing that a lot. Try again in a moment." shown through the existing error states (Search error, Ask retry card, booking sheet alert). No new components. The booking status poll treats a 429 as "still pending" and keeps polling, so a paid guest never sees a failure from a throttled poll.
Done = each screen shows that copy when the server returns 429 (forced by a temporarily low limit in dev).

### 5. Docs
`.env.example` needs nothing new. Add the rate-limit note to AGENTS.md (below) and to the `/api` hosting runbook in `docs/` if it lists routes.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass.
- Unit-style check: with `LIMITS.search` temporarily 3, four rapid `POST /api/search` calls with a valid token return 200, 200, 200, 429 with `Retry-After`; after the window the next call returns 200. Restore the limit.
- 35 rapid requests with no token to any route: first 30 return 401, then 429.
- User A hitting a limit does not limit user B (two tokens).
- `GET /api/bookings/status` polled 1/s for 30 s never returns 429.
- Run with the counter table renamed (simulated DB failure): requests still succeed and `rate_limit_failed` is logged. Rename it back.
- `stripe trigger`-style check: webhook with a bad signature still returns 400, not 429, at any rate.
- End to end in the simulator: sign in, search several times quickly until the limit shows the friendly message, wait a minute, search works again; then book a stay with `pm_card_visa` and see the confirmation (no limit in the normal flow).
- `grep` the table rows: keys are hashes, no raw user IDs or IPs.

## AGENTS.md updates
Add a **Rate limiting** entry under "Who owns what": Neon table `rate_limits`, fixed 60 s window in `src/lib/rate-limit.ts`, per-route limits in `LIMITS`, user ID key when signed in and hashed IP when not, fail open, webhook exempt, new routes must call `checkRateLimit` right after `getUserId`. Add to Rules: "Every new API route is rate limited (except the Stripe webhook)." Add `drizzle-kit generate` to Commands only if it isn't there.

## Result
Built as planned. `guard(request, name)` in `src/lib/rate-limit.ts` replaces `getUserId` at the top of every route except the Stripe webhook. Migration `0002_brief_calypso.sql` adds `rate_limits` and was applied to the database in `.env` only; production still needs `npx drizzle-kit migrate`. The app maps 429 in search, ask and bookings; the status poll retries through a 429. Verified with scripts against the dev database (limit, per-subject isolation, per-IP 401 then 429, hashed keys, fail open); not exercised through live HTTP with a Clerk token or in the simulator.
