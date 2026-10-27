# 19 · Booking flow with Stripe test payments

Status: done

## Goal
A signed-in guest picks check-in and check-out dates on a stay, sees a price the server calculated, pays with Stripe (test mode), and only then gets a booking. The booking shows on a confirmation screen and in the Trips tab. Two guests can never hold or book overlapping dates for the same stay.

## Decisions
Answers from the question panel:
- **Private store: Neon Postgres** (`DATABASE_URL`), accessed with Drizzle ORM and the Neon serverless driver from API routes only.
- **Scope: dates, pay, confirmation screen, and a Trips list** of the guest's confirmed bookings. No cancellation or refunds from the app.
- **Hold time: 15 minutes** (`BOOKING_HOLD_MINUTES`, default 15, so tests can lower it).

Defaults picked (change any of these before approving):
- **Test mode only.** Stripe test keys. The server refuses to create payments when `STRIPE_SECRET_KEY` doesn't start with `sk_test_` unless `BOOKINGS_LIVE=1`. Going live is a separate, later change.
- **Stripe PaymentSheet** (`@stripe/stripe-react-native`) with a **PaymentIntent**, card payments, USD, integer cents. Stripe currently recommends Checkout Sessions for web; for a native app, the PaymentSheet + PaymentIntent flow is the documented mobile path. Apple Pay and Google Pay are out (need an Apple merchant ID and a dev build).
- **No saved cards.** A Stripe Customer is created per Clerk user (for receipts and to link payments to a user) but no `CustomerSession`.
- **Pricing:** `nights × nightlyPrice + cleaningFee`, no taxes or service fee yet. Read from Sanity by the server on every quote and checkout, using the live API (not the CDN) so a cached price can never be charged. The price breakdown is snapshotted onto the booking.
- **Dates** are calendar dates (`YYYY-MM-DD`, check-out day is free), not timestamps. Stays have no timezone field, so "today" is UTC minus one day of tolerance. Limits: `minNights` from the stay, max 30 nights, max 365 days ahead, guests 1..`maxGuests`.
- **Pets** are not part of the booking (no pet count).
- Sanity stays the source of truth for stay content. The database only stores the guest's private records and a snapshot of what was bought.

## Out of scope
Cancellation and refunds by the guest, taxes and fees, host payouts (Stripe Connect), host calendars and blocked dates entered by hosts, confirmation emails, Apple Pay and Google Pay, saved cards, live-mode keys, rate limiting, and a scheduled cleanup job. Refunds happen in one case only: a payment succeeds for dates that are no longer available (see Step 4).

## Architecture

### Why Postgres
Sanity's dataset is public and can't say "reject this if it overlaps". Clerk metadata is 8 KB and per user. A booking system needs one atomic rule: no two active reservations overlap for a stay. Postgres enforces it in the database with an exclusion constraint on a date range, so a race between two guests fails for one of them even if the app code is wrong.

### Data (Neon Postgres, `src/lib/db/schema.ts`)
- `customers`: `clerk_user_id` (PK), `stripe_customer_id` (unique).
- `booking_holds`: `id` (uuid), `clerk_user_id`, `stay_id`, `check_in` date, `check_out` date, `guests`, `amount_cents`, `currency`, `breakdown` (jsonb: nights, nightly, cleaning), `stay_snapshot` (jsonb: title, city, state, cover image URL, cancellation policy title and body), `payment_intent_id` (unique, nullable), `status` (`open | converted | expired | refunded`), `expires_at`, `created_at`. Constraint: `EXCLUDE USING gist (stay_id WITH =, daterange(check_in, check_out) WITH &&) WHERE (status = 'open')` (needs the `btree_gist` extension).
- `bookings`: same fields plus `hold_id`, `payment_intent_id` (unique, not null), `status` (`confirmed`), `created_at`. Constraint: same exclusion `WHERE (status = 'confirmed')`. **A row exists here only after Stripe confirmed the payment.**
- `stripe_events`: `event_id` (PK), `type`, `processed_at`. Makes webhook retries and duplicates harmless.

A hold is the "pending" state. It is not a booking: it reserves dates while the guest pays, and it expires. Keeping it in its own table is what makes "a booking is only created after confirmed payment" literally true.

