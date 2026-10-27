import { getUserId } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { fail, isTaken, json, loadBookableStay, quoteFor, readBookingInput } from "@/lib/booking-server";

export async function POST(request: Request) {
  if (!(await getUserId(request))) return json({ error: "Unauthorized" }, 401);
  const input = await readBookingInput(request);
  if (!input) return fail("invalid_request");

  let stay;
  try {
    stay = await loadBookableStay(input.stayId);
  } catch {
    return json({ error: "Could not load the stay" }, 502);
  }
  if (!stay) return fail("stay_not_found", 404);

  const quote = quoteFor(input, stay);
  if (!quote.ok) return fail(quote.reason, quote.reason === "paused" ? 409 : 400);

  const { db, pool } = getDb();
  try {
    if (await isTaken(db, stay.id, input.checkIn, input.checkOut)) return fail("unavailable", 409);
  } finally {
    await pool.end();
  }
  return json({ stayId: stay.id, nights: quote.nights, currency: "usd", totalCents: quote.totalCents, breakdown: quote.breakdown });
}
