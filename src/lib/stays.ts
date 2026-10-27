import { useCallback, useEffect, useState } from "react";
import type { Category } from "@/lib/search";
import { posthogLog } from "@/lib/posthog-logs";

// Live stays from Sanity for the Home feed. The dataset is public and nothing here is secret, so this reads the CDN directly.
// Only fixed queries live here: no guest text ever reaches GROQ.

export type FeaturedStay = {
  id: string;
  title: string;
  category: Category;
  city: string;
  state: string;
  rating: number;
  imageUrl: string;
};

export type FeaturedByCategory = Record<Category | "all", FeaturedStay[]>;

const PROJECT_ID = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.EXPO_PUBLIC_SANITY_DATASET;
const API_VERSION = "2026-02-01";
const PER_CATEGORY = 12;
const CATEGORIES: Category[] = ["cabin", "beach", "city", "villa"];

const PROJECTION = `{ "id": _id, title, category, "city": location.city, "state": location.state, rating, "imageUrl": images[0].asset->url }`;
const featured = (filter: string) =>
  `*[_type == "property"${filter}] | order(rating desc, reviewCount desc)[0...${PER_CATEGORY}]${PROJECTION}`;

// One request returns every category, so switching chips on Home needs no further request.
const FEATURED_QUERY = `{ "all": ${featured("")}, ${CATEGORIES.map((c) => `"${c}": ${featured(` && category == "${c}"`)}`).join(", ")} }`;

type RawStay = Omit<FeaturedStay, "imageUrl"> & { imageUrl: string | null };

const withSize = (url: string) => `${url}?w=1000&q=80&auto=format`;

function parse(result: unknown): FeaturedByCategory {
  const raw = result as Record<string, RawStay[] | undefined> | null;
  const out = {} as FeaturedByCategory;
  for (const key of ["all", ...CATEGORIES] as const) {
    const list = raw?.[key];
    if (!Array.isArray(list)) throw new Error("Unexpected response");
    out[key] = list.filter((s) => s.imageUrl).map((s) => ({ ...s, imageUrl: withSize(s.imageUrl as string) }));
  }
  return out;
}

export async function getFeaturedStays(signal?: AbortSignal): Promise<FeaturedByCategory> {
  if (!PROJECT_ID || !DATASET) throw new Error("Sanity is not configured");
  const url = `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(FEATURED_QUERY)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Sanity responded ${res.status}`);
  return parse((await res.json()).result);
}

export type FeaturedState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; stays: FeaturedByCategory };

export function useFeaturedStays(): FeaturedState {
  const [attempt, setAttempt] = useState(0);
  // The result remembers which attempt it belongs to, so a retry is "loading" again without setting state inside the effect.
  const [outcome, setOutcome] = useState<{ attempt: number; stays?: FeaturedByCategory }>({ attempt: -1 });
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    getFeaturedStays(controller.signal)
      .then((stays) => {
        posthogLog.info("featured_stays_loaded", { attempt, stay_count: stays.all.length });
        setOutcome({ attempt, stays });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          posthogLog.warn("featured_stays_load_failed", { attempt });
          setOutcome({ attempt });
        }
      });
    return () => controller.abort();
  }, [attempt]);

  if (outcome.attempt !== attempt) return { status: "loading" };
  return outcome.stays ? { status: "ready", stays: outcome.stays } : { status: "error", retry };
}
