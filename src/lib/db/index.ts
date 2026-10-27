import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// Server only (API routes and scripts). A pool over WebSocket gives real transactions,
// which the booking rules need (advisory lock + overlap check + insert).
export function getDb() {
  const url = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Add it to .env and restart the dev server (.env is read at startup; `expo serve` and EAS Hosting don't read it at all).");
  const pool = new Pool({ connectionString: url });
  return { db: drizzle(pool, { schema }), pool };
}
export * from "./schema";
