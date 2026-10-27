import { Amenity, Category, Property, Tag, properties } from "@/data/properties";

// Local stand-in for Sanity (exact constraints as filters, soft intent as ranking). Pure functions, no React.
// Prices and guest counts are parsed here in code.

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
};

const CATEGORY_WORDS: Record<Category, RegExp> = {
  cabin: /\b(?:cabins?|a-frames?|lodges?|chalets?)\b/gi,
  beach: /\b(?:beach(?:es|front)?|oceanfront|seaside|coastal)\b/gi,
  city: /\b(?:city|downtown|apartments?|lofts?|condos?|urban)\b/gi,
  villa: /\b(?:villas?|mansions?|estates?)\b/gi,
};

const AMENITY_WORDS: Record<Amenity, RegExp> = {
  "hot-tub": /\b(?:hot[- ]?tubs?|jacuzzi|spa)\b/gi,
  pool: /\b(?:pools?|swimming)\b/gi,
  fireplace: /\b(?:fireplaces?|wood[- ]?stove)\b/gi,
  "ocean-view": /\b(?:ocean[- ]?views?|sea[- ]?views?)\b/gi,
  wifi: /\b(?:wi-?fi|internet)\b/gi,
  workspace: /\b(?:workspace|work[- ]from[- ]home|desk)\b/gi,
};

const TAG_WORDS: Record<Tag, RegExp> = {
  quiet: /\b(?:quiet|peaceful|calm|tranquil|serene)\b/gi,
  cozy: /\b(?:cozy|cosy|warm)\b/gi,
  secluded: /\b(?:secluded|remote|isolated|off[- ]grid|hideaway)\b/gi,
  romantic: /\b(?:romantic|couples?)\b/gi,
  family: /\b(?:family|kids?)\b/gi,
  luxury: /\b(?:luxury|luxurious|upscale)\b/gi,
  modern: /\b(?:modern|contemporary)\b/gi,
};

const PETS = /\b(?:pet[- ]?friendly|dog[- ]?friendly|pets?|dogs?|cats?)\b/gi;
const PRICE = /\b(?:under|below|less than|up to|max(?:imum)?|within)\s*\$?\s*(\d{2,5})\b|\$\s*(\d{2,5})\s*(?:or less|max)\b/i;
const GUESTS = [
  /\b(\d{1,2})\s*(?:guests?|people|persons?|adults?)\b/i,
  /\b(?:for|sleeps?|fits?)\s+(\d{1,2})\b(?!\s*(?:nights?|\$))/i,
];

const STATES: Record<string, string> = {
  CA: "California",
  CO: "Colorado",
  FL: "Florida",
  HI: "Hawaii",
  NY: "New York",
  OR: "Oregon",
  TX: "Texas",
  WA: "Washington",
};

const STOPWORDS = new Set(
  "a an the in on at by for with and or of to me my i we want need find show looking stay stays place places home house under below near around night per nice great good".split(" "),
);

// Place names come from the data (cities) plus the state names, so a place filter can only match what exists.
const PLACES = [...new Set([...properties.map((p) => p.city), ...Object.values(STATES)])];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const matches = (text: string, re: RegExp) => text.match(re) ?? [];

function placeFilter(text: string) {
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
export function removeFilter(text: string, filter: Filter) {
  return filter.spans.reduce((s, span) => s.replace(span, " "), text).replace(/\s+/g, " ").trim();
}

function inPlace(p: Property, place: string) {
  return p.city.toLowerCase() === place.toLowerCase() || STATES[p.state]?.toLowerCase() === place.toLowerCase();
}

/** Hard constraints filter, soft intent and leftover words rank, rating breaks ties. */
export function searchProperties(parsed: ParsedQuery): Property[] {
  return properties
    .filter(
      (p) =>
        (parsed.maxPrice === undefined || p.price <= parsed.maxPrice) &&
        (parsed.guests === undefined || p.maxGuests >= parsed.guests) &&
        (!parsed.pets || p.petFriendly) &&
        (!parsed.category || p.category === parsed.category) &&
        (!parsed.place || inPlace(p, parsed.place)) &&
        parsed.amenities.every((a) => p.amenities.includes(a)),
    )
    .map((p) => {
      const haystack = `${p.title} ${p.city} ${STATES[p.state] ?? ""} ${CATEGORY_LABELS[p.category]}`.toLowerCase();
      const hits = parsed.keywords.filter((k) => haystack.includes(k)).length;
      const score = parsed.tags.filter((t) => p.tags.includes(t)).length * 2 + hits + p.rating / 10;
      return { p, hits, score };
    })
    // With nothing recognized, leftover words are all there is to go on, so they have to match.
    .filter(({ hits }) => parsed.filters.length > 0 || parsed.keywords.length === 0 || hits > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ p }) => p);
}

export const SUGGESTED_QUERIES = [
  "quiet pet friendly cabin with hot tub under $300",
  "beach house with ocean view",
  "romantic villa with a pool",
  "city loft with a workspace under $250",
];
