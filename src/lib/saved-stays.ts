import { useCallback, useEffect, useState } from "react";
import { PROJECTION } from "@/lib/search-query";
import type { SearchStay } from "@/lib/search-query";
import { posthogLog } from "@/lib/posthog-logs";

// The stays behind the saved IDs, from the public Sanity CDN. The IDs come from the guest's own Clerk metadata, never from
// typed text, and are checked against Sanity's ID characters before they are written into the query as JSON string literals.

const PROJECT_ID = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.EXPO_PUBLIC_SANITY_DATASET;
const API_VERSION = "2026-02-01";
const ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;

type RawStay = Omit<SearchStay, "imageUrl"> & { imageUrl: string | null };

export async function getStaysById(ids: string[], signal?: AbortSignal): Promise<SearchStay[]> {
  if (!PROJECT_ID || !DATASET) throw new Error("Sanity is not configured");
  const safe = ids.filter((id) => ID_PATTERN.test(id));
  if (safe.length === 0) return [];
  const query = `*[_type == "property" && listed != false && _id in ${JSON.stringify(safe)}]${PROJECTION}`;
  const url = `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Sanity responded ${res.status}`);
  const result = (await res.json()).result as RawStay[] | null;
  if (!Array.isArray(result)) throw new Error("Unexpected response");
  const byId = new Map(
    result.filter((s) => s.imageUrl).map((s) => [s.id, { ...s, imageUrl: `${s.imageUrl}?w=600&q=80&auto=format` } as SearchStay]),
  );
  // Saved order, newest first. IDs Sanity no longer has are dropped.
  return [...safe].reverse().flatMap((id) => byId.get(id) ?? []);
}

export type SavedStaysState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; stays: SearchStay[] };

/** `ids` should stay fixed while the screen is open, so a stay unsaved here stays listed and can be saved again. */
export function useSavedStayDetails(ids: string[]): SavedStaysState {
  const key = ids.join("|");
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<{ key: string; attempt: number; stays?: SearchStay[] }>({ key: "", attempt: -1 });
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    getStaysById(key ? key.split("|") : [], controller.signal)
      .then((stays) => setOutcome({ key, attempt, stays }))
      .catch(() => {
        if (controller.signal.aborted) return;
        posthogLog.warn("saved_stays_load_failed", { attempt });
        setOutcome({ key, attempt });
      });
    return () => controller.abort();
  }, [key, attempt]);

  if (outcome.key !== key || outcome.attempt !== attempt) return { status: "loading" };
  return outcome.stays ? { status: "ready", stays: outcome.stays } : { status: "error", retry };
}
