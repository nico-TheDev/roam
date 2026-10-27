// Pure booking rules, shared by the server (authoritative) and the app (on-screen estimate).
// Dates are calendar dates ("YYYY-MM-DD"); the check-out day is free for the next guest.

export const MAX_NIGHTS = 30;
export const MAX_DAYS_AHEAD = 365;
const DAY_MS = 86_400_000;

export type BookingReason =
  | "invalid_request"
  | "invalid_dates"
  | "past_date"
  | "too_far_ahead"
  | "below_min_nights"
  | "above_max_nights"
  | "invalid_guests"
  | "too_many_guests"
  | "stay_not_found"
  | "unavailable"
  | "paused";

export type BookingInput = { stayId: string; checkIn: string; checkOut: string; guests: number };
export type StayTerms = { nightlyPrice: number; cleaningFee: number; minNights: number; maxGuests: number };
export type Breakdown = { nights: number; nightlyCents: number; cleaningCents: number };

/** Midnight UTC of a real calendar date, or null for anything else ("2026-02-30", "tomorrow"). */
export function parseDay(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== value ? null : ms;
}

export const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export type BookingPhase = "upcoming" | "staying" | "leaving";

/** Where a booking is today (UTC): not started, in progress, or checking out today. */
export function bookingPhase(checkIn: string, checkOut: string, now = Date.now()): BookingPhase {
  const today = toDay(now);
  if (checkIn > today) return "upcoming";
  return checkOut === today ? "leaving" : "staying";
}

/** Stays have no timezone, so today is UTC with one day of tolerance for guests west of it. */
export const earliestCheckIn = (now = Date.now()) => parseDay(toDay(now))! - DAY_MS;

export function validateStay(
  input: Pick<BookingInput, "checkIn" | "checkOut" | "guests">,
  stay: Pick<StayTerms, "minNights" | "maxGuests">,
  now = Date.now(),
): { ok: true; nights: number } | { ok: false; reason: BookingReason } {
  const start = parseDay(input.checkIn);
  const end = parseDay(input.checkOut);
  if (start === null || end === null || end <= start) return { ok: false, reason: "invalid_dates" };
  if (start < earliestCheckIn(now)) return { ok: false, reason: "past_date" };
  if (start > earliestCheckIn(now) + (MAX_DAYS_AHEAD + 1) * DAY_MS) return { ok: false, reason: "too_far_ahead" };
  const nights = Math.round((end - start) / DAY_MS);
  if (nights < stay.minNights) return { ok: false, reason: "below_min_nights" };
  if (nights > MAX_NIGHTS) return { ok: false, reason: "above_max_nights" };
  if (!Number.isInteger(input.guests) || input.guests < 1) return { ok: false, reason: "invalid_guests" };
  if (input.guests > stay.maxGuests) return { ok: false, reason: "too_many_guests" };
  return { ok: true, nights };
}

/** nights x nightly price + cleaning fee, in integer cents. No taxes or service fee yet. */
export function priceStay(stay: Pick<StayTerms, "nightlyPrice" | "cleaningFee">, nights: number) {
  const breakdown: Breakdown = {
    nights,
    nightlyCents: Math.round(stay.nightlyPrice * 100),
    cleaningCents: Math.round(stay.cleaningFee * 100),
  };
  return { breakdown, totalCents: breakdown.nightlyCents * nights + breakdown.cleaningCents };
}
