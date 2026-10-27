// Parses a guest's sentence into exact filters and soft intent. Pure functions, no React: the Search screen uses it
// for its chips and `src/app/api/search+api.ts` uses it to build the Sanity query. Prices and guest counts are parsed in code.

export type Category = "cabin" | "beach" | "city" | "villa";
export type Amenity =
  | "hot-tub"
  | "pool"
  | "fireplace"
  | "ocean-view"
  | "wifi"
  | "workspace"
  | "forest-view"
  | "fire-pit"
  | "kitchen"
  | "lake-view"
  | "bbq"
  | "beach-access"
  | "air-conditioning"
  | "skyline-view"
  | "mountain-view"
  | "ev-charger";
export type Tag = "quiet" | "cozy" | "secluded" | "romantic" | "family" | "luxury" | "modern";

export type FilterKey = "category" | "price" | "guests" | "pets" | "place" | `amenity:${Amenity}` | `tag:${Tag}`;

export type Filter = {
  key: FilterKey;
  label: string;
  /** Hard filters remove stays. Soft ones (tags) only rank. */
  hard: boolean;
  /** The exact pieces of the query text that produced this filter, so a chip can be removed from the text. */
  spans: string[];
};

export type ParsedQuery = {
  filters: Filter[];
  maxPrice?: number;
  guests?: number;
  pets: boolean;
  category?: Category;
  place?: string;
  amenities: Amenity[];
  tags: Tag[];
  /** Words nothing else claimed. They only affect ranking. */
  keywords: string[];
};

export const CATEGORY_LABELS: Record<Category, string> = {
  cabin: "Cabins",
  beach: "Beach",
  city: "City",
  villa: "Villas",
};

export const AMENITY_LABELS: Record<Amenity, string> = {
  "hot-tub": "Hot Tub",
  pool: "Pool",
  fireplace: "Fireplace",
  "ocean-view": "Ocean View",
  wifi: "Wi-Fi",
  workspace: "Workspace",
  "forest-view": "Forest View",
  "fire-pit": "Fire Pit",
  kitchen: "Kitchen",
  "lake-view": "Lake View",
  bbq: "BBQ",
  "beach-access": "Beach Access",
  "air-conditioning": "Air Conditioning",
  "skyline-view": "Skyline View",
  "mountain-view": "Mountain View",
  "ev-charger": "EV Charger",
};

export const CATEGORY_WORDS: Record<Category, RegExp> = {
  cabin: /\b(?:cabins?|a-frames?|lodges?|chalets?)\b/gi,
  beach: /\b(?:beach(?:es|front)?|oceanfront|seaside|coastal)\b/gi,
  city: /\b(?:city|downtown|apartments?|lofts?|condos?|urban)\b/gi,
  villa: /\b(?:villas?|mansions?|estates?)\b/gi,
};

export const AMENITY_WORDS: Record<Amenity, RegExp> = {
  "hot-tub": /\b(?:hot[- ]?tubs?|jacuzzi|spa)\b/gi,
  pool: /\b(?:pools?|swimming)\b/gi,
  fireplace: /\b(?:fireplaces?|wood[- ]?stove)\b/gi,
  "ocean-view": /\b(?:ocean[- ]?views?|sea[- ]?views?)\b/gi,
  wifi: /\b(?:wi-?fi|internet)\b/gi,
  workspace: /\b(?:workspace|work[- ]from[- ]home|desk)\b/gi,
  "forest-view": /\bforest[- ]?views?\b/gi,
  "fire-pit": /\bfire[- ]?pits?\b/gi,
  kitchen: /\bkitchens?\b/gi,
  "lake-view": /\blake[- ]?views?\b/gi,
  bbq: /\b(?:bbq|barbecue|grill)\b/gi,
  "beach-access": /\bbeach[- ]access\b/gi,
  "air-conditioning": /\b(?:air[- ]conditioning|a\/c)\b/gi,
  "skyline-view": /\bskyline[- ]?views?\b/gi,
  "mountain-view": /\bmountain[- ]?views?\b/gi,
  "ev-charger": /\b(?:ev[- ]charger|ev[- ]charging)\b/gi,
};

export const TAG_WORDS: Record<Tag, RegExp> = {
  quiet: /\b(?:quiet|peaceful|calm|tranquil|serene)\b/gi,
  cozy: /\b(?:cozy|cosy|warm)\b/gi,
  secluded: /\b(?:secluded|remote|isolated|off[- ]grid|hideaway)\b/gi,
  romantic: /\b(?:romantic|couples?)\b/gi,
  family: /\b(?:family|kids?)\b/gi,
  luxury: /\b(?:luxury|luxurious|upscale)\b/gi,
  modern: /\b(?:modern|contemporary)\b/gi,
};

export const PETS = /\b(?:pet[- ]?friendly|dog[- ]?friendly|pets?|dogs?|cats?)\b/gi;
const PRICE = /\b(?:under|below|less than|up to|max(?:imum)?|within)\s*\$?\s*(\d{2,5})\b|\$\s*(\d{2,5})\s*(?:or less|max)\b/i;
const GUESTS = [
  /\b(\d{1,2})\s*(?:guests?|people|persons?|adults?)\b/i,
  /\b(?:for|sleeps?|fits?)\s+(\d{1,2})\b(?!\s*(?:nights?|\$))/i,
];

