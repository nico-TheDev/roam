import { and, asc, eq } from "drizzle-orm";
import { getUserId } from "@/lib/api-auth";
import { bookings, getDb } from "@/lib/db";
import { publicBooking } from "@/lib/booking-finalize";
import { json } from "@/lib/booking-server";

/** The signed-in guest's confirmed bookings, soonest first. Only rows for the verified user id. */
export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return json({ error: "Unauthorized" }, 401);
  const { db, pool } = getDb();
  try {
    const rows = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.clerkUserId, userId), eq(bookings.status, "confirmed")))
      .orderBy(asc(bookings.checkIn));
    return json({ bookings: rows.map(publicBooking) });
  } catch {
    return json({ error: "Could not load bookings" }, 502);
  } finally {
    await pool.end();
  }
}