### Request flow
1. **Calendar:** `GET /api/bookings/availability?stayId=` returns blocked date ranges (confirmed bookings and unexpired holds, future only, no user data). The picker greys them out. This is a convenience; the server checks again at checkout.
2. **Quote:** `POST /api/bookings/quote {stayId, checkIn, checkOut, guests}`. Server loads the stay from Sanity, validates dates, guests and min nights, checks availability, and returns the price breakdown in cents. Nothing is stored.
3. **Checkout:** `POST /api/bookings/checkout` (same body). In one transaction under `pg_advisory_xact_lock(hashtext(stay_id))`: mark expired holds `expired`, re-validate, re-check bookings and open holds, insert the hold. Then create or reuse the Stripe Customer, create the PaymentIntent (`amount` from the server, `automatic_payment_methods`, `metadata: {hold_id, clerk_user_id, stay_id}`, idempotency key = hold id), save its id on the hold. Returns `{holdId, clientSecret, customerId, amount, expiresAt}`. Same user, same stay and same dates reuses the open hold; same user with different dates releases the earlier hold and cancels its PaymentIntent. Overlap with someone else returns `409`.
4. **Pay:** the app calls `initPaymentSheet` and `presentPaymentSheet`. Cancelling the sheet keeps the hold until it expires.
5. **Confirm (the only place a booking is created):** `POST /api/stripe/webhook` verifies the `Stripe-Signature` on the raw body, ignores event IDs already in `stripe_events`, and on `payment_intent.succeeded` calls `finalizePayment(paymentIntentId)`. `finalizePayment` retrieves the PaymentIntent from Stripe, requires `status = succeeded` and `amount_received` and currency equal to the hold's, then in one transaction inserts the booking and marks the hold `converted`. It is idempotent on `payment_intent_id`. If the hold had expired, it re-takes the dates when they're still free; if they're taken, it issues a Stripe refund and marks the hold `refunded`.
6. **Result on the device:** after the sheet closes with success, the app polls `GET /api/bookings/status?holdId=` (every second, up to about 20 s) and shows "Confirming your booking…". The status route returns `confirmed` plus the booking, `pending`, `expired`, or `failed`. It also calls `finalizePayment` when the hold is open and Stripe already says `succeeded`, so a delayed webhook (or none, in local dev) can't strand a paid guest. The client never creates a booking and never trusts its own sheet result.
7. **Trips:** `GET /api/bookings` returns the signed-in user's confirmed bookings, upcoming first.

The webhook subscribes to `payment_intent.succeeded`, `payment_intent.payment_failed` and `payment_intent.canceled` only.

