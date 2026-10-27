import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useRef, useState } from "react";
import { type StayField, type StayInput, stayErrors } from "@/lib/host-stay-rules";
import { posthog } from "@/lib/posthog";

// The app's side of the host API (src/app/api/host). Ownership and every limit are decided by the server;
// the checks here only give quicker feedback. Hosting is a feature of a normal account: nothing here changes sign-in.

export type HostStay = {
  id: string;
  title: string;
  category: string;
  rating: number;
  reviewCount: number;
  nightlyPrice: number;
  cleaningFee: number;
  city: string;
  state: string;
  imageUrl: string | null;
  listed: boolean;
};
type HostData = { isHost: boolean; stays: HostStay[] };

const MESSAGES: Record<string, string> = {
  network: "We couldn't reach Roam. Check your connection and try again.",
  unauthorized: "Your session ended. Sign in again to continue.",
  not_found: "This stay isn't one you host.",
  invalid: "Those values aren't allowed. Check them and try again.",
  server: "Something went wrong on our side. Try again in a moment.",
  paused: "This stay is paused.",
  incomplete: "Some details on this stay need attention before it can be saved.",
  copy_failed: "We couldn't write a listing from these notes. Make the notes more specific and try again.",
  too_many: "You've reached the limit of 10 stays.",
  too_large: "That photo is too large. Pick a smaller one.",
  unsupported: "Only JPEG, PNG and WebP photos work.",
};
export const hostMessage = (reason: string) => MESSAGES[reason] ?? MESSAGES.server;

class HostError extends Error {
  constructor(
    readonly reason: string,
    /** Stay fields the server says need attention (reason `incomplete`). */
    readonly fields: string[] = [],
  ) {
    super(reason);
  }
}

async function call<T>(
  path: string,
  token: string | null,
  init?: { method?: string; body?: unknown; signal?: AbortSignal; raw?: { blob: Blob; type: string } },
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method ?? "GET",
      headers: { "Content-Type": init?.raw?.type ?? "application/json", Authorization: `Bearer ${token ?? ""}` },
      body: init?.raw ? init.raw.blob : init?.body ? JSON.stringify(init.body) : undefined,
      signal: init?.signal,
    });
  } catch {
    throw new HostError("network");
  }
  if (res.status === 401) throw new HostError("unauthorized");
  if (res.status === 404) throw new HostError("not_found");
  if (res.status === 400) {
    const data = (await res.json().catch(() => null)) as { error?: string; fields?: string[] } | null;
    throw data?.error === "incomplete" ? new HostError("incomplete", data.fields ?? []) : new HostError("invalid");
  }
  if (res.status === 409) throw new HostError("too_many");
  if (res.status === 413) throw new HostError("too_large");
  if (res.status === 415) throw new HostError("unsupported");
  if (res.status === 422) throw new HostError("copy_failed");
  if (!res.ok) throw new HostError("server");
  try {
    return (await res.json()) as T;
  } catch {
    throw new HostError("server");
  }
}

// Screens that show host data (Profile, the dashboard, the sheets) share one reload signal, so a change made in a
// sheet shows up underneath without relying on focus events.
const listeners = new Set<() => void>();
const invalidate = () => listeners.forEach((l) => l());
// Pause switches show at once; the override is dropped when fresh data arrives or the write fails.
const listedOverrides = new Map<string, boolean>();
const repaintListeners = new Set<() => void>();
const repaint = () => repaintListeners.forEach((l) => l());

/** Reloads everything shown from the host API (stays and bookings). */
export const refreshHost = invalidate;

export type HostState =
  | { status: "loading" }
  | { status: "error"; reason: string; retry: () => void }
  | { status: "ready"; isHost: boolean; stays: HostStay[] };

/** Whether the signed-in user hosts, and the stays they own. A reload keeps showing the last good data. */
export function useHost(): HostState {
  const { getToken } = useAuth();
  const [version, setVersion] = useState(0);
  const [, setPaint] = useState(0);
  const [result, setResult] = useState<{ data?: HostData; error?: string }>({});

  useEffect(() => {
    const listener = () => setVersion((v) => v + 1);
    const painter = () => setPaint((v) => v + 1);
    listeners.add(listener);
    repaintListeners.add(painter);
    return () => {
      listeners.delete(listener);
      repaintListeners.delete(painter);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await call<HostData>("/api/host/stays", await getToken(), { signal: controller.signal });
        if (!controller.signal.aborted) {
          listedOverrides.clear();
          setResult({ data });
        }
      } catch (e) {
        if (!controller.signal.aborted) setResult((prev) => ({ data: prev.data, error: (e as HostError).reason ?? "server" }));
      }
    })();
    return () => controller.abort();
  }, [version, getToken]);

  const retry = useCallback(() => {
    setResult((prev) => ({ data: prev.data }));
    setVersion((v) => v + 1);
  }, []);

  if (result.data) {
    const stays = result.data.stays.map((s) => (listedOverrides.has(s.id) ? { ...s, listed: listedOverrides.get(s.id)! } : s));
    return { status: "ready", isHost: result.data.isHost, stays };
  }
  if (result.error) return { status: "error", reason: result.error, retry };
  return { status: "loading" };
}

