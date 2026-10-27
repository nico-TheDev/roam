import { deepSeek } from "@ai-sdk/deepseek";
import { generateText, Output } from "ai";
import {
  fallbackIntent,
  findCandidates,
  intentWithoutModel,
  READING_INSTRUCTIONS,
  readingPrompt,
  readingSchema,
  toIntent,
  type SearchIntent,
} from "@/lib/search-intent";
import type { SearchStay } from "@/lib/search-query";

// Server-only: reads the sentence with DeepSeek and runs the query through the roam-search Context endpoint.
// Imported by `src/app/api/search+api.ts` only, since it needs secret keys.

const MODEL_TIMEOUT_MS = 5000;

type RawStay = Omit<SearchStay, "imageUrl"> & { imageUrl: string | null };

/** The model labels what code found. If it fails for any reason, the regex reading keeps the search working. */
export async function readSentence(text: string): Promise<SearchIntent> {
  const sheet = findCandidates(text);
  const withoutModel = intentWithoutModel(sheet);
  if (withoutModel) return withoutModel;
  try {
    const { output } = await generateText({
      model: deepSeek("deepseek-v4-flash"),
      output: Output.object({ schema: readingSchema(sheet) }),
      instructions: READING_INSTRUCTIONS,
      prompt: readingPrompt(sheet),
      temperature: 0,
      abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
      providerOptions: { deepseek: { thinking: { type: "disabled" } } },
    });
    return toIntent(sheet, output);
  } catch {
    return fallbackIntent(text);
  }
}

/** Runs a GROQ query through the roam-search Context endpoint (organization token, `groq_query` tool). */
export async function queryContext(endpoint: string, token: string, query: string) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "groq_query", arguments: { query } } }),
  });
  if (!res.ok) return undefined;
  const rpc = (await res.json().catch(() => null)) as { result?: { isError?: boolean; content?: { text?: string }[] } } | null;
  const text = rpc?.result?.content?.[0]?.text;
  if (!text || rpc?.result?.isError) return undefined;
  try {
    const { result } = JSON.parse(text) as { result?: { total: number; stays: RawStay[] } };
    return result && Array.isArray(result.stays) ? result : undefined;
  } catch {
    return undefined;
  }
}
