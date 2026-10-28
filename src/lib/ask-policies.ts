// "Ask about this stay": the topic chips, the fixed chat copy, and the call to `src/app/api/ask+api.ts`, which
// verifies the Clerk session and returns Roam's policy entries word for word with their source.

export type Answer = { path: string; title: string; text: string; source: string };

export type AskFailure = "network" | "unauthorized" | "rate_limited" | "busy" | "server";

export class AskError extends Error {
  constructor(readonly reason: AskFailure) {
    super(reason);
  }
}

/** Chips send their question through the same route as a typed one. */
export const topics: { label: string; question: string }[] = [
  { label: "Cancellation", question: "What is the cancellation policy?" },
  { label: "House rules", question: "What are the house rules?" },
  { label: "Pets", question: "Can I bring my pet?" },
  { label: "Check-in", question: "How does check-in work?" },
  { label: "Payments", question: "How do payments work?" },
  { label: "Safety", question: "What safety features does this stay have?" },
];

export const greeting =
  "Pick a topic or type a question. Answers come word for word from Roam's policies.";

export const noMatch: Answer = {
  path: "none",
  title: "No answer found",
  text: "Nothing in Roam's policies answers that. Contact Roam support and we'll help.",
  source: "Roam support",
};

export const busyMessage = "Roam is busy today. Try again tomorrow.";

export async function askPolicies(question: string, token: string | null, signal: AbortSignal): Promise<Answer[]> {
  let res: Response;
  try {
    res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
      body: JSON.stringify({ question }),
      signal,
    });
  } catch {
    throw new AskError("network");
  }
  if (res.status === 401) throw new AskError("unauthorized");
  if (res.status === 429) throw new AskError("rate_limited");
  if (res.status === 503) throw new AskError("busy");
  if (!res.ok) throw new AskError("server");
  try {
    const { answers } = (await res.json()) as { answers: Answer[] };
    return Array.isArray(answers) ? answers : [];
  } catch {
    throw new AskError("server");
  }
}
