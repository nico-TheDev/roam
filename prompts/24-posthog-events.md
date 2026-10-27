# 24 · PostHog events for host, account, booking and stay management

Status: done

## Goal
Fill the analytics gaps in four areas so drop-off and failures are visible: host side, account screen, booking flow and stay management. Today those areas only report successes.

## Decisions
- Scope: gaps only. Screen opens, failures, abandoned steps and unconfirmed-booking outcomes. About 30 events.
- Existing events change additively only: new properties (`reason`, `stay_id`) may be added, nothing is renamed or removed.
- `booking_quote_viewed` fires once per booking sheet visit (first quote that loads). Later date or guest changes send nothing. Quote failures send `booking_quote_failed` each time.
- Same privacy rule as today: never text the guest typed, names, emails, images, dates, tokens or card data. Amounts only as `total_cents` on a quote, as `booking_confirmed` already does.
- Capture calls use `posthog?.capture` so a missing client never blocks the app. Failures are captured where the failure is caught (hooks in `src/lib/`), opens are captured in a mount `useEffect`.
- Server routes send nothing; this plan is app side only.

## Out of scope
- Funnel progress inside Add a stay (per section or per field).
- Server-side events and the webhook.
- Dashboards, insights and alerts in PostHog.
- Any change to existing event names.

## Steps
### 1. Host side
Files: `src/lib/host.ts`, `src/app/host/start.tsx`, `src/app/host/index.tsx`, `src/app/host/add.tsx`.
- `host_intro_viewed` on mounting `start.tsx`.
- `host_start_failed` (`reason`) when `becomeHost` fails.
- `host_dashboard_opened` (`stay_count`, `listed_count`) once, when the host list is ready.
- `host_add_stay_tapped` (`source: header | empty`).
- `host_add_stay_opened` on mounting `add.tsx`.
- `host_stay_publish_blocked` (`reason: invalid | photos_failed`, `fields` only when invalid).
- `host_add_stay_discarded` (`photo_count`) when the discard alert is confirmed.
- `host_photo_upload_failed` (`reason`) in `uploadPhoto`.
Done when: each fires once in the flow above and `npx tsc --noEmit` and `npx expo lint` pass.

### 2. Stay management
Files: `src/lib/host.ts`, `src/app/host/stay/[id].tsx`.
- `host_stay_manager_opened` (`stay_id`, `listed`) once per visit.
- `host_stay_viewed_as_guest` (`stay_id`).
- `host_stay_section_opened` and `host_stay_section_cancelled` (`stay_id`, `section`).
- `host_stay_save_blocked` (`stay_id`, `section`, `reason: invalid | photos_failed`).
- `host_stay_listed_toggle_failed` (`stay_id`, `listed`, `reason`).
- Add `reason` to a failed `host_stay_edited`.
Done when: opening, editing, cancelling and a failed save each send the matching event.

### 3. Account screen
Files: `src/lib/account.ts`, `src/app/account/settings.tsx`, `src/app/account/personal.tsx`.
- `account_settings_opened`, `personal_info_opened` on mount.
- `profile_update_failed` (`field: name | photo | photo_remove`), `profile_update_blocked` (`field: name`, validation).
- `devices_sign_out_failed`, `user_sign_out_failed`.
- `account_delete_started`, `account_delete_cancelled`, `account_delete_reverification_requested` (`has_password`).
Done when: the delete flow shows started then cancelled or reverification in PostHog.

### 4. Booking flow
Files: `src/app/stay/[id]/book.tsx`, `src/app/booking/[id].tsx`, `src/app/(tabs)/trips.tsx`.
- `booking_quote_viewed` (`stay_id`, `nights`, `guests`, `total_cents`) once per sheet visit (a ref guards it).
- `booking_quote_failed` (`stay_id`, `reason`).
- `booking_checkout_failed` (`stay_id`, `reason`) for every checkout error except `unavailable`, which keeps `booking_unavailable`.
- Add `stay_id` to `booking_payment_result`.
- `booking_not_confirmed` (`outcome: refunded | expired | failed | unknown | error`) once per distinct outcome.
- `trip_opened` (`stay_id`) when a booking card is tapped.
Done when: a declined card sends `booking_payment_result` with `stay_id`, and an expired hold sends `booking_not_confirmed`.

### 5. Close out
Update `AGENTS.md` (Analytics bullet), set this plan to `Status: done` and add a `## Result`.

## Verification
- `npx tsc --noEmit` shows no errors in `src/`; `npx expo lint` is clean.
- Run the app with `POSTHOG_PROJECT_TOKEN` set, walk each flow above, and check PostHog Live events for every event and its properties.
- Failure cases: a failing photo upload, a declined card (`4000 0000 0000 0002`), delete account cancelled.
- Check that no event contains text the guest typed, names, dates or card data.
- End to end: sign in, become a host, add a stay, edit and pause it, book it from a second account, and confirm the full event trail.

## AGENTS.md updates
Analytics bullet: list the new events and their properties, and note that `booking_payment_result` now carries `stay_id`. No rules replaced.

## Result
Built as planned in steps 1 to 4. `tsc` (no errors in `src/`) and `expo lint` pass. Events were not yet checked in PostHog Live events on a device.
