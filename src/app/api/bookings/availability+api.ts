import { and, eq, gt } from "drizzle-orm";
import { guard } from "@/lib/rate-limit";
import { bookingHolds, bookings, getDb } from "@/lib/db";
import { fail, json } from "@/lib/booking-server";
import { toDay } from "@/lib/booking-rules";

// Date ranges that can't be booked, for the calendar. No user data. The server checks again at checkout.
export async function GET(request: Request) {
  const auth = await guard(request, "availability");
  if ("response" in auth) return auth.response;
  const stayId = new URL(request.url).searchParams.get("stayId");
  if (!stayId || !/^[A-Za-z0-9_.-]{1,128}$/.test(stayId)) return fail("invalid_request");

  const today = toDay(Date.now() - 86_400_000);
  const { db, pool } = getDb();
  try {
    const [booked, held] = await Promise.all([
      db
        .select({ checkIn: bookings.checkIn, checkOut: bookings.checkOut })
        .from(bookings)
        .where(and(eq(bookings.stayId, stayId), eq(bookings.status, "confirmed"), gt(bookings.checkOut, today))),
      db
        .select({ checkIn: bookingHolds.checkIn, checkOut: bookingHolds.checkOut })
        .from(bookingHolds)
        .where(and(eq(bookingHolds.stayId, stayId), eq(bookingHolds.status, "open"), gt(bookingHolds.expiresAt, new Date()), gt(bookingHolds.checkOut, today))),
    ]);
    return json({ ranges: [...booked, ...held].sort((a, b) => a.checkIn.localeCompare(b.checkIn)) });
  } finally {
    await pool.end();
  }
}
