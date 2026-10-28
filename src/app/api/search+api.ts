import { spendBudget } from "@/lib/daily-budget";
import { guard } from "@/lib/rate-limit";
import { buildSearchQuery } from "@/lib/search-query";
import { fallbackIntent } from "@/lib/search-intent";
import { queryContext, readSentence } from "@/lib/search-server";

const MAX_QUERY_LENGTH = 200;

const json = (body: unknown, status = 200) => Response.json(body, { status });

export async function POST(request: Request) {
  const auth = await guard(request, "search");
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as { query?: unknown } | null;
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query || query.length > MAX_QUERY_LENGTH) {
    return json({ error: "Invalid search" }, 400);
  }

  const endpoint = process.env.SANITY_CONTEXT_MCP_URL;
  const contextToken = process.env.SANITY_API_CONTEXT_TOKEN;
  if (!endpoint || !contextToken) return json({ error: "Search is not configured" }, 500);

  // Past the daily budget the regex reading and hard filters still work; only the paid calls are skipped.
  const intent = (await spendBudget("model_search")) ? await readSentence(query) : fallbackIntent(query);
  const rankByVibe = await spendBudget("semantic_search", intent.vibes.wanted.length > 0);
  const { query: groq, semantic } = buildSearchQuery(
    rankByVibe ? intent : { ...intent, vibes: { ...intent.vibes, wanted: [] } },
  );

  const result = await queryContext(endpoint, contextToken, groq).catch(() => undefined);
  if (!result) return json({ error: "Search failed" }, 502);

  const stays = result.stays
    .filter((s) => s.imageUrl)
    .map((s) => ({ ...s, imageUrl: `${s.imageUrl}?w=1000&q=80&auto=format` }));
  return json({ total: result.total, stays, filters: intent.filters, semantic, interpreter: intent.interpreter });
}
