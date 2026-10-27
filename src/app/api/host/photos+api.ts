import { getUserId } from "@/lib/api-auth";
import { findHost, json, ownerKeyFor, serverError, uploadImage } from "@/lib/host-server";

// One photo per request: the raw image bytes as the body. Only hosts can upload, so the dataset's asset store
// isn't open to every signed-in guest. The asset id comes back; the stay is created with ids, never bytes.
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const type = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  if (!TYPES.includes(type)) return json({ error: "Unsupported image type" }, 415);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return json({ error: "Image too large" }, 413);

  try {
    const host = await findHost(await ownerKeyFor(userId));
    if (!host) return json({ error: "Not a host" }, 404);

    const bytes = await request.arrayBuffer();
    if (bytes.byteLength === 0) return json({ error: "Empty image" }, 400);
    if (bytes.byteLength > MAX_BYTES) return json({ error: "Image too large" }, 413);
    return json({ assetId: await uploadImage(bytes, type) }, 201);
  } catch (e) {
    return serverError(e);
  }
}
