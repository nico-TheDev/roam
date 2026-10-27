import { deepSeek } from "@ai-sdk/deepseek";
import { generateText, jsonSchema, Output } from "ai";

// Server-only: reads Roam's policies from the roam-policies Knowledge Base endpoint and lets DeepSeek choose which
// entries answer a question. Imported by `src/app/api/ask+api.ts` only, since it needs secret keys.
// DeepSeek only picks entry paths from a fixed list. The text a guest sees is the entry itself, word for word.

const MODEL_TIMEOUT_MS = 5000;
const CACHE_MS = 10 * 60 * 1000;
const READ_CHUNK = 20;
const MAX_PICKS = 3;

export type Policy = { path: string; title: string; description: string; text: string };
export type PolicyAnswer = { path: string; title: string; text: string; source: string };

type Rpc = { result?: { isError?: boolean; content?: { text?: string }[] } };

/** Calls a Knowledge Base tool through the endpoint (organization token) and returns its text. */
async function callKb(tool: string, args: Record<string, unknown>): Promise<string> {
  const endpoint = process.env.SANITY_CONTEXT_KB_URL;
  const token = process.env.SANITY_API_CONTEXT_TOKEN;
  if (!endpoint || !token) throw new Error("Policies are not configured");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: tool, arguments: args } }),
  });
  if (!res.ok) throw new Error(`Policies endpoint returned ${res.status}`);
  const rpc = (await res.json().catch(() => null)) as Rpc | null;
  const text = rpc?.result?.content?.[0]?.text;
  if (!text || rpc?.result?.isError) throw new Error("Policies endpoint returned no content");
  return text;
}

/** `# Title`, one description paragraph, then the body and the footnote definitions. Footnote markers are removed, nothing else. */
export function parseEntry(path: string, raw: string): Policy | undefined {
  const match = raw.trim().match(/^# (.+)\n+([^\n]+)\n+([\s\S]+)$/);
  if (!match) return undefined;
  const [, title, description, rest] = match;
  const text = rest
    .split("\n")
    .filter((line) => !/^\[\^[\w-]+\]:/.test(line))
    .join("\n")
    .replace(/[ \t]*\[\^[\w-]+\]/g, "")
    // Markdown symbols are not words: headings become their own line, bold and list markers lose their symbol.
    .replace(/^#{2,6} +/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^[-*] +/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text ? { path, title: title.trim(), description: description.trim(), text } : undefined;
}

async function loadFromEndpoint(): Promise<Policy[]> {
  const outline = await callKb("initial_context", {});
  const knowledgeBase = outline.match(/Knowledge base id: `([^`]+)`/)?.[1];
  const paths = [...outline.matchAll(/^([\w/-]+) \[\w+\]\s*$/gm)].map((m) => m[1]);
  if (!knowledgeBase || !paths.length) throw new Error("Policies outline is empty");

  const policies: Policy[] = [];
  for (let i = 0; i < paths.length; i += READ_CHUNK) {
    const chunk = paths.slice(i, i + READ_CHUNK);
    const entries = (await callKb("knowledge_base_read", { knowledgeBase, paths: chunk })).split(/\n---\n/);
    if (entries.length !== chunk.length) throw new Error("Policies entries did not match the outline");
    chunk.forEach((path, n) => {
      const policy = parseEntry(path, entries[n]);
      if (policy) policies.push(policy);
      else console.warn(`[ask] skipped policy entry "${path}": unexpected shape`);
    });
  }
  if (!policies.length) throw new Error("No policy entries could be read");
  return policies;
}

let cache: { at: number; policies: Promise<Policy[]> } | undefined;

/** Every policy entry, loaded once and kept for 10 minutes. Concurrent callers share one load. */
export function loadPolicies(): Promise<Policy[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.policies;
  const policies = loadFromEndpoint();
  const entry = { at: Date.now(), policies };
  cache = entry;
  policies.catch(() => {
    if (cache === entry) cache = undefined;
  });
  return policies;
}

type Picks = { paths: string[] };

function picksSchema(paths: string[]) {
  return jsonSchema<Picks>(
    {
      type: "object",
      properties: { paths: { type: "array", items: { type: "string", enum: paths }, maxItems: MAX_PICKS } },
      required: ["paths"],
      additionalProperties: false,
    },
    {
      validate: (value) => {
        const list = (value as { paths?: unknown } | null)?.paths;
        const ok =
          Array.isArray(list) && list.length <= MAX_PICKS && list.every((p) => typeof p === "string" && paths.includes(p));
        return ok
          ? { success: true, value: { paths: [...new Set(list as string[])] } }
          : { success: false, error: new Error("Picks do not match the policy list") };
      },
    },
  );
}

const INSTRUCTIONS = [
  "You choose which of Roam's policy entries answer a guest's question.",
  "Return the paths of the entries whose description says they cover what the guest asks, at most three, most relevant first.",
  "Return an empty list if no entry covers it, for example a question about one specific stay's amenities, fees or times.",
  "Never answer the question yourself. Only return paths from the list.",
].join(" ");

/** DeepSeek labels which entries answer the question. Throws if the model fails, so the guest can retry. */
export async function pickPolicies(question: string, policies: Policy[]): Promise<PolicyAnswer[]> {
  const paths = policies.map((p) => p.path);
  const list = policies.map((p) => `- ${p.path} | ${p.title}: ${p.description}`).join("\n");
  const { output } = await generateText({
    model: deepSeek("deepseek-v4-flash"),
    output: Output.object({ schema: picksSchema(paths) }),
    instructions: INSTRUCTIONS,
    prompt: `Policy entries:\n${list}\n\nGuest question: ${JSON.stringify(question)}`,
    temperature: 0,
    abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
    providerOptions: { deepseek: { thinking: { type: "disabled" } } },
  });
  return output.paths.flatMap((path) => {
    const p = policies.find((x) => x.path === path);
    return p ? [{ path, title: p.title, text: p.text, source: `${p.title} · Roam policy` }] : [];
  });
}
