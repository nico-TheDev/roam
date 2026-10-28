import { guard } from "@/lib/rate-limit";
import { assetsAreImages, hashOf, json, ownerKeyFor, sanityMutate, sanityQuery, serverError, sharedPolicyIds, writeCopy } from "@/lib/host-server";
import { stayErrors, type StayField, type StayInput } from "@/lib/host-stay-rules";
import type { Facts } from "../../../../../studio/seed/check-copy";

// Published documents only: a draft id would let a host patch what Studio is still editing.
const STAY_ID = /^(?!drafts\.)[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/;

// Fields the host may change: every add-stay field, plus the pause switch. Rating, reviews, slug and host are never here.
const INPUT_KEYS: StayField[] = [
  "title", "category", "city", "state", "nightlyPrice", "cleaningFee", "minNights", "maxGuests", "bedrooms", "beds",
  "bathrooms", "petsAllowed", "checkInTime", "checkOutTime", "amenities", "vibeNotes", "photoIds", "cancellationPolicyId",
];
// The ones the generated summary, description and neighborhood are written from.
const COPY_KEYS: StayField[] = [
  "title", "category", "city", "state", "maxGuests", "bedrooms", "beds", "bathrooms", "petsAllowed", "amenities",
  "minNights", "checkInTime", "checkOutTime", "vibeNotes",
];

const ref = (_ref: string) => ({ _type: "reference", _ref });

const QUERY = `*[_type == "property" && _id == $id][0]{
  "ownerKey": host->ownerKey, "id": _id, "slug": slug.current, "listed": listed != false, copyFactsHash,
  title, category, "city": location.city, "state": location.state, nightlyPrice, cleaningFee, minNights, maxGuests,
  bedrooms, beds, bathrooms, petsAllowed, checkInTime, checkOutTime, amenities, vibeNotes,
  "photoIds": images[].asset._ref, "photoUrls": images[].asset->url, "cancellationPolicyId": cancellationPolicy._ref
}`;

type Stored = Record<string, unknown> & { ownerKey: string | null; photoUrls: (string | null)[] | null; copyFactsHash: string | null };

/** The stay if it exists and belongs to the caller; otherwise null, so not-yours and not-found look the same. */
async function loadOwned(userId: string, id: string): Promise<Stored | null> {
  if (!STAY_ID.test(id)) return null;
  const [ownerKey, stay] = await Promise.all([ownerKeyFor(userId), sanityQuery<Stored | null>(QUERY, { id })]);
  return stay && stay.ownerKey && stay.ownerKey === ownerKey ? stay : null;
}

const factsOf = (s: Record<string, unknown>): Facts => {
  const i = s as unknown as StayInput;
  return {
    title: i.title.trim(), category: i.category, city: i.city.trim(), state: i.state, maxGuests: i.maxGuests,
    bedrooms: i.bedrooms, beds: i.beds, bathrooms: i.bathrooms, petsAllowed: i.petsAllowed, amenities: i.amenities,
    minNights: i.minNights, checkInTime: i.checkInTime, checkOutTime: i.checkOutTime, vibeNotes: i.vibeNotes.map((n) => n.trim()),
  };
};

export async function GET(request: Request, { id }: { id: string }) {
  const auth = await guard(request, "hostRead");
  if ("response" in auth) return auth.response;
  const { userId } = auth;
  try {
    const stay = await loadOwned(userId, id);
    if (!stay) return json({ error: "Not found" }, 404);
    const { ownerKey: _owner, copyFactsHash: _hash, photoUrls, ...rest } = stay;
    // Fields a stay never had (older seeded stays) come back null; the screen marks them "Needs attention".
    return json({ ...rest, photoUrls: (photoUrls ?? []).map((u) => (u ? `${u}?w=400&q=80&auto=format` : null)) });
  } catch (e) {
    return serverError(e);
  }
}

export async function PATCH(request: Request, { id }: { id: string }) {
  const auth = await guard(request, "hostStayUpdate");
  if ("response" in auth) return auth.response;
  const { userId } = auth;
  if (!STAY_ID.test(id)) return json({ error: "Not found" }, 404);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid values" }, 400);
  const changes = body as Record<string, unknown>;
  const keys = Object.keys(changes);
  if (keys.length === 0 || keys.some((k) => k !== "listed" && !INPUT_KEYS.includes(k as StayField))) return json({ error: "Invalid values" }, 400);
  if ("listed" in changes && typeof changes.listed !== "boolean") return json({ error: "Invalid values" }, 400);
  const changedInput = keys.filter((k) => k !== "listed") as StayField[];

  try {
    const stay = await loadOwned(userId, id);
    if (!stay) return json({ error: "Not found" }, 404);

    const merged: Record<string, unknown> = {};
    for (const k of INPUT_KEYS) merged[k] = k in changes ? changes[k] : stay[k];

    // Only the fields being changed are held to the rules unless the copy is rewritten, so an older stay with, say,
    // four photos can still have its price changed. A rewrite needs a complete, valid stay.
    const mayRewrite = changedInput.some((k) => COPY_KEYS.includes(k));
    const errors = stayErrors(merged);
    const bad = Object.keys(errors).filter((k) => mayRewrite || changedInput.includes(k as StayField));
    if (bad.length) return json({ error: "incomplete", fields: bad }, 400);

    const set: Record<string, unknown> = {};
    if ("listed" in changes) set.listed = changes.listed;
    for (const k of ["nightlyPrice", "cleaningFee", "minNights", "maxGuests", "bedrooms", "beds", "bathrooms", "petsAllowed", "checkInTime", "checkOutTime", "amenities", "category"] as const) {
      if (k in changes) set[k] = changes[k];
    }
    if ("title" in changes) set.title = (changes.title as string).trim();
    if ("vibeNotes" in changes) set.vibeNotes = (changes.vibeNotes as string[]).map((n) => n.trim());
    if ("city" in changes) set["location.city"] = (changes.city as string).trim();
    if ("state" in changes) set["location.state"] = changes.state;

    if ("photoIds" in changes) {
      const photoIds = changes.photoIds as string[];
      if (!(await assetsAreImages(photoIds))) return json({ error: "Invalid values" }, 400);
      const title = (merged.title as string).trim();
      set.images = photoIds.map((assetId, i) => ({ _type: "image", _key: `photo-${i + 1}`, asset: ref(assetId), alt: `${title}, photo ${i + 1} of ${photoIds.length}` }));
    }
    if ("cancellationPolicyId" in changes) {
      const policy = await sanityQuery<string | null>(`*[_type == "policy" && _id == $id && kind == "cancellation"][0]._id`, { id: changes.cancellationPolicyId });
      if (!policy) return json({ error: "Invalid values" }, 400);
      set.cancellationPolicy = ref(policy);
    }

    let regenerated = false;
    if (mayRewrite) {
      const facts = factsOf(merged);
      const hash = await hashOf(facts);
      if (hash !== stay.copyFactsHash) {
        const written = await writeCopy(facts);
        if ("problems" in written) return json({ error: "Copy failed" }, 422);
        Object.assign(set, written.copy, { copyFactsHash: hash });
        regenerated = true;
      }
      if ("petsAllowed" in changes) {
        set.policies = (await sharedPolicyIds(changes.petsAllowed as boolean)).map((p) => ({ _key: p, ...ref(p) }));
      }
    }

    await sanityMutate([{ patch: { id, set } }]);
    return json({ id, fields: keys, regenerated, ...("listed" in changes ? { listed: changes.listed } : {}) });
  } catch (e) {
    return serverError(e);
  }
}
