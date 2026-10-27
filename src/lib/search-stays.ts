import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useState } from "react";
import { posthog } from "@/lib/posthog";
import { parseQuery } from "@/lib/search";
import type { SearchStay } from "@/lib/search-query";

// Search results from `src/app/api/search+api.ts`, which verifies the Clerk session and queries Sanity.
// Sorting happens on the device (`sortStays`), so changing the sort never sends a request or an event.

export type SearchSource = "results" | "suggestion" | "home" | "filter_removed";

type SearchResponse = { total: number; stays: SearchStay[]; semantic: boolean };
type FailureReason = "network" | "unauthorized" | "server";

class SearchError extends Error {
  constructor(readonly reason: FailureReason) {
    super(reason);
  }
}

export type SearchState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; total: number; stays: SearchStay[] };

async function fetchStays(query: string, token: string | null, signal: AbortSignal): Promise<SearchResponse> {
  let res: Response;
  try {
    res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
      body: JSON.stringify({ query }),
      signal,
    });
  } catch {
    throw new SearchError("network");
  }
  if (res.status === 401) throw new SearchError("unauthorized");
  if (!res.ok) throw new SearchError("server");
  try {
    return (await res.json()) as SearchResponse;
  } catch {
    throw new SearchError("server");
  }
}

/** Runs the search for `query` (empty means no search) and reports it to PostHog without sending what the guest typed. */
export function useSearchStays(query: string, source: SearchSource): SearchState {
  const { getToken } = useAuth();
  const [attempt, setAttempt] = useState(0);
  // The outcome remembers which request it belongs to, so a new query or retry is "loading" without setting state inside the effect.
  const key = `${attempt}|${query}`;
  const [outcome, setOutcome] = useState<{ key: string; data?: SearchResponse }>({ key: "" });
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    (async () => {
      try {
        const data = await fetchStays(query, await getToken(), controller.signal);
        if (controller.signal.aborted) return;
        const parsed = parseQuery(query);
        posthog?.capture("stay_search_completed", {
          outcome: data.total > 0 ? "results" : "no_results",
          result_count: data.total,
          filter_count: parsed.filters.length,
          filter_types: parsed.filters.map((f) => f.key),
          has_soft_intent: data.semantic,
          source,
        });
        setOutcome({ key, data });
      } catch (e) {
        if (controller.signal.aborted) return;
        posthog?.capture("stay_search_failed", { reason: e instanceof SearchError ? e.reason : "network" });
        setOutcome({ key });
      }
    })();
    return () => controller.abort();
    // `source` only labels the event and `getToken` may change identity, so neither may rerun the search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!query || outcome.key !== key) return { status: "loading" };
  return outcome.data ? { status: "ready", total: outcome.data.total, stays: outcome.data.stays } : { status: "error", retry };
}
