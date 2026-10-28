import { neon } from "@neondatabase/serverless";

// Server only. A global per-day cap on the calls that cost money (DeepSeek, Dataset Embeddings), counted in Neon
// with one atomic upsert like `rate-limit.ts`. Per-user limits stop one guest; this stops many accounts.

export const DAILY_BUDGET = {
  model_search: 500,
  semantic_search: 300,
  model_ask: 300,
} as const;

export type BudgetKind = keyof typeof DAILY_BUDGET;

const ENV_NAMES: Record<BudgetKind, string> = {
  model_search: "DAILY_BUDGET_MODEL_SEARCH",
  semantic_search: "DAILY_BUDGET_SEMANTIC_SEARCH",
  model_ask: "DAILY_BUDGET_MODEL_ASK",
};

function capFor(kind: BudgetKind) {
  const value = Number(process.env[ENV_NAMES[kind]]);
  return Number.isInteger(value) && value >= 0 ? value : DAILY_BUDGET[kind];
}

/** Counts one paid call for today (UTC). Returns false once the day's cap is used. Fails open so a database blip never blocks guests. */
export async function spendBudget(kind: BudgetKind, needed = true): Promise<boolean> {
  if (!needed) return false;
  const cap = capFor(kind);
  if (cap === 0) return false;
  const url = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;
  if (!url) return true;
  try {
    const sql = neon(url);
    const [row] = await sql`
      INSERT INTO daily_budget (day, kind, count)
      VALUES ((now() at time zone 'utc')::date, ${kind}, 1)
      ON CONFLICT (day, kind) DO UPDATE SET count = daily_budget.count + 1
      RETURNING count`;
    return row.count <= cap;
  } catch (e) {
    console.error("daily_budget_failed", (e as Error).message);
    return true;
  }
}
