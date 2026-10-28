import { guard } from "@/lib/rate-limit";
import { json, sanityQuery, serverError } from "@/lib/host-server";

// The shared cancellation policies a host can pick for a new stay. Titles and summaries only; the full text is
// shown to guests on the stay itself.
export async function GET(request: Request) {
  const auth = await guard(request, "hostRead");
  if ("response" in auth) return auth.response;

  try {
    const policies = await sanityQuery<{ id: string; title: string; summary: string | null }[]>(
      `*[_type == "policy" && kind == "cancellation"] | order(refundWindowDays asc){ "id": _id, title, summary }`,
    );
    return json({ policies });
  } catch (e) {
    return serverError(e);
  }
}
