import { and, eq, sql } from "drizzle-orm";
import { bookingHolds, bookings, getDb } from "@/lib/db";
import { isTaken } from "@/lib/booking-server";
import { getStripe } from "@/lib/stripe-server";

type Db = ReturnType<typeof getDb>["db"];
export type BookingRow = typeof bookings.$inferSelect;

export type FinalizeResult =
  | { state: "confirmed"; booking: BookingRow }
  | { state: "pending" }
  | { state: "expired" }
  | { state: "failed" }
  | { state: "refunded" };

/** What the app may see of a booking. No payment intent id, no hold id. */
export const publicBooking = (b: BookingRow) => ({
  id: b.id,
  stayId: b.stayId,
  checkIn: b.checkIn,
  checkOut: b.checkOut,
  guests: b.guests,
  amountCents: b.amountCents,
  currency: b.currency,
  breakdown: b.breakdown,
  stay: b.staySnapshot,
  createdAt: b.createdAt.toISOString(),
});

/**
 * The only place a booking is created. Asks Stripe whether the payment really succeeded, then books inside
 * one transaction. Safe to call any number of times for the same payment (webhook, status polling, retries).
 */
export async function finalizePayment(db: Db, paymentIntentId: string): Promise<FinalizeResult> {
  const stripe = getStripe();
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  const [hold] = await db.select().from(bookingHolds).where(eq(bookingHolds.paymentIntentId, paymentIntentId)).limit(1);
  if (!hold) return { state: "failed" };

  const [already] = await db.select().from(bookings).where(eq(bookings.paymentIntentId, paymentIntentId)).limit(1);
  if (already) return { state: "confirmed", booking: already };

  if (intent.status !== "succeeded") {
    if (intent.status === "canceled") return { state: "failed" };
    return hold.expiresAt.getTime() < Date.now() && intent.status !== "processing" ? { state: "expired" } : { state: "pending" };
  }
  // Money moved but it isn't the amount we asked for: never book on it, leave it for a person to look at.
  if (intent.amount_received !== hold.amountCents || intent.currency !== hold.currency) {
    console.error("booking_amount_mismatch", { paymentIntentId, expected: hold.amountCents, received: intent.amount_received });
    return { state: "failed" };
  }

  const outcome = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${hold.stayId}))`);
    const [again] = await tx.select().from(bookings).where(eq(bookings.paymentIntentId, paymentIntentId)).limit(1);
    if (again) return { state: "confirmed" as const, booking: again };
    const [current] = await tx.select().from(bookingHolds).where(eq(bookingHolds.id, hold.id)).limit(1);
    if (current.status === "refunded") return { state: "refunded" as const };

    // An expired hold lost its protection. Take the dates back only if nobody else has them.
    if (await isTaken(tx as unknown as Db, hold.stayId, hold.checkIn, hold.checkOut, hold.id)) {
      await tx.update(bookingHolds).set({ status: "refunded" }).where(eq(bookingHolds.id, hold.id));
      return { state: "refunded" as const };
    }
    const { id: holdId, status: _s, expiresAt: _e, paymentIntentId: _p, ...fields } = current;
    const [booking] = await tx
      .insert(bookings)
      .values({ ...fields, holdId, paymentIntentId, status: "confirmed" })
      .returning();
    await tx.update(bookingHolds).set({ status: "converted" }).where(and(eq(bookingHolds.id, hold.id)));
    return { state: "confirmed" as const, booking };
  });

  if (outcome.state === "refunded") {
    // Idempotent key: calling this again after a failed refund is safe.
    await stripe.refunds.create({ payment_intent: paymentIntentId }, { idempotencyKey: `refund:${paymentIntentId}` });
  }
  return outcome;
}
