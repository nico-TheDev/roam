import { DEFAULT_CHECK_IN, DEFAULT_CHECK_OUT, type StayField, type StayInput } from "@/lib/host-stay-rules";
import type { StayDetail } from "@/lib/host";

// The form's working copy of a stay: text fields stay strings until they are sent. Shared by Add a stay and the
// stay manager, so both hold a stay to the same rules (src/lib/host-stay-rules.ts).

export type Draft = {
  title: string;
  category: string;
  city: string;
  state: string;
  price: string;
  cleaning: string;
  minNights: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  halfBath: boolean;
  pets: boolean;
  checkIn: string;
  checkOut: string;
  amenities: string[];
  notes: string[];
  policyId: string;
};

export const emptyDraft = (): Draft => ({
  title: "", category: "", city: "", state: "", price: "", cleaning: "", minNights: 1, maxGuests: 2, bedrooms: 1,
  beds: 1, baths: 1, halfBath: false, pets: false, checkIn: DEFAULT_CHECK_IN, checkOut: DEFAULT_CHECK_OUT,
  amenities: [], notes: ["", "", ""], policyId: "",
});

/** A stored stay as a draft. Values an older stay never had fall back to the empty form's, and are flagged by the server. */
export function draftFromDetail(s: StayDetail): Draft {
  const base = emptyDraft();
  const bathrooms = s.bathrooms ?? 1;
  return {
    title: s.title ?? base.title,
    category: s.category ?? base.category,
    city: s.city ?? base.city,
    state: s.state ?? base.state,
    price: s.nightlyPrice === null ? "" : String(s.nightlyPrice),
    cleaning: s.cleaningFee === null ? "" : String(s.cleaningFee),
    minNights: s.minNights ?? base.minNights,
    maxGuests: s.maxGuests ?? base.maxGuests,
    bedrooms: s.bedrooms ?? base.bedrooms,
    beds: s.beds ?? base.beds,
    baths: Math.floor(bathrooms),
    halfBath: bathrooms % 1 !== 0,
    pets: s.petsAllowed ?? base.pets,
    checkIn: s.checkInTime ?? base.checkIn,
    checkOut: s.checkOutTime ?? base.checkOut,
    amenities: s.amenities ?? base.amenities,
    notes: s.vibeNotes?.length ? s.vibeNotes : base.notes,
    policyId: s.cancellationPolicyId ?? base.policyId,
  };
}

/** Every field of the stay from a draft plus the uploaded photo ids. Unparseable numbers become NaN so the rules reject them. */
export function inputFromDraft(d: Draft, photoIds: string[]): StayInput {
  return {
    title: d.title.trim(),
    category: d.category,
    city: d.city.trim(),
    state: d.state,
    nightlyPrice: /^\d{1,5}$/.test(d.price.trim()) ? Number(d.price.trim()) : NaN,
    cleaningFee: /^\d{1,4}$/.test(d.cleaning.trim()) ? Number(d.cleaning.trim()) : NaN,
    minNights: d.minNights,
    maxGuests: d.maxGuests,
    bedrooms: d.bedrooms,
    beds: d.beds,
    bathrooms: d.baths + (d.halfBath ? 0.5 : 0),
    petsAllowed: d.pets,
    checkInTime: d.checkIn,
    checkOutTime: d.checkOut,
    amenities: d.amenities,
    vibeNotes: d.notes.map((n) => n.trim()).filter(Boolean),
    photoIds,
    cancellationPolicyId: d.policyId,
  };
}

/** The parts of a stay edited together on the manager screen, and the fields each one sends. */
export const SECTIONS = {
  photos: { title: "Photos", fields: ["photoIds"] },
  basics: { title: "Basics", fields: ["title", "category", "city", "state"] },
  pricing: { title: "Pricing", fields: ["nightlyPrice", "cleaningFee"] },
  space: { title: "Space", fields: ["maxGuests", "bedrooms", "beds", "bathrooms", "minNights", "petsAllowed"] },
  times: { title: "Check-in and check-out", fields: ["checkInTime", "checkOutTime"] },
  amenities: { title: "Amenities", fields: ["amenities"] },
  notes: { title: "What it's like", fields: ["vibeNotes"] },
  policy: { title: "Cancellation", fields: ["cancellationPolicyId"] },
} as const satisfies Record<string, { title: string; fields: readonly StayField[] }>;
export type SectionKey = keyof typeof SECTIONS;
