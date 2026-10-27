// Server-only helpers for the host API routes (src/app/api/host/*). Never imported by the app bundle:
// they read SANITY_API_WRITE_TOKEN and HOST_OWNER_SECRET. Host data goes through the live Sanity API, not the CDN,
// so an ownership check can never read stale data.

import { checkCopy, type Copy, type Facts, type Problem } from "../../studio/seed/check-copy";
import { factSheet, hashOf, INSTRUCTION, problemsBlock } from "../../studio/seed/copy-prompt";

const PROJECT_ID = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.EXPO_PUBLIC_SANITY_DATASET;
const API_VERSION = "2026-02-01";

export type Mutation = Record<string, unknown>;

export const json = (body: unknown, status = 200) => Response.json(body, { status });

/** A missing variable is our fault (500); a failing Sanity call is upstream (502). Neither leaks details. */
export const serverError = (e: unknown) => {
  // The cause goes to the server log only (messages here carry a status code, never a token or user data).
  console.error("host api:", e instanceof Error ? e.message : "unknown error");
  return e instanceof Error && e.message === "Hosting is not configured"
    ? json({ error: "Hosting is not configured" }, 500)
    : json({ error: "Something went wrong. Try again." }, 502);
};

function sanityConfig() {
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!PROJECT_ID || !DATASET || !token) throw new Error("Hosting is not configured");
  return { base: `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data`, token };
}

/**
 * The value stored on `host.ownerKey`. The dataset is public, so the Clerk user id itself is never written to it:
 * this is an HMAC-SHA256 of the verified id with a server secret, which can't be reversed or matched to an account.
 */
export async function ownerKeyFor(userId: string): Promise<string> {
  const secret = process.env.HOST_OWNER_SECRET;
  if (!secret) throw new Error("Hosting is not configured");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(userId));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Runs a fixed GROQ query with real parameters (never string-built) against the published documents. */
export async function sanityQuery<T>(query: string, params: Record<string, unknown> = {}): Promise<T> {
  const { base, token } = sanityConfig();
  const res = await fetch(`${base}/query/${DATASET}?perspective=published`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, params }),
  });
  if (!res.ok) throw new Error(`Sanity responded ${res.status}`);
  return ((await res.json()) as { result: T }).result;
}

/** Applies mutations and returns the IDs Sanity generated or touched. Documents get Sanity-generated IDs. */
export async function sanityMutate(mutations: Mutation[]): Promise<string[]> {
  const { base, token } = sanityConfig();
  const res = await fetch(`${base}/mutate/${DATASET}?returnIds=true&visibility=sync`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ mutations }),
  });
  if (!res.ok) throw new Error(`Sanity responded ${res.status}`);
  return ((await res.json()) as { results: { id: string }[] }).results.map((r) => r.id);
}

export type HostRecord = { id: string; name: string };

/** The host owned by this key, or null. If a double tap ever created two, the oldest one wins. */
export async function findHost(ownerKey: string): Promise<HostRecord | null> {
  return sanityQuery<HostRecord | null>(
    `*[_type == "host" && ownerKey == $ownerKey] | order(_createdAt asc)[0]{ "id": _id, name }`,
    { ownerKey },
  );
}

// ---- Creating a stay ----

const AGENT_API_VERSION = "vX";
const SCHEMA_ID = "_.schemas.default";

/**
 * Asks Sanity's Agent Action (Generate, noWrite) for the three texts, from the fact sheet only. The prompt is shared
 * with studio/scripts/generate-copy.ts through studio/seed/copy-prompt.ts, so the rules are the same in both places.
 */
export async function generateCopy(facts: Facts, problems: Problem[]): Promise<Copy> {
  const { token } = sanityConfig();
  const res = await fetch(`https://${PROJECT_ID}.api.sanity.io/${AGENT_API_VERSION}/agent/action/generate/${DATASET}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      schemaId: SCHEMA_ID,
      // A new in-memory document with noWrite: nothing is stored, and the model sees no earlier copy.
      targetDocument: { operation: "create", _type: "property" },
      noWrite: true,
      instruction: INSTRUCTION,
      instructionParams: {
        facts: { type: "constant", value: factSheet(facts) },
        problems: { type: "constant", value: problemsBlock(problems) || "No earlier problems." },
      },
      target: { include: ["summary", "description", "neighborhood"] },
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`Sanity responded ${res.status}`);
  const out = (await res.json()) as Partial<Copy>;
  return { summary: out.summary ?? "", description: out.description ?? "", neighborhood: out.neighborhood ?? "" };
}

/** Writes copy that passes the checker, or returns the problems of the last attempt. Two attempts, like the script. */
export async function writeCopy(facts: Facts): Promise<{ copy: Copy } | { problems: Problem[] }> {
  let problems: Problem[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const copy = await generateCopy(facts, problems);
    problems = checkCopy(copy, facts).problems;
    if (!problems.length) return { copy };
  }
  return { problems };
}

export { hashOf };

/** Uploads one image to the dataset's assets and returns the asset id. Sanity detects the real type itself. */
export async function uploadImage(bytes: ArrayBuffer, contentType: string): Promise<string> {
  const { token } = sanityConfig();
  const res = await fetch(`https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/assets/images/${DATASET}`, {
    method: "POST",
    headers: { "content-type": contentType, authorization: `Bearer ${token}` },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Sanity responded ${res.status}`);
  return ((await res.json()) as { document: { _id: string } }).document._id;
}

/** True when every id is an existing image asset, so a stay can't reference something that isn't a photo. */
export async function assetsAreImages(ids: string[]): Promise<boolean> {
  const found = await sanityQuery<number>(`count(*[_type == "sanity.imageAsset" && _id in $ids])`, { ids });
  return found === ids.length;
}

/** The shared policies every new stay gets, as the seed attaches them. The pet policy only when pets are allowed. */
export async function sharedPolicyIds(pets: boolean): Promise<string[]> {
  const slugs = ["house-rules", ...(pets ? ["pet-policy"] : []), "check-in-and-check-out", "payments-and-fees", "safety-and-property"];
  const rows = await sanityQuery<{ id: string; slug: string }[]>(`*[_type == "policy" && slug.current in $slugs]{ "id": _id, "slug": slug.current }`, { slugs });
  const bySlug = new Map(rows.map((r) => [r.slug, r.id]));
  return slugs.flatMap((s) => (bySlug.has(s) ? [bySlug.get(s)!] : []));
}
