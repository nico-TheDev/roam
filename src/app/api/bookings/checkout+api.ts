import { guard } from "@/lib/rate-limit";
import { createCheckout, fail, json, loadBookableStay, readBookingInput } from "@/lib/booking-server";

export async function POST(request: Request) {
  const auth = await guard(request, "checkout");
  if ("response" in auth) return auth.response;
  const { userId } = auth;
  const input = await readBookingInput(request);
  if (!input) return fail("invalid_request");

  try {
    const stay = await loadBookableStay(input.stayId);
    if (!stay) return fail("stay_not_found", 404);
    const result = await createCheckout(userId, input, stay);
    if (!result.ok) return fail(result.reason, result.reason === "unavailable" || result.reason === "paused" ? 409 : 400);
    const { ok: _ok, ...body } = result;
    return json(body);
  } catch {
    return json({ error: "Could not start checkout" }, 502);
  }
}