export const STATES: Record<string, string> = {
  CA: "California",
  CO: "Colorado",
  FL: "Florida",
  HI: "Hawaii",
  IL: "Illinois",
  LA: "Louisiana",
  MT: "Montana",
  NC: "North Carolina",
  NY: "New York",
  OR: "Oregon",
  TN: "Tennessee",
  TX: "Texas",
  WA: "Washington",
};

// Every city a stay is in today. A place filter can only match a city or state listed here.
export const CITIES = [
  "Asheville", "Aspen", "Austin", "Bend", "Big Bear Lake", "Brooklyn", "Cannon Beach", "Chicago", "Destin",
  "Fredericksburg", "Gatlinburg", "Healdsburg", "Kailua-Kona", "Lake Arrowhead", "Los Angeles", "Malibu", "Miami",
  "Monte Rio", "Nags Head", "Napa", "New Orleans", "New York", "Paia", "Palm Springs", "San Diego", "Santa Barbara",
  "Santa Cruz", "Seattle", "Truckee", "Whitefish",
];

const STOPWORDS = new Set(
  "a an the in on at by for with and or of to me my i we want need find show looking stay stays place places home house under below near around night per nice great good".split(" "),
);

// Cities first, so "New York" the city wins over "New York" the state.
const PLACES = [...new Set([...CITIES, ...Object.values(STATES)])];

/** What a place name filters on: a city, or else a state code. */
export function placeTarget(place: string): { city: string } | { state: string } {
  const city = CITIES.find((c) => c.toLowerCase() === place.toLowerCase());
  if (city) return { city };
  const state = Object.entries(STATES).find(([, name]) => name.toLowerCase() === place.toLowerCase())?.[0];
  return { state: state ?? place };
}

export const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const matches = (text: string, re: RegExp) => text.match(re) ?? [];

/** The known city or state a sentence mentions, with the exact words that named it. */
export function placeFilter(text: string) {
  for (const name of PLACES) {
    const m = text.match(new RegExp(`(?:\\b(?:in|near|around)\\s+)?\\b${escape(name)}\\b`, "i"));
    if (m) return { name, span: m[0] };
  }
  return undefined;
}

export function parseQuery(text: string): ParsedQuery {
  const filters: Filter[] = [];
  const parsed: ParsedQuery = { filters, pets: false, amenities: [], tags: [], keywords: [] };
  const claimed: string[] = [];

  const price = text.match(PRICE);
  if (price) {
    parsed.maxPrice = Number(price[1] ?? price[2]);
    filters.push({ key: "price", label: `Under $${parsed.maxPrice}`, hard: true, spans: [price[0]] });
    claimed.push(price[0]);
  }

  for (const re of GUESTS) {
    const m = text.match(re);
    if (m) {
      parsed.guests = Number(m[1]);
      filters.push({ key: "guests", label: `${parsed.guests}+ guests`, hard: true, spans: [m[0]] });
      claimed.push(m[0]);
      break;
    }
  }

  for (const [category, re] of Object.entries(CATEGORY_WORDS) as [Category, RegExp][]) {
    const found = matches(text, re);
    if (found.length) {
      parsed.category ??= category;
      if (parsed.category === category) {
        filters.push({ key: "category", label: CATEGORY_LABELS[category], hard: true, spans: found });
        claimed.push(...found);
      }
    }
  }

  const pets = matches(text, PETS);
  if (pets.length) {
    parsed.pets = true;
    filters.push({ key: "pets", label: "Pet Friendly", hard: true, spans: pets });
    claimed.push(...pets);
  }

  for (const [amenity, re] of Object.entries(AMENITY_WORDS) as [Amenity, RegExp][]) {
    const found = matches(text, re);
    if (found.length) {
      parsed.amenities.push(amenity);
      filters.push({ key: `amenity:${amenity}`, label: AMENITY_LABELS[amenity], hard: true, spans: found });
      claimed.push(...found);
    }
  }

  const place = placeFilter(text);
  if (place) {
    parsed.place = place.name;
    filters.push({ key: "place", label: place.name, hard: true, spans: [place.span] });
    claimed.push(place.span);
  }

  for (const [tag, re] of Object.entries(TAG_WORDS) as [Tag, RegExp][]) {
    const found = matches(text, re);
    if (found.length) {
      parsed.tags.push(tag);
      filters.push({ key: `tag:${tag}`, label: tag[0].toUpperCase() + tag.slice(1), hard: false, spans: found });
      claimed.push(...found);
    }
  }

  const rest = claimed.reduce((s, span) => s.replace(span, " "), text).toLowerCase();
  parsed.keywords = rest.split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
  return parsed;
}

/** Text without the pieces a filter came from, so removing a chip updates the search box too. */
export function removeFilter(text: string, filter: Pick<Filter, "spans">) {
  return filter.spans.reduce((s, span) => s.replace(span, " "), text).replace(/\s+/g, " ").trim();
}

export const SUGGESTED_QUERIES = [
  "quiet pet friendly cabin with hot tub under $300",
  "beach house with ocean view",
  "romantic villa with a pool",
  "city loft with a workspace under $250",
];
