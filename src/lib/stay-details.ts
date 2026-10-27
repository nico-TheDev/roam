import {
  Bath,
  Building2,
  ChefHat,
  CookingPot,
  Flame,
  Laptop,
  Mountain,
  PawPrint,
  PlugZap,
  Snowflake,
  TreePine,
  Umbrella,
  Waves,
  Wifi,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import type { Category } from "@/lib/search";
import { posthogLog } from "@/lib/posthog-logs";

// One stay's full details from the public Sanity CDN. The dataset is public and nothing here is secret.
// The query is fixed and the stay id is passed as a GROQ param, so no guest text ever reaches GROQ.

export type StayPolicy = {
  title: string;
  kind: "cancellation" | "house-rules" | "pets" | "check-in" | "payments" | "safety";
  summary: string;
  body: string;
};

export type StayDetails = {
  id: string;
  /** False when the host paused the stay; it still opens by link but can't be booked. */
  listed: boolean;
  title: string;
  category: Category;
  rating: number;
  reviewCount: number;
  city: string;
  state: string;
  nightlyPrice: number;
  cleaningFee: number;
  minNights: number;
  maxGuests: number;
  petsAllowed: boolean;
  amenities: string[];
  imageUrls: string[];
  host: {
    id: string;
    name: string;
    bio: string | null;
    isSuperhost: boolean;
    hostingSince: number | null;
    photoUrl: string | null;
  } | null;
  cancellationPolicy: StayPolicy | null;
  policies: StayPolicy[];
};

const PROJECT_ID = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.EXPO_PUBLIC_SANITY_DATASET;
const API_VERSION = "2026-02-01";

const POLICY = `{ title, kind, summary, body }`;
const QUERY = `*[_type == "property" && _id == $id][0]{
  "id": _id, "listed": listed != false, title, category, rating, reviewCount,
  "city": location.city, "state": location.state,
  nightlyPrice, cleaningFee, minNights, maxGuests, petsAllowed, amenities,
  "imageUrls": images[].asset->url,
  "host": host->{ "id": _id, name, bio, isSuperhost, hostingSince, "photoUrl": photo.asset->url },
  "cancellationPolicy": cancellationPolicy->${POLICY},
  "policies": policies[]->${POLICY}
}`;

const withSize = (url: string) => `${url}?w=1200&q=80&auto=format`;

type Raw = Omit<StayDetails, "imageUrls" | "policies" | "amenities" | "cleaningFee" | "minNights" | "host"> & {
  imageUrls: (string | null)[] | null;
  policies: (StayPolicy | null)[] | null;
  amenities: string[] | null;
  cleaningFee: number | null;
  minNights: number | null;
  host: (Omit<NonNullable<StayDetails["host"]>, "isSuperhost"> & { isSuperhost: boolean | null }) | null;
};

function parse(raw: Raw): StayDetails {
  return {
    ...raw,
    amenities: raw.amenities ?? [],
    cleaningFee: raw.cleaningFee ?? 0,
    minNights: raw.minNights ?? 1,
    imageUrls: (raw.imageUrls ?? []).filter((u): u is string => !!u).map(withSize),
    policies: (raw.policies ?? []).filter((p): p is StayPolicy => !!p),
    host: raw.host?.name ? { ...raw.host, isSuperhost: !!raw.host.isSuperhost } : null,
  };
}

// The policies sheet opens right after the screen, so it reads what the screen already loaded.
const cache = new Map<string, StayDetails>();

async function getStay(id: string, signal?: AbortSignal): Promise<StayDetails | null> {
  if (!PROJECT_ID || !DATASET) throw new Error("Sanity is not configured");
  const url =
    `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}` +
    `?query=${encodeURIComponent(QUERY)}&$id=${encodeURIComponent(JSON.stringify(id))}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Sanity responded ${res.status}`);
  const { result } = (await res.json()) as { result: Raw | null };
  if (!result) return null;
  const stay = parse(result);
  cache.set(id, stay);
  return stay;
}

export type StayDetailsState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "not-found" }
  | { status: "ready"; stay: StayDetails };

export function useStayDetails(id: string): StayDetailsState {
  const [attempt, setAttempt] = useState(0);
  // The result remembers which id and attempt it belongs to, so a retry is "loading" again without setting state in the effect.
  const [outcome, setOutcome] = useState<{ key: string; stay?: StayDetails | null }>({ key: "" });
  const key = `${id}:${attempt}`;
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    getStay(id, controller.signal)
      .then((stay) => setOutcome({ key, stay }))
      .catch(() => {
        if (!controller.signal.aborted) {
          posthogLog.warn("stay_details_load_failed", { attempt });
          setOutcome({ key });
        }
      });
    return () => controller.abort();
  }, [id, attempt, key]);

  const cached = cache.get(id);
  if (outcome.key !== key) return cached ? { status: "ready", stay: cached } : { status: "loading" };
  if (outcome.stay === undefined) return { status: "error", retry };
  return outcome.stay ? { status: "ready", stay: outcome.stay } : { status: "not-found" };
}

/** What the sheet shows: the stay when the screen already loaded it. */
export const getCachedStay = (id: string) => cache.get(id);

/** Estimate for the minimum stay: nights times the nightly price, plus the cleaning fee. Dates don't exist yet. */
export function priceSummary(stay: Pick<StayDetails, "nightlyPrice" | "cleaningFee" | "minNights">) {
  return { total: stay.nightlyPrice * stay.minNights + stay.cleaningFee, nights: stay.minNights };
}

const AMENITIES: Record<string, { label: string; icon: LucideIcon }> = {
  "hot-tub": { label: "Hot Tub", icon: Bath },
  pool: { label: "Pool", icon: Waves },
  fireplace: { label: "Fireplace", icon: Flame },
  "ocean-view": { label: "Ocean View", icon: Waves },
  "forest-view": { label: "Forest View", icon: TreePine },
  "mountain-view": { label: "Mountain View", icon: Mountain },
  "lake-view": { label: "Lake View", icon: Waves },
  "skyline-view": { label: "Skyline View", icon: Building2 },
  wifi: { label: "Wi-Fi", icon: Wifi },
  workspace: { label: "Workspace", icon: Laptop },
  kitchen: { label: "Kitchen", icon: CookingPot },
  "air-conditioning": { label: "Air Conditioning", icon: Snowflake },
  "ev-charger": { label: "EV Charger", icon: PlugZap },
  bbq: { label: "BBQ", icon: ChefHat },
  "fire-pit": { label: "Fire Pit", icon: Flame },
  "beach-access": { label: "Beach Access", icon: Umbrella },
};

/** Up to four highlights: the stay's first amenities, with "Pet Friendly" second when pets are allowed (it is a flag, not an amenity). */
export function highlights(stay: Pick<StayDetails, "amenities" | "petsAllowed">) {
  const items = stay.amenities.flatMap((a) => (AMENITIES[a] ? [AMENITIES[a]] : []));
  if (stay.petsAllowed) items.splice(1, 0, { label: "Pet Friendly", icon: PawPrint });
  return items.slice(0, 4);
}

/** The stay's rules for the sheet: house rules first, then the other policies, cancellation last. */
export function sheetPolicies(stay: Pick<StayDetails, "policies" | "cancellationPolicy">): StayPolicy[] {
  const order = (p: StayPolicy) => (p.kind === "house-rules" ? 0 : 1);
  const others = stay.policies.filter((p) => p.kind !== "cancellation").sort((a, b) => order(a) - order(b));
  return stay.cancellationPolicy ? [...others, stay.cancellationPolicy] : others;
}
