import { verifyToken } from "@clerk/backend";
import { parseQuery } from "@/lib/search";
import { buildSearchQuery, type SearchStay } from "@/lib/search-query";

const API_VERSION = "2026-02-01";
const MAX_QUERY_LENGTH = 200;

const json = (body: unknown, status = 200) => Response.json(body, { status });

async function isSignedIn(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!token || !secretKey) return false;
  try {
    await verifyToken(token, { secretKey });
    return true;
  } catch {
    return false;
  }
}

type RawStay = Omit<SearchStay, "imageUrl"> & { imageUrl: string | null };

export async function POST(request: Request) {
  if (!(await isSignedIn(request))) return json({ error: "Unauthorized" }, 401);

  const body = (await request.json().catch(() => null)) as { query?: unknown } | null;
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query || query.length > MAX_QUERY_LENGTH) {
    return json({ error: "Invalid search" }, 400);
  }

  const projectId = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.EXPO_PUBLIC_SANITY_DATASET;
  const sanityToken = process.env.SANITY_API_READ_TOKEN;
  if (!projectId || !dataset || !sanityToken) return json({ error: "Search is not configured" }, 500);

  const parsed = parseQuery(query);
  const { query: groq, params, semantic } = buildSearchQuery(parsed);

  const res = await fetch(
    `https://${projectId}.api.sanity.io/v${API_VERSION}/data/query/${dataset}?perspective=published`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sanityToken}` },
      body: JSON.stringify({ query: groq, params }),
    },
  );
  if (!res.ok) return json({ error: "Search failed" }, 502);

  const { result } = (await res.json()) as { result?: { total: number; stays: RawStay[] } };
  if (!result || !Array.isArray(result.stays)) return json({ error: "Search failed" }, 502);

  const stays = result.stays
    .filter((s) => s.imageUrl)
    .map((s) => ({ ...s, imageUrl: `${s.imageUrl}?w=1000&q=80&auto=format` }));
  return json({
    total: result.total,
    stays,
    filters: parsed.filters.map(({ key, label }) => ({ key, label })),
    semantic,
  });
}