export type HostResult = { ok: true } | { ok: false; error: string };

export function useHostActions() {
  const { getToken } = useAuth();

  const becomeHost = useCallback(async (): Promise<HostResult> => {
    try {
      await call<{ hostId: string }>("/api/host/join", await getToken(), { method: "POST", body: {} });
      posthog?.capture("host_started");
      invalidate();
      return { ok: true };
    } catch (e) {
      posthog?.capture("host_start_failed", { reason: (e as HostError).reason ?? "server" });
      return { ok: false, error: hostMessage((e as HostError).reason) };
    }
  }, [getToken]);

  /** Saves a subset of a stay's fields. The server rewrites the listing text when a fact behind it changes. */
  const updateStay = useCallback(
    async (stayId: string, changes: Partial<StayInput>): Promise<HostResult & { regenerated?: boolean; fields?: string[] }> => {
      const fields = Object.keys(changes);
      try {
        const out = await call<{ regenerated: boolean }>(`/api/host/stays/${encodeURIComponent(stayId)}`, await getToken(), { method: "PATCH", body: changes });
        posthog?.capture("host_stay_edited", { stay_id: stayId, fields, regenerated: out.regenerated, outcome: "saved" });
        invalidate();
        staySaved(stayId);
        return { ok: true, regenerated: out.regenerated };
      } catch (e) {
        const err = e as HostError;
        posthog?.capture("host_stay_edited", { stay_id: stayId, fields, regenerated: false, outcome: "failed", reason: err.reason ?? "server" });
        return { ok: false, error: hostMessage(err.reason), fields: err.fields };
      }
    },
    [getToken],
  );

  /** Pauses or resumes a stay. Shows the new state at once and puts it back if the server says no. */
  const setListed = useCallback(
    async (stayId: string, listed: boolean): Promise<HostResult> => {
      listedOverrides.set(stayId, listed);
      repaint();
      try {
        await call(`/api/host/stays/${encodeURIComponent(stayId)}`, await getToken(), { method: "PATCH", body: { listed } });
        posthog?.capture("host_stay_listed_toggled", { stay_id: stayId, listed });
        invalidate();
        staySaved(stayId);
        return { ok: true };
      } catch (e) {
        listedOverrides.delete(stayId);
        repaint();
        posthog?.capture("host_stay_listed_toggle_failed", { stay_id: stayId, listed, reason: (e as HostError).reason ?? "server" });
        return { ok: false, error: hostMessage((e as HostError).reason) };
      }
    },
    [getToken],
  );

  /** Uploads one picked photo and returns its Sanity asset id. */
  const uploadPhoto = useCallback(
    async (uri: string, mimeType: string): Promise<{ ok: true; assetId: string } | { ok: false; error: string }> => {
      try {
        const blob = await (await fetch(uri)).blob();
        const { assetId } = await call<{ assetId: string }>("/api/host/photos", await getToken(), { method: "POST", raw: { blob, type: mimeType } });
        return { ok: true, assetId };
      } catch (e) {
        const reason = e instanceof HostError ? e.reason : "network";
        posthog?.capture("host_photo_upload_failed", { reason });
        return { ok: false, error: hostMessage(reason) };
      }
    },
    [getToken],
  );

  /** Creates the stay. The server writes the listing text and checks it; a failure creates nothing. */
  const createStay = useCallback(
    async (input: StayInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
      const counts = { category: input.category, photo_count: input.photoIds.length, amenity_count: input.amenities.length };
      try {
        const { id } = await call<{ id: string }>("/api/host/stays", await getToken(), { method: "POST", body: input });
        posthog?.capture("host_stay_created", { stay_id: id, ...counts, outcome: "created" });
        invalidate();
        return { ok: true, id };
      } catch (e) {
        const reason = (e as HostError).reason ?? "server";
        posthog?.capture("host_stay_created", { ...counts, outcome: "failed", reason });
        return { ok: false, error: hostMessage(reason) };
      }
    },
    [getToken],
  );

  return { becomeHost, updateStay, setListed, uploadPhoto, createStay };
}

export type CancellationPolicy = { id: string; title: string; summary: string | null };

/** The shared cancellation policies a new stay can use. Loaded once per screen. */
export function useCancellationPolicies() {
  const { getToken } = useAuth();
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ policies?: CancellationPolicy[]; error?: string }>({});

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await call<{ policies: CancellationPolicy[] }>("/api/host/policies", await getToken(), { signal: controller.signal });
        if (!controller.signal.aborted) setState({ policies: data.policies });
      } catch (e) {
        if (!controller.signal.aborted) setState({ error: (e as HostError).reason ?? "server" });
      }
    })();
    return () => controller.abort();
  }, [version, getToken]);

  const retry = useCallback(() => {
    setState({});
    setVersion((v) => v + 1);
  }, []);
  return { ...state, retry };
}

