import { and, eq } from "drizzle-orm";
import { guard } from "@/lib/rate-limit";
import { bookingHolds, bookings, getDb } from "@/lib/db";
import { finalizePayment, publicBooking } from "@/lib/booking-finalize";
import { json } from "@/lib/booking-server";

// Polled by the app after the payment sheet closes. The webhook normally books first; if it's late,
// this asks Stripe itself, so a paid guest is never stranded. The client never creates a booking.
export async function GET(request: Request) {
  const auth = await guard(request, "status");
  if ("response" in auth) return auth.response;
  const { userId } = auth;
  const holdId = new URL(request.url).searchParams.get("holdId") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(holdId)) return json({ error: "invalid_request" }, 400);

  const { db, pool } = getDb();
  try {
    const [hold] = await db
      .select()
      .from(bookingHolds)
      .where(and(eq(bookingHolds.id, holdId), eq(bookingHolds.clerkUserId, userId)))
      .limit(1);
    if (!hold) return json({ error: "not_found" }, 404);

    const [booking] = await db.select().from(bookings).where(eq(bookings.holdId, hold.id)).limit(1);
    if (booking) return json({ status: "confirmed", booking: publicBooking(booking) });
    if (!hold.paymentIntentId) return json({ status: hold.expiresAt.getTime() < Date.now() ? "expired" : "pending" });

    const result = await finalizePayment(db, hold.paymentIntentId);
    return json(result.state === "confirmed" ? { status: "confirmed", booking: publicBooking(result.booking) } : { status: result.state });
  } catch {
    return json({ error: "Could not check the booking" }, 502);
  } finally {
    await pool.end();
  }
}
