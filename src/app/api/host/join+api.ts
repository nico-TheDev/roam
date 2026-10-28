import { createClerkClient } from "@clerk/backend";
import { guard } from "@/lib/rate-limit";
import { findHost, json, ownerKeyFor, sanityMutate, serverError } from "@/lib/host-server";

const FALLBACK_NAME = "Host";

/** `maya-chen-3f9a1c`: lowercase words from the name plus a short random suffix, so slugs never collide. */
function slugFor(name: string) {
  const words = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  const suffix = Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${words || "host"}-${suffix}`;
}

/** Only the first name is used: this becomes the public host name guests see. */
async function publicName(userId: string) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return FALLBACK_NAME;
  try {
    const user = await createClerkClient({ secretKey }).users.getUser(userId);
    return user.firstName?.trim().slice(0, 40) || FALLBACK_NAME;
  } catch {
    return FALLBACK_NAME;
  }
}

export async function POST(request: Request) {
  const auth = await guard(request, "hostJoin");
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  try {
    const ownerKey = await ownerKeyFor(userId);
    const existing = await findHost(ownerKey);
    if (existing) return json({ hostId: existing.id });

    const name = await publicName(userId);
    const [createdId] = await sanityMutate([
      {
        create: {
          _type: "host",
          name,
          slug: { _type: "slug", current: slugFor(name) },
          isSuperhost: false,
          hostingSince: new Date().getFullYear(),
          ownerKey,
        },
      },
    ]);

    // Two taps can race. The oldest host wins; the other one removes itself.
    const winner = await findHost(ownerKey);
    if (winner && winner.id !== createdId) {
      await sanityMutate([{ delete: { id: createdId } }]);
      return json({ hostId: winner.id });
    }
    return json({ hostId: createdId });
  } catch (e) {
    return serverError(e);
  }
}
