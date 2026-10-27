import { placeTarget, type Amenity, type Category, type ParsedQuery } from "@/lib/search";

// Builds the Sanity query for a parsed search. Hard constraints are GROQ filters whose values always go in as params;
// soft intent only ranks, through Dataset Embeddings. No guest text is ever concatenated into the query string.

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

const PROJECTION = `{ "id": _id, title, category, "city": location.city, "state": location.state, rating, "reviewCount": coalesce(reviewCount, 0), "price": nightlyPrice, "amenities": coalesce(amenities, []), "petsAllowed": coalesce(petsAllowed, false), "imageUrl": images[0].asset->url }`;

export function buildSearchQuery(parsed: ParsedQuery) {
  const conditions = ['_type == "property"'];
  const params: Record<string, unknown> = {};

  if (parsed.category) {
    conditions.push("category == $category");
    params.category = parsed.category;
  }
  if (parsed.maxPrice !== undefined) {
    conditions.push("nightlyPrice <= $maxPrice");
    params.maxPrice = parsed.maxPrice;
  }
  if (parsed.guests !== undefined) {
    conditions.push("maxGuests >= $guests");
    params.guests = parsed.guests;
  }
  if (parsed.pets) conditions.push("petsAllowed == true");
  if (parsed.amenities.length) {
    conditions.push("count(amenities[@ in $amenities]) == count($amenities)");
    params.amenities = parsed.amenities;
  }
  if (parsed.place) {
    const target = placeTarget(parsed.place);
    if ("city" in target) {
      conditions.push("location.city == $city");
      params.city = target.city;
    } else {
      conditions.push("location.state == $state");
      params.state = target.state;
    }
  }

  // With nothing recognized, only the leftover words are left to go on, and semantic ranking never returns zero,
  // so they have to appear in the stay's text. Keywords are plain letters and digits, and still go in as a param.
  if (parsed.filters.length === 0 && parsed.keywords.length > 0) {
    conditions.push("[title, location.city, location.state, summary, description, neighborhood] match $words");
    params.words = parsed.keywords.map((k) => `${k}*`);
  }

  const filter = `*[${conditions.join(" && ")}]`;
  // Only the soft words and leftovers are embedded, never the whole sentence.
  const soft = [...parsed.tags, ...parsed.keywords].join(" ");
  const semantic = soft !== "";
  if (semantic) params.q = soft;

  const order = semantic ? "score(text::semanticSimilarity($q)) | order(_score desc, rating desc)" : "order(rating desc, reviewCount desc)";
  const query = `{ "total": count(${filter}), "stays": ${filter} | ${order}[0...${MAX_RESULTS}]${PROJECTION} }`;
  return { query, params, semantic };
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
