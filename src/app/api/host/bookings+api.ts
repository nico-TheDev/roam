import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { getUserId } from "@/lib/api-auth";
import { toDay } from "@/lib/booking-rules";
import { bookings, getDb } from "@/lib/db";
import { json, ownerKeyFor, sanityQuery, serverError } from "@/lib/host-server";

// Upcoming confirmed bookings on the stays this user hosts. Stay ids come from Sanity through the owner key; the
// response carries dates, guests and what the guest paid, never anything about the guest.
export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return json({ error: "Unauthorized" }, 401);

  try {
    const ownerKey = await ownerKeyFor(userId);
    const stayIds = await sanityQuery<string[]>(`*[_type == "property" && host->ownerKey == $ownerKey]._id`, { ownerKey });
    if (stayIds.length === 0) return json({ bookings: [] });

    const { db, pool } = getDb();
    try {
      const rows = await db
        .select({
          id: bookings.id,
          stayId: bookings.stayId,
          checkIn: bookings.checkIn,
          checkOut: bookings.checkOut,
          guests: bookings.guests,
          amountCents: bookings.amountCents,
        })
        .from(bookings)
        .where(and(inArray(bookings.stayId, stayIds), eq(bookings.status, "confirmed"), gte(bookings.checkOut, toDay(Date.now()))))
        .orderBy(asc(bookings.checkIn));
      return json({ bookings: rows });
    } finally {
      await pool.end();
    }
  } catch (e) {
    return serverError(e);
  }
}
