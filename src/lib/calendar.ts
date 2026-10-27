import { MAX_NIGHTS, parseDay, toDay } from "@/lib/booking-rules";

// Date math for the booking calendar. Everything is a "YYYY-MM-DD" string; the check-out day is free.

export type Range = { checkIn: string; checkOut: string };

const DAY_MS = 86_400_000;
const addDays = (day: string, n: number) => toDay(parseDay(day)! + n * DAY_MS);

/** The guest's local calendar date, not UTC. */
export function localToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** A night is taken when it falls inside a booked range; check-out day itself is free. */
export const isNightTaken = (day: string, ranges: Range[]) => ranges.some((r) => day >= r.checkIn && day < r.checkOut);

/** Every night of [checkIn, checkOut) is free. */
export function isRangeFree(checkIn: string, checkOut: string, ranges: Range[]) {
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) if (isNightTaken(d, ranges)) return false;
  return true;
}

export const nightsBetween = (checkIn: string, checkOut: string) =>
  Math.round((parseDay(checkOut)! - parseDay(checkIn)!) / DAY_MS);

/**
 * What a tap on `day` does. With no start (or a finished range) a tap starts a new stay on a free night.
 * With a start, a later day ends the stay if every night in between is free and the stay isn't too long;
 * otherwise a free night restarts the selection. Anything else is ignored.
 */
export function pickDay(
  day: string,
  current: { checkIn: string | null; checkOut: string | null },
  ranges: Range[],
  today: string,
): { checkIn: string | null; checkOut: string | null } | null {
  if (day < today) return null;
  const { checkIn, checkOut } = current;
  if (checkIn && !checkOut && day > checkIn) {
    if (isRangeFree(checkIn, day, ranges) && nightsBetween(checkIn, day) <= MAX_NIGHTS) return { checkIn, checkOut: day };
  }
  return isNightTaken(day, ranges) ? null : { checkIn: day, checkOut: null };
}

/** Whole weeks covering the month; days outside it are null. Weeks start on Sunday. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = Date.UTC(year, month, 1);
  const lead = new Date(first).getUTCDay();
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((lead + length) / 7) * 7 }, (_, i) => {
    const n = i - lead + 1;
    return n >= 1 && n <= length ? toDay(Date.UTC(year, month, n)) : null;
  });
}

export const monthLabel = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
