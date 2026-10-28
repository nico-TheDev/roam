# 27 · Demo label and privacy page

Status: done

## Goal
A reviewer opening the app sees plainly that Roam is a demo ("Stripe test mode, sample listings.") and can read a short privacy summary, so test-only payments and placeholder photos don't look unfinished.

## Decisions
- App only. No landing page changes (asked; landing already says its stays and photos are demo content).
- One wording lives in `src/lib/demo.ts` (`DEMO_NOTICE`, `DEMO_DETAIL`) and the privacy text in `PRIVACY_SECTIONS`, so every screen says the same thing.
- Demo label appears in three places: onboarding (micro line under the buttons), Profile (a notice card above the cancellation card), and the booking sheet (existing test-card hint now starts "Demo: Stripe test mode, no real charge.").
- Privacy is a form sheet `account/privacy` opened from a Profile > Preferences "Privacy" row, same pattern as `account/settings`. It is signed-in only because the route sits in the signed-in guard.
- Privacy copy states only what AGENTS.md records: Clerk holds name/email/photo/saved stays; search sentences and policy questions go to our server and DeepSeek, are not saved or sent to analytics; bookings (dates, guests, amount) in Neon, card data only with Stripe; PostHog events without text, names, emails, dates or card data; host name/bio/stays public; Delete account removes the sign-in account. It makes no claim about deleting booking records because that isn't implemented.
- No contact line (asked). One analytics event, `privacy_opened`, no properties.
- No new shared component; uses `Alert`, `Text`, `Icon`.

## Out of scope
- A public web privacy URL (stores usually need one), a contact address, a terms page, deleting booking rows on account deletion.
- A "Demo" badge on every screen.

## Steps
### 1. Shared copy and privacy sheet
Add `src/lib/demo.ts` and `src/app/account/privacy.tsx`; register `account/privacy` as a form sheet in `src/app/_layout.tsx`. Done: the sheet renders the demo detail and six sections.

### 2. Demo label placements
Add the Privacy row and demo notice to `src/app/(tabs)/profile.tsx`, the micro line to `src/app/index.tsx`, and the new wording to `src/app/stay/[id]/book.tsx`. Done: all three show the text.

## Verification
- `npx tsc --noEmit` (app files only; the repo-wide run also scans `agent/skills/**` reference code, which has unrelated missing-module errors) and `npx expo lint` pass.
- iOS simulator screenshots of onboarding, Profile, the Privacy sheet in light and dark, and the booking sheet; check nothing clips or overlaps at the onboarding sheet's fixed heights.
- End to end: sign in, Profile > Privacy opens the sheet and closes by swipe; Profile shows the demo notice.

## AGENTS.md updates
Add to Design system routes: `account/privacy` form sheet and `src/lib/demo.ts` as the single source of demo/privacy wording. Add `privacy_opened` to Analytics.

## Result
Built as planned. Type check and lint pass; onboarding verified in the simulator. Profile, Privacy sheet and booking sheet were not screenshotted (need a signed-in session).
