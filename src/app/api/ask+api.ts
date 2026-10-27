import { getUserId } from "@/lib/api-auth";
import { loadPolicies, pickPolicies } from "@/lib/ask-server";

const MAX_QUESTION_LENGTH = 300;

const json = (body: unknown, status = 200) => Response.json(body, { status });

export async function POST(request: Request) {
  if (!(await getUserId(request))) return json({ error: "Unauthorized" }, 401);

  const body = (await request.json().catch(() => null)) as { question?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > MAX_QUESTION_LENGTH) return json({ error: "Invalid question" }, 400);

  if (!process.env.SANITY_CONTEXT_KB_URL || !process.env.SANITY_API_CONTEXT_TOKEN || !process.env.DEEPSEEK_API_KEY) {
    return json({ error: "Policies are not configured" }, 500);
  }

  try {
    const policies = await loadPolicies();
    return json({ answers: await pickPolicies(question, policies) });
  } catch {
    return json({ error: "Could not check the policies" }, 502);
  }
}
