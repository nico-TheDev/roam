import { useCallback, useEffect, useState } from "react";
import type { Category } from "@/lib/search";
import { posthogLog } from "@/lib/posthog-logs";

// A host's other stays from the public Sanity CDN. The query is fixed and both ids are GROQ params,
// so no guest text ever reaches GROQ.

export type HostStay = {
  id: string;
  title: string;
  category: Category;
  city: string;
  state: string;
  rating: number;
  reviewCount: number;
  nightlyPrice: number;
  imageUrl: string;
};

const PROJECT_ID = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.EXPO_PUBLIC_SANITY_DATASET;
const API_VERSION = "2026-02-01";

const QUERY = `*[_type == "property" && host._ref == $hostId && _id != $stayId] | order(rating desc, reviewCount desc){
  "id": _id, title, category, "city": location.city, "state": location.state,
  rating, reviewCount, nightlyPrice, "imageUrl": images[0].asset->url
}`;

type Raw = Omit<HostStay, "imageUrl"> & { imageUrl: string | null };

const withSize = (url: string) => `${url}?w=600&q=80&auto=format`;

async function getHostStays(hostId: string, stayId: string, signal?: AbortSignal): Promise<HostStay[]> {
  if (!PROJECT_ID || !DATASET) throw new Error("Sanity is not configured");
  const url =
    `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}` +
    `?query=${encodeURIComponent(QUERY)}` +
    `&$hostId=${encodeURIComponent(JSON.stringify(hostId))}&$stayId=${encodeURIComponent(JSON.stringify(stayId))}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Sanity responded ${res.status}`);
  const { result } = (await res.json()) as { result: Raw[] | null };
  if (!Array.isArray(result)) throw new Error("Unexpected response");
  return result.filter((s) => s.imageUrl).map((s) => ({ ...s, imageUrl: withSize(s.imageUrl as string) }));
}

export type HostStaysState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; stays: HostStay[] };

export function useHostStays(hostId: string | undefined, stayId: string): HostStaysState {
  const [attempt, setAttempt] = useState(0);
  // The result remembers which host and attempt it belongs to, so a retry is "loading" again without setting state in the effect.
  const [outcome, setOutcome] = useState<{ key: string; stays?: HostStay[] }>({ key: "" });
  const key = `${hostId}:${stayId}:${attempt}`;
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!hostId) return;
    const controller = new AbortController();
    getHostStays(hostId, stayId, controller.signal)
      .then((stays) => setOutcome({ key, stays }))
      .catch(() => {
        if (!controller.signal.aborted) {
          posthogLog.warn("host_stays_load_failed", { attempt });
          setOutcome({ key });
        }
      });
    return () => controller.abort();
  }, [hostId, stayId, attempt, key]);

  if (!hostId) return { status: "ready", stays: [] };
  if (outcome.key !== key) return { status: "loading" };
  return outcome.stays ? { status: "ready", stays: outcome.stays } : { status: "error", retry };
}
