// The one place that says what a new stay may contain. Pure, so the add-stay screen (quick feedback) and
// POST /api/host/stays (the authority) run the very same checks. Every value is a typed, bounded field;
// the only free text is the title, the city and the vibe notes, and the server's copy checker still vets what
// is written from them. The lists come from the Studio schema files so they can't drift from the dataset.
import { STATE_NAMES } from "../../studio/seed/check-copy";
import { AMENITIES, CATEGORIES } from "../../studio/schemaTypes/amenities";

export const CATEGORY_OPTIONS = CATEGORIES;
export const AMENITY_OPTIONS = AMENITIES;
export const STATE_OPTIONS = Object.entries(STATE_NAMES).map(([value, title]) => ({ value, title }));

/** Check-in and check-out times a host can offer, 24-hour as stored on the stay. */
export const CHECK_IN_OPTIONS = ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"] as const;
export const DEFAULT_CHECK_IN = "15:00";
export const CHECK_OUT_OPTIONS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00"] as const;
export const DEFAULT_CHECK_OUT = "11:00";

/** "15:00" as "3:00 PM". */
export function formatTime(time: string): string {
  const hour = Number(time.slice(0, 2));
  return `${hour % 12 === 0 ? 12 : hour % 12}:${time.slice(3)} ${hour < 12 ? "AM" : "PM"}`;
}

export const STAY_LIMITS = {
  title: { min: 3, max: 60 },
  city: { min: 2, max: 60 },
  nightlyPrice: { min: 1, max: 10_000 },
  cleaningFee: { min: 0, max: 2_000 },
  minNights: { min: 1, max: 30 },
  maxGuests: { min: 1, max: 16 },
  bedrooms: { min: 0, max: 10 },
  beds: { min: 1, max: 20 },
  bathrooms: { min: 0.5, max: 10 },
  vibeNotes: { min: 3, max: 6, length: 140 },
  photos: { min: 5, max: 30 },
  staysPerHost: 10,
} as const;

export type StayInput = {
  title: string;
  category: string;
  city: string;
  state: string;
  nightlyPrice: number;
  cleaningFee: number;
  minNights: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  petsAllowed: boolean;
  checkInTime: string;
  checkOutTime: string;
  amenities: string[];
  vibeNotes: string[];
  photoIds: string[];
  cancellationPolicyId: string;
};
export type StayField = keyof StayInput;
export type StayErrors = Partial<Record<StayField, string>>;

const KEYS: StayField[] = [
  "title", "category", "city", "state", "nightlyPrice", "cleaningFee", "minNights", "maxGuests", "bedrooms", "beds",
  "bathrooms", "petsAllowed", "checkInTime", "checkOutTime", "amenities", "vibeNotes", "photoIds", "cancellationPolicyId",
];
// Sanity image asset ids, and Sanity document ids for a policy.
export const ASSET_ID = /^image-[A-Za-z0-9]+-\d+x\d+-[a-z0-9]+$/;
export const DOC_ID = /^(?!drafts\.)[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/;
const CONTROL = /\p{Cc}/u;

const range = (n: unknown, min: number, max: number, step = 1): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max && Number.isInteger(n / step);

const text = (v: unknown, { min, max }: { min: number; max: number }): v is string =>
  typeof v === "string" && v.trim().length >= min && v.trim().length <= max && !CONTROL.test(v);

/** Field-level problems, empty when the stay is valid. Unknown keys fail the whole stay. */
export function stayErrors(input: unknown): StayErrors {
  const e: StayErrors = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return Object.fromEntries(KEYS.map((k) => [k, "Required."]));
  const s = input as Record<string, unknown>;
  const L = STAY_LIMITS;
  const money = (k: "nightlyPrice" | "cleaningFee") => `Enter a whole number from $${L[k].min} to $${L[k].max.toLocaleString("en-US")}.`;

  for (const k of Object.keys(s)) if (!KEYS.includes(k as StayField)) e.title = e.title ?? "Unexpected field.";
  if (!text(s.title, L.title)) e.title = `Use ${L.title.min} to ${L.title.max} characters.`;
  if (!CATEGORY_OPTIONS.some((c) => c.value === s.category)) e.category = "Pick a type of stay.";
  if (!text(s.city, L.city)) e.city = `Use ${L.city.min} to ${L.city.max} characters.`;
  if (typeof s.state !== "string" || !(s.state in STATE_NAMES)) e.state = "Pick a state.";
  if (!range(s.nightlyPrice, L.nightlyPrice.min, L.nightlyPrice.max)) e.nightlyPrice = money("nightlyPrice");
  if (!range(s.cleaningFee, L.cleaningFee.min, L.cleaningFee.max)) e.cleaningFee = money("cleaningFee");
  if (!range(s.minNights, L.minNights.min, L.minNights.max)) e.minNights = `Use ${L.minNights.min} to ${L.minNights.max} nights.`;
  if (!range(s.maxGuests, L.maxGuests.min, L.maxGuests.max)) e.maxGuests = `Use ${L.maxGuests.min} to ${L.maxGuests.max} guests.`;
  if (!range(s.bedrooms, L.bedrooms.min, L.bedrooms.max)) e.bedrooms = `Use ${L.bedrooms.min} to ${L.bedrooms.max}.`;
  if (!range(s.beds, L.beds.min, L.beds.max)) e.beds = `Use ${L.beds.min} to ${L.beds.max}.`;
  if (!range(s.bathrooms, L.bathrooms.min, L.bathrooms.max, 0.5)) e.bathrooms = `Use ${L.bathrooms.min} to ${L.bathrooms.max}, in halves.`;
  if (typeof s.petsAllowed !== "boolean") e.petsAllowed = "Choose whether pets are allowed.";

  if (typeof s.checkInTime !== "string" || !(CHECK_IN_OPTIONS as readonly string[]).includes(s.checkInTime)) e.checkInTime = "Pick a check-in time.";

  if (typeof s.checkOutTime !== "string" || !(CHECK_OUT_OPTIONS as readonly string[]).includes(s.checkOutTime)) e.checkOutTime = "Pick a check-out time.";

  const amenityValues: string[] = AMENITY_OPTIONS.map((a) => a.value);
  if (!Array.isArray(s.amenities) || s.amenities.some((a) => !amenityValues.includes(a)) || new Set(s.amenities).size !== s.amenities.length)
    e.amenities = "Pick amenities from the list.";

  const notes = s.vibeNotes;
  if (!Array.isArray(notes) || notes.length < L.vibeNotes.min || notes.length > L.vibeNotes.max)
    e.vibeNotes = `Add ${L.vibeNotes.min} to ${L.vibeNotes.max} notes.`;
  else if (notes.some((n) => !text(n, { min: 1, max: L.vibeNotes.length })))
    e.vibeNotes = `Each note takes 1 to ${L.vibeNotes.length} characters.`;

  const photos = s.photoIds;
  if (!Array.isArray(photos) || photos.length < L.photos.min || photos.length > L.photos.max)
    e.photoIds = `Add ${L.photos.min} to ${L.photos.max} photos.`;
  else if (photos.some((p) => typeof p !== "string" || !ASSET_ID.test(p)) || new Set(photos).size !== photos.length)
    e.photoIds = "One of the photos isn't valid. Remove it and add it again.";

  if (typeof s.cancellationPolicyId !== "string" || !DOC_ID.test(s.cancellationPolicyId)) e.cancellationPolicyId = "Pick a cancellation policy.";
  return e;
}

/** A URL-safe slug from the title plus a short random suffix, so two stays with one title never collide. */
export function slugFor(title: string, random: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "stay"}-${random}`;
}