### Security
- Every `/api/bookings/*` route verifies the Clerk session and uses the verified user id, never one from the body. The webhook is the one route with no Clerk session: it is authenticated by the Stripe signature, and AGENTS.md changes to say so.
- The client sends dates, guests and stay id, nothing else. Amounts, currency and fees come from the server only.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `DATABASE_URL` are server-only. The publishable key is `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- Bookings are read only for the verified user id. Availability returns no user data.

### Expo and Stripe requirements (checked against current docs)
- Expo SDK 58 (`expo ~58.0.19`). `npx expo install @stripe/stripe-react-native` picks the SDK-compatible version. The library is bundled in Expo Go, so card payments can be tested there; Apple Pay and Google Pay can't. `merchantIdentifier` and `enableGooglePay` are config plugin options and only matter once wallets are added.
- `StripeProvider` takes `publishableKey` and `urlScheme` (`roam`, already in `app.json`). Pass `returnURL` to `initPaymentSheet` and forward incoming deep links to `handleURLCallback`; without it, 3-D Secure and bank redirects can't return to the app (the app uses Expo Router, so the forwarding must not swallow normal app links).
- API routes (`src/app/api/*+api.ts`) run in a WinterCG-style runtime on EAS Hosting, bundled to one CommonJS file, no dynamic imports, no native binaries, env vars from the host (`expo-server` doesn't read `.env`), secrets in `+api.ts` files are kept out of the client bundle. So: use `stripe` with `Stripe.createFetchHttpClient()` and `constructEventAsync` (Web Crypto), and an HTTP/WebSocket Postgres driver (`@neondatabase/serverless`), not a TCP driver. Step 1 proves this before anything depends on it.
- The Expo docs don't cover webhooks or raw request bodies. Signature verification needs the exact raw body, so Step 1 confirms `await request.text()` returns it untouched; if not, fall back to verifying the HMAC with Web Crypto by hand.
- Native builds reach API routes through the `origin` option of the `expo-router` plugin (needed once the app isn't served by the dev server).
- Stripe requires a publicly reachable HTTPS webhook URL in production. In development, `stripe listen --forward-to localhost:<port>/api/stripe/webhook` prints a `whsec_` secret for `.env`.
- Stripe test cards: `4242 4242 4242 4242` succeeds, `4000 0025 0000 3155` asks for 3-D Secure, `4000 0000 0000 9995` is declined. Any future expiry, any CVC and postal code.

### New files
- Server: `src/lib/db/index.ts`, `src/lib/db/schema.ts`, `drizzle/` migrations, `src/lib/api-auth.ts` (returns the verified user id; `ask+api.ts` and `search+api.ts` move to it), `src/lib/stripe-server.ts`, `src/lib/booking-server.ts` (validate, quote, hold, finalize), `src/app/api/bookings/{availability,quote,checkout,status}+api.ts`, `src/app/api/bookings+api.ts`, `src/app/api/stripe/webhook+api.ts`.
- Shared: `src/lib/booking-rules.ts` (date parsing, night count, limits, price in cents; pure, used by server and for the on-screen estimate).
- App: `src/lib/bookings.ts` (fetch hooks), `src/app/stay/[id]/book.tsx` (modal, not a form sheet: dates, guests, breakdown, Pay), `src/app/booking/[id].tsx` (confirmation), Trips tab list, components `DateRangeCalendar`, `PriceBreakdown`, `BookingCard`, each added to `/design-system`.

## Steps
### 1. Foundations and runtime spike
After approval of the new dependencies, `npx expo install @stripe/stripe-react-native`, then add `stripe`, `@neondatabase/serverless`, `drizzle-orm` and `drizzle-kit` (dev) with `npm install`, pinned exact. Create a Neon project, enable `btree_gist`, add `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` to `.env` and names to `.env.example`. Write the schema and exclusion constraints and generate and apply the migration. Add `src/lib/api-auth.ts` and move the two existing routes onto it. Add `stripe-server.ts` with the test-mode guard. Prove the runtime: a throwaway route that reads the raw body, verifies a signature from `stripe listen`, creates a PaymentIntent and runs one query, then `npx expo export --platform web` and `npx expo serve` confirm it bundles and runs. Remove the throwaway route. Done: lint and type check pass, search and ask still work, and the spike result is written under Notes.

### 2. Rules, availability and quote
Write `booking-rules.ts` and `booking-server.ts` (Sanity live read of one stay by id with a GROQ param, validation, availability across bookings and open holds, price in cents). Add the `availability` and `quote` routes. Done: valid input returns a breakdown that equals `nights × nightlyPrice + cleaningFee`; each rule violation (past date, short stay, too many guests, overlap, unknown stay, bad format) returns a `400` or `409` with a stable `reason`.

### 3. Hold and PaymentIntent
Add `checkout`. Transaction with the per-stay advisory lock, expired-hold sweep, re-validation, hold insert, Stripe Customer get-or-create, PaymentIntent with idempotency key, reuse and release rules from Architecture. Done: two parallel requests for overlapping dates yield one `200` and one `409`; the PaymentIntent amount equals the server quote; a repeat request returns the same hold.

### 4. Webhook, finalize and status
Add `/api/stripe/webhook`, `finalizePayment`, and `status`. Handle the three events, duplicate events, a succeeded payment on an expired hold (re-take or refund), and amount mismatch (log and do not book). Done: `stripe trigger` and a real test-card payment create exactly one booking; replaying the event creates none; a forged signature returns `400`.

### 5. Booking sheet in the app
Add `StripeProvider` in `src/app/_layout.tsx` and deep-link forwarding. Build `DateRangeCalendar` (token classes, `PressableScale`, blocked dates from `availability`, min nights hint) and `PriceBreakdown`, then `stay/[id]/book.tsx` as a modal with a guest stepper, live quote, hold countdown and a Pay button. "Book this stay" opens the sheet and the "coming soon" alert goes. Loading, error, empty and expired states are all handled. Done: a test card payment completes the sheet and reaches "Confirming…".

### 6. Confirmation and Trips
Add `booking/[id].tsx` (polling `status`, then the confirmed booking: stay, dates, guests, total, cancellation policy text) and the Trips list from `GET /api/bookings` with empty, loading and error states. Profile's Trips stat uses the count. Done: after payment the guest lands on the confirmation and the booking appears in Trips; the dates are blocked for the next guest.

### 7. Analytics, design system, docs
Add the PostHog events below, add the new components to `/design-system`, update this plan's Result and AGENTS.md. Done: lint, type check, and the full Verification pass.

Events (never dates, names, emails, card data or the PaymentIntent secret): `booking_checkout_started` (`stay_id`, `nights`, `guests`), `booking_payment_result` (`outcome: paid | canceled | failed`, `reason` on failure), `booking_confirmed` (`stay_id`, `nights`, `amount_cents`), `booking_unavailable` (`stay_id`, `reason`), `trips_opened` (`count`).

## Verification
- `npx expo lint` and `npx tsc --noEmit` pass; `npx expo export --platform web` bundles the API routes.
- Quote: price equals the formula for 1, minNights and 30 nights; each invalid input returns its reason.
- Race: fire two checkouts for the same stay and dates in parallel; exactly one succeeds. Overlap on one night, and back-to-back stays (check-out day equals next check-in), behave correctly.
- Pay with `4242…`: one booking, confirmation screen, appears in Trips, dates blocked in the calendar for another account.
- Pay with `4000 0025 0000 3155`: 3-D Secure completes and returns to the app. Pay with `4000 0000 0000 9995`: error shown, no booking, hold still open, retry works.
- Close the sheet and leave: no booking; after `BOOKING_HOLD_MINUTES` the dates are free again.
- Webhook: `stripe events resend` creates no second booking; a bad signature returns `400`; with the listener stopped, `status` still confirms a paid hold.
- Expired hold, payment succeeds, dates free: booked. Same but dates taken: refunded, no booking.
- Tampering: send a body with an `amount`, another user's id, or a past date; the server ignores or rejects it. A request without a Clerk token returns `401` on every `/api/bookings` route.
- Secrets: grep the export for `sk_test_`, `whsec_` and `DATABASE_URL` values; none appear.
- Screenshots of the booking sheet, confirmation and Trips in the iOS simulator, in light and dark mode.

## AGENTS.md updates
- **Who owns what:** add **Bookings** (Neon Postgres `DATABASE_URL` via Drizzle, tables, holds versus bookings, exclusion constraints, Stripe PaymentIntent + PaymentSheet in test mode, webhook is the only thing that creates a booking, status route may call `finalizePayment`, server prices from the live Sanity API) and **Payments** (Stripe keys, test-mode guard, webhook secret, events handled).
- **Rules:** secret keys list gains `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DATABASE_URL`; "API routes verify the Clerk session" gains "except the Stripe webhook, which verifies the Stripe signature"; "Book this stay only shows 'Booking is coming soon.'" and the estimate sentence are replaced by the booking flow.
- **Analytics:** the new booking events.
- **Design system:** new components and routes (`stay/[id]/book`, `booking/[id]`).


## Result
Steps 1-7 are built. Server side is verified against Neon and Stripe test mode: quote rules, the overlap race, hold reuse and release, webhook signature and duplicate handling, booking through the webhook and through `status` with the listener off, refund when an expired hold's dates were taken, booking an expired hold whose dates were free, and a declined card leaving the hold open. The app side builds, type checks and lints, the booking sheet and the design-system section render in the iOS simulator, and `npx expo export --platform web` bundles all eight API routes with no secret values in the output.

Verified on device by the user: paying through PaymentSheet with a test card, the confirmation screen, the Trips list and Profile count, and the 3-D Secure return (via `src/app/stripe-redirect.tsx`). Fixed along the way: the quote placeholder never resolved because `useQuote` re-ran on every new Clerk `getToken`; it now keeps `getToken` in a ref.

Booked dates also grey out for a second account.

Not verified: dark mode screenshots, Android and web, and a deployed (EAS Hosting) webhook.

Spike findings: Stripe's fetch HTTP client plus `constructEventAsync` and Neon's pooled WebSocket driver both run in Expo API routes, and `await request.text()` returns the untouched raw body for signature checks. `@stripe/stripe-react-native` needs a `.web.tsx` stub or the web export fails.
