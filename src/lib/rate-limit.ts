import { neon } from "@neondatabase/serverless";
import { getUserId } from "@/lib/api-auth";

// Server only. Fixed 60 s window counted in Neon (Workers isolates share no memory), one atomic upsert per request.
// Keys are hashed, so the table never holds a user id or an address.

export const WINDOW_SECONDS = 60;

/** Requests per window, per signed-in user per route. `unauth` is per address for requests with no valid session. */
export const LIMITS = {
  search: 20,
  ask: 15,
  quote: 30,
  checkout: 10,
  status: 90,
  availability: 60,
  bookings: 60,
  hostJoin: 5,
  hostStaysCreate: 5,
  hostStayUpdate: 20,
  hostPhotos: 40,
  hostRead: 60,
  unauth: 30,
} as const;

export type LimitName = keyof typeof LIMITS;

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function clientAddress(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Counts this request. Returns the seconds to wait when over the limit. Fails open so a database blip never locks guests out. */
export async function checkRateLimit(name: LimitName, subject: string): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const url = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;
  if (!url) return { ok: true };
  try {
    const sql = neon(url);
    const key = `${name}:${await sha256(subject)}`;
    const [row] = await sql`
      INSERT INTO rate_limits (key, window_start, count)
      VALUES (${key}, to_timestamp(floor(extract(epoch from now()) / ${WINDOW_SECONDS}) * ${WINDOW_SECONDS}), 1)
      ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
      RETURNING count, ceil(extract(epoch from window_start) + ${WINDOW_SECONDS} - extract(epoch from now()))::int AS retry_after`;
    if (Math.random() < 0.01) {
      await sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 hour'`.catch(() => {});
    }
    if (row.count > LIMITS[name]) return { ok: false, retryAfter: Math.max(1, row.retry_after) };
    return { ok: true };
  } catch (e) {
    console.error("rate_limit_failed", (e as Error).message);
    return { ok: true };
  }
}

function tooMany(retryAfter: number) {
  return Response.json({ error: "rate_limited", retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
}

/**
 * First line of every route: verifies the Clerk session, then counts the call.
 * A missing session is counted per address and answered 401 (or 429 when that address is spamming).
 */
export async function guard(request: Request, name: LimitName): Promise<{ userId: string } | { response: Response }> {
  const userId = await getUserId(request);
  if (!userId) {
    const limit = await checkRateLimit("unauth", `ip:${clientAddress(request)}`);
    return { response: limit.ok ? Response.json({ error: "Unauthorized" }, { status: 401 }) : tooMany(limit.retryAfter) };
  }
  const limit = await checkRateLimit(name, `u:${userId}`);
  return limit.ok ? { userId } : { response: tooMany(limit.retryAfter) };
}
