import { useAuth } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Breakdown } from "@/lib/booking-rules";
import type { Range } from "@/lib/calendar";

// The app's side of the booking API (src/app/api/bookings). Prices, availability and the booking itself
// are decided by the server; nothing here creates a booking.

export type Quote = { stayId: string; nights: number; totalCents: number; breakdown: Breakdown };
export type Booking = {
  id: string;
  stayId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  amountCents: number;
  breakdown: Breakdown;
  stay: { title: string; city: string; state: string; imageUrl: string | null; cancellationPolicy: { title: string; body: string } | null };
};
export type Checkout = { holdId: string; clientSecret: string | null; paid: boolean; amountCents: number; expiresAt: string };
export type BookingRequest = { stayId: string; checkIn: string; checkOut: string; guests: number };

export class BookingError extends Error {
  constructor(
    readonly reason: string,
    readonly status = 0,
  ) {
    super(reason);
  }
}

export const reasonMessage: Record<string, string> = {
  unavailable: "Those dates were just taken. Pick different dates.",
  below_min_nights: "This stay has a minimum number of nights.",
  above_max_nights: "Stays can be up to 30 nights.",
  too_many_guests: "That's more guests than this stay allows.",
  past_date: "Check-in can't be in the past.",
  too_far_ahead: "Bookings open up to a year ahead.",
  invalid_dates: "Choose a check-in and a check-out date.",
  paused: "This stay isn't taking bookings right now.",
  stay_not_found: "This stay is no longer available.",
  network: "We couldn't reach Roam. Check your connection and try again.",
  server: "Something went wrong on our side. Try again in a moment.",
};
export const messageFor = (reason: string) => reasonMessage[reason] ?? reasonMessage.server;

async function call<T>(path: string, token: string | null, init?: { method?: string; body?: unknown; signal?: AbortSignal }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method ?? "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: init?.signal,
    });
  } catch {
    throw new BookingError("network");
  }
  if (!res.ok) {
    const { reason } = (await res.json().catch(() => ({}))) as { reason?: string };
    throw new BookingError(reason ?? "server", res.status);
  }
  return (await res.json()) as T;
}

export function useBookingApi() {
  const { getToken } = useAuth();
  return {
    checkout: async (body: BookingRequest) => call<Checkout>("/api/bookings/checkout", await getToken(), { method: "POST", body }),
  };
}

type Loadable<T> = { status: "loading" } | { status: "error"; reason: string } | { status: "ready"; data: T };

/** Date ranges that can't be booked, for the calendar. Reloads on demand (after an "unavailable" answer). */
export function useAvailability(stayId: string) {
  const { getToken } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<{ key: string; state: Loadable<Range[]> }>({ key: "", state: { status: "loading" } });
  const key = `${stayId}:${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const { ranges } = await call<{ ranges: Range[] }>(`/api/bookings/availability?stayId=${encodeURIComponent(stayId)}`, await getToken(), {
          signal: controller.signal,
        });
        setOutcome({ key, state: { status: "ready", data: ranges } });
      } catch (e) {
        if (!controller.signal.aborted) setOutcome({ key, state: { status: "error", reason: (e as BookingError).reason ?? "server" } });
      }
    })();
    return () => controller.abort();
  }, [stayId, key, getToken]);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const state: Loadable<Range[]> = outcome.key === key ? outcome.state : { status: "loading" };
  return { state, reload };
}

export type QuoteState = { status: "idle" } | { status: "loading" } | { status: "error"; reason: string } | { status: "ready"; quote: Quote };

/** The server's price for the chosen dates, refreshed when dates or guests change. */
export function useQuote(stayId: string, checkIn: string | null, checkOut: string | null, guests: number, refresh = 0): QuoteState {
  const { getToken } = useAuth();
  // Clerk can hand back a new getToken on re-render; keep it out of the deps so a re-render never aborts the request.
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const key = checkIn && checkOut ? `${stayId}|${checkIn}|${checkOut}|${guests}|${refresh}` : "";
  const [outcome, setOutcome] = useState<{ key: string; state: QuoteState }>({ key: "", state: { status: "idle" } });
  useEffect(() => {
    if (!key || !checkIn || !checkOut) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const quote = await call<Quote>("/api/bookings/quote", await getTokenRef.current(), {
          method: "POST",
          body: { stayId, checkIn, checkOut, guests },
          signal: controller.signal,
        });
        setOutcome({ key, state: { status: "ready", quote } });
      } catch (e) {
        if (!controller.signal.aborted) {
          console.warn("quote failed", e);
          setOutcome({ key, state: { status: "error", reason: (e as BookingError).reason ?? "server" } });
        }
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, stayId, checkIn, checkOut, guests]);
  if (!key) return { status: "idle" };
  return outcome.key === key ? outcome.state : { status: "loading" };
}

export type BookingStatus =
  | { status: "pending" }
  | { status: "confirmed"; booking: Booking }
  | { status: "expired" | "failed" | "refunded" | "unknown" }
  | { status: "error" };

/** Polls until the server says the booking exists. The server asks Stripe; this never creates anything. */
export function useBookingStatus(holdId: string, attempt = 0): BookingStatus {
  const { getToken } = useAuth();
  const key = `${holdId}:${attempt}`;
  const [outcome, setOutcome] = useState<{ key: string; state: BookingStatus }>({ key: "", state: { status: "pending" } });
  useEffect(() => {
    const controller = new AbortController();
    const startedAt = Date.now();
    const poll = async () => {
      try {
        const body = await call<BookingStatus>(`/api/bookings/status?holdId=${encodeURIComponent(holdId)}`, await getToken(), {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (body.status !== "pending") return setOutcome({ key, state: body });
        // Still pending after ~25 s: stop polling and let the screen say so.
        if (Date.now() - startedAt > 25_000) return setOutcome({ key, state: { status: "unknown" } });
        timer = setTimeout(poll, 1000);
      } catch {
        if (!controller.signal.aborted) setOutcome({ key, state: { status: "error" } });
      }
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [holdId, key, getToken]);
  return outcome.key === key ? outcome.state : { status: "pending" };
}

/** The guest's confirmed bookings, soonest first, for the Trips tab. */
export function useBookings() {
  const { getToken } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<{ key: number; state: Loadable<Booking[]> }>({ key: -1, state: { status: "loading" } });
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const { bookings } = await call<{ bookings: Booking[] }>("/api/bookings", await getToken(), { signal: controller.signal });
        setOutcome({ key: attempt, state: { status: "ready", data: bookings } });
      } catch (e) {
        if (!controller.signal.aborted) setOutcome({ key: attempt, state: { status: "error", reason: (e as BookingError).reason ?? "server" } });
      }
    })();
    return () => controller.abort();
  }, [attempt, getToken]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  // Tabs stay mounted, so a booking made elsewhere shows up when the screen comes back into focus.
  useFocusEffect(retry);
  return { state: outcome.key === attempt ? outcome.state : ({ status: "loading" } as Loadable<Booking[]>), retry };
}

const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents % 100 ? 2 : 0 });
export const formatUsd = usd;

const shortDay = (day: string, withYear = false) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" });
export const formatDay = (day: string) => shortDay(day, true);
/** "Dec 10 – 13, 2026" within a month, "Dec 30 – Jan 2, 2027" across months. */
export function formatStayDates(checkIn: string, checkOut: string) {
  const sameMonth = checkIn.slice(0, 7) === checkOut.slice(0, 7);
  const end = sameMonth ? String(Number(checkOut.slice(8))) : shortDay(checkOut);
  return `${shortDay(checkIn)} – ${end}, ${checkOut.slice(0, 4)}`;
}
