import { AMENITY_LABELS, CATEGORY_LABELS, CITIES, STATES, TAG_WORDS, placeTarget, type Amenity, type Category } from "@/lib/search";
import type { SearchIntent } from "@/lib/search-intent";

// Builds the GROQ for a search intent. The Context endpoint takes no query params, so every value is a literal, and every
// literal is code-owned: strings must be on a fixed list, numbers must be bounded integers. Neither guest text nor model
// text is ever written into the query, so a hostile sentence can't change what runs.

export type SearchSort = "best" | "price_asc" | "price_desc" | "rating_desc" | "rating_asc";
// One request returns every match (up to this many), and the screen sorts them on the device, so a sort change needs no request.
export const MAX_RESULTS = 100;

export type SearchStay = {
  id: string;
  title: string;
  category: Category;
  city: string;
  state: string;
  rating: number;
  reviewCount: number;
  price: number;
  amenities: Amenity[];
  petsAllowed: boolean;
  imageUrl: string;
};

export const PROJECTION = `{ "id": _id, title, category, "city": location.city, "state": location.state, rating, "reviewCount": coalesce(reviewCount, 0), "price": nightlyPrice, "amenities": coalesce(amenities, []), "petsAllowed": coalesce(petsAllowed, false), "imageUrl": images[0].asset->url }`;

const AMENITIES = new Set<string>(Object.keys(AMENITY_LABELS));
const CATEGORIES = new Set<string>(Object.keys(CATEGORY_LABELS));
const VIBES = new Set<string>(Object.keys(TAG_WORDS));
const PLACES = { city: new Set<string>(CITIES), state: new Set<string>(Object.keys(STATES)) };

/** A GROQ string literal for a value that must be one of `allowed`. */
function word(allowed: Set<string>, value: string) {
  if (!allowed.has(value)) throw new Error("Value is not an allowed option");
  return JSON.stringify(value);
}
const list = (allowed: Set<string>, values: string[]) => `[${values.map((v) => word(allowed, v)).join(", ")}]`;
function int(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 100_000) throw new Error("Number is out of range");
  return String(value);
}

export function buildSearchQuery(intent: SearchIntent) {
  const conditions = ['_type == "property"', "listed != false"];

  if (intent.pets === "wanted") conditions.push("petsAllowed == true");
  if (intent.pets === "avoided") conditions.push("petsAllowed != true");

  const { wanted: wantedAmenities, avoided: avoidedAmenities } = intent.amenities;
  if (wantedAmenities.length) conditions.push(`count(amenities[@ in ${list(AMENITIES, wantedAmenities)}]) == ${wantedAmenities.length}`);
  if (avoidedAmenities.length) conditions.push(`count(amenities[@ in ${list(AMENITIES, avoidedAmenities)}]) == 0`);

  const { wanted: wantedCategories, avoided: avoidedCategories } = intent.categories;
  if (wantedCategories.length) conditions.push(`category in ${list(CATEGORIES, wantedCategories)}`);
  if (avoidedCategories.length) conditions.push(`!(category in ${list(CATEGORIES, avoidedCategories)})`);

  if (intent.maxPrice !== undefined) conditions.push(`nightlyPrice <= ${int(intent.maxPrice)}`);
  if (intent.minPrice !== undefined) conditions.push(`nightlyPrice >= ${int(intent.minPrice)}`);
  if (intent.guests !== undefined) conditions.push(`maxGuests >= ${int(intent.guests)}`);

  if (intent.place) {
    const target = placeTarget(intent.place);
    if ("city" in target) conditions.push(`location.city == ${word(PLACES.city, target.city)}`);
    else conditions.push(`location.state == ${word(PLACES.state, target.state)}`);
  }

  const filter = `*[${conditions.join(" && ")}]`;
  // Only the wanted vibe words are embedded, never the sentence.
  const soft = intent.vibes.wanted;
  const semantic = soft.length > 0;
  for (const v of soft) word(VIBES, v);

  const order = semantic
    ? `score(text::semanticSimilarity(${JSON.stringify(soft.join(" "))})) | order(_score desc, rating desc)`
    : "order(rating desc, reviewCount desc)";
  const query = `{ "total": count(${filter}), "stays": ${filter} | ${order}[0...${MAX_RESULTS}]${PROJECTION} }`;
  return { query, semantic };
}

/** Reorders a result list on the device. "best" keeps the order the server ranked them in. */
export function sortStays(stays: SearchStay[], sort: SearchSort): SearchStay[] {
  if (sort === "best") return stays;
  const by: Record<Exclude<SearchSort, "best">, (a: SearchStay, b: SearchStay) => number> = {
    price_asc: (a, b) => a.price - b.price || b.rating - a.rating,
    price_desc: (a, b) => b.price - a.price || b.rating - a.rating,
    rating_desc: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
    rating_asc: (a, b) => a.rating - b.rating || b.reviewCount - a.reviewCount,
  };
  return [...stays].sort(by[sort]);
}