// ---- One stay, in full, for the manager screen ----

export type StayDetail = {
  id: string;
  slug: string;
  listed: boolean;
  /** Fields an older stay never had come back null; the screen marks them "Needs attention". */
  title: string | null;
  category: string | null;
  city: string | null;
  state: string | null;
  nightlyPrice: number | null;
  cleaningFee: number | null;
  minNights: number | null;
  maxGuests: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  petsAllowed: boolean | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  amenities: string[] | null;
  vibeNotes: string[] | null;
  photoIds: string[] | null;
  photoUrls: (string | null)[];
  cancellationPolicyId: string | null;
};

// A saved edit tells open manager screens to reload.
const savedListeners = new Set<(stayId: string) => void>();
const staySaved = (stayId: string) => savedListeners.forEach((l) => l(stayId));

const STAY_FIELDS: StayField[] = [
  "title", "category", "city", "state", "nightlyPrice", "cleaningFee", "minNights", "maxGuests", "bedrooms", "beds",
  "bathrooms", "petsAllowed", "checkInTime", "checkOutTime", "amenities", "vibeNotes", "photoIds", "cancellationPolicyId",
];

/** Keys of `stay` whose current value fails the add-stay rules. */
export function needsAttention(stay: StayDetail): StayField[] {
  const input = Object.fromEntries(STAY_FIELDS.map((k) => [k, stay[k]]));
  return Object.keys(stayErrors(input)) as StayField[];
}

export type HostStayState =
  | { status: "loading" }
  | { status: "error"; reason: string; retry: () => void }
  | { status: "ready"; stay: StayDetail };

export function useHostStay(id: string): HostStayState {
  const { getToken } = useAuth();
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ id: string; stay?: StayDetail; error?: string }>({ id: "" });

  useEffect(() => {
    const listener = (stayId: string) => stayId === id && setVersion((v) => v + 1);
    savedListeners.add(listener);
    return () => void savedListeners.delete(listener);
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const stay = await call<StayDetail>(`/api/host/stays/${encodeURIComponent(id)}`, await getToken(), { signal: controller.signal });
        if (!controller.signal.aborted) setResult({ id, stay });
      } catch (e) {
        if (!controller.signal.aborted) setResult((prev) => ({ id, stay: prev.id === id ? prev.stay : undefined, error: (e as HostError).reason ?? "server" }));
      }
    })();
    return () => controller.abort();
  }, [id, version, getToken]);

  const retry = useCallback(() => {
    setResult((prev) => ({ id: prev.id, stay: prev.stay }));
    setVersion((v) => v + 1);
  }, []);

  if (result.id === id && result.stay) return { status: "ready", stay: result.stay };
  if (result.id === id && result.error) return { status: "error", reason: result.error, retry };
  return { status: "loading" };
}

// ---- Upcoming bookings on the host's stays ----

export type HostBooking = { id: string; stayId: string; checkIn: string; checkOut: string; guests: number; amountCents: number };

export type HostBookingsState =
  | { status: "loading" }
  | { status: "error"; reason: string; retry: () => void }
  | { status: "ready"; bookings: HostBooking[] };

// The last bookings list, shared by the dashboard and the stay manager so the second screen opens with data
// instead of a spinner while it refreshes.
let lastBookings: HostBooking[] | undefined;
const BOOKINGS_TIMEOUT_MS = 15_000;

/** Current and upcoming confirmed bookings across the user's stays: dates, guests and what was paid, nothing about the guest. */
export function useHostBookings(): HostBookingsState {
  const { getToken } = useAuth();
  // Held in a ref: if the function's identity changes between renders, an effect that depends on it would restart
  // the request on every render and never finish.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ bookings?: HostBooking[]; error?: string }>(() => ({ bookings: lastBookings }));

  useEffect(() => {
    const listener = () => setVersion((v) => v + 1);
    listeners.add(listener);
    return () => void listeners.delete(listener);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // A request that never answers ends as an error with a retry, never as a spinner that stays forever.
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      setResult((prev) => ({ bookings: prev.bookings, error: "network" }));
    }, BOOKINGS_TIMEOUT_MS);
    (async () => {
      try {
        const data = await call<{ bookings: HostBooking[] }>("/api/host/bookings", await getTokenRef.current(), { signal: controller.signal });
        if (controller.signal.aborted) return;
        lastBookings = data.bookings;
        setResult({ bookings: data.bookings });
        posthog?.capture("host_bookings_viewed", { count: data.bookings.length });
      } catch (e) {
        if (controller.signal.aborted && !timedOut) return;
        setResult((prev) => ({ bookings: prev.bookings, error: timedOut ? "network" : ((e as HostError).reason ?? "server") }));
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [version]);

  const retry = useCallback(() => {
    setResult((prev) => ({ bookings: prev.bookings }));
    setVersion((v) => v + 1);
  }, []);

  if (result.bookings) return { status: "ready", bookings: result.bookings };
  if (result.error) return { status: "error", reason: result.error, retry };
  return { status: "loading" };
}
