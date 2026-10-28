import { guard } from "@/lib/rate-limit";
import { findHost, assetsAreImages, hashOf, json, ownerKeyFor, sanityMutate, sanityQuery, serverError, sharedPolicyIds, writeCopy } from "@/lib/host-server";
import { slugFor, STAY_LIMITS, stayErrors, type StayInput } from "@/lib/host-stay-rules";
import type { Facts } from "../../../../studio/seed/check-copy";

// The stays whose host is owned by the signed-in user. The owner key comes from the verified token, never the request.
const QUERY = `*[_type == "property" && host->ownerKey == $ownerKey] | order(title asc){
  "id": _id, title, category, rating, reviewCount, nightlyPrice, cleaningFee, "listed": listed != false,
  "city": location.city, "state": location.state, "imageUrl": images[0].asset->url
}`;

type Row = { imageUrl: string | null; cleaningFee: number | null } & Record<string, unknown>;

export async function GET(request: Request) {
  const auth = await guard(request, "hostRead");
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  try {
    const ownerKey = await ownerKeyFor(userId);
    const [host, rows] = await Promise.all([findHost(ownerKey), sanityQuery<Row[]>(QUERY, { ownerKey })]);
    const stays = rows.map((s) => ({
      ...s,
      cleaningFee: s.cleaningFee ?? 0,
      imageUrl: s.imageUrl ? `${s.imageUrl}?w=800&q=80&auto=format` : null,
    }));
    return json({ isHost: !!host, stays });
  } catch (e) {
    return serverError(e);
  }
}

const ref = (_ref: string) => ({ _type: "reference", _ref });

/**
 * Creates a published stay for the caller's host. The host comes from the verified token, never the body; the three
 * texts are generated and checked here (same prompt and checker as the seed) and nothing is written if they fail.
 */
export async function POST(request: Request) {
  const auth = await guard(request, "hostStaysCreate");
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const body = await request.json().catch(() => null);
  if (Object.keys(stayErrors(body)).length) return json({ error: "Invalid values" }, 400);
  const input = body as StayInput;
  const title = input.title.trim();
  const city = input.city.trim();
  const vibeNotes = input.vibeNotes.map((n) => n.trim());

  try {
    const ownerKey = await ownerKeyFor(userId);
    const host = await findHost(ownerKey);
    if (!host) return json({ error: "Not a host" }, 404);

    const [count, images, policy] = await Promise.all([
      sanityQuery<number>(`count(*[_type == "property" && host._ref == $hostId])`, { hostId: host.id }),
      assetsAreImages(input.photoIds),
      sanityQuery<string | null>(`*[_type == "policy" && _id == $id && kind == "cancellation"][0]._id`, { id: input.cancellationPolicyId }),
    ]);
    if (count >= STAY_LIMITS.staysPerHost) return json({ error: "Too many stays" }, 409);
    if (!images || !policy) return json({ error: "Invalid values" }, 400);

    const facts: Facts = {
      title, category: input.category, city, state: input.state, maxGuests: input.maxGuests, bedrooms: input.bedrooms,
      beds: input.beds, bathrooms: input.bathrooms, petsAllowed: input.petsAllowed, amenities: input.amenities,
      minNights: input.minNights, checkInTime: input.checkInTime, checkOutTime: input.checkOutTime, vibeNotes,
    };
    const written = await writeCopy(facts);
    if ("problems" in written) return json({ error: "Copy failed" }, 422);

    const random = Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => b.toString(16).padStart(2, "0")).join("");
    const policies = await sharedPolicyIds(input.petsAllowed);
    const [id] = await sanityMutate([
      {
        create: {
          _type: "property",
          title,
          slug: { _type: "slug", current: slugFor(title, random) },
          images: input.photoIds.map((assetId, i) => ({
            _type: "image",
            _key: `photo-${i + 1}`,
            asset: ref(assetId),
            alt: `${title}, photo ${i + 1} of ${input.photoIds.length}`,
          })),
          rating: 0,
          reviewCount: 0,
          category: input.category,
          location: { city, state: input.state, country: "US" },
          nightlyPrice: input.nightlyPrice,
          cleaningFee: input.cleaningFee,
          minNights: input.minNights,
          maxGuests: input.maxGuests,
          bedrooms: input.bedrooms,
          beds: input.beds,
          bathrooms: input.bathrooms,
          petsAllowed: input.petsAllowed,
          amenities: input.amenities,
          checkInTime: input.checkInTime,
          checkOutTime: input.checkOutTime,
          vibeNotes,
          ...written.copy,
          copyFactsHash: await hashOf(facts),
          host: ref(host.id),
          cancellationPolicy: ref(input.cancellationPolicyId),
          policies: policies.map((p) => ({ _key: p, ...ref(p) })),
        },
      },
    ]);
    return json({ id }, 201);
  } catch (e) {
    return serverError(e);
  }
}
