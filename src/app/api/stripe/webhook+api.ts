import { and, eq } from "drizzle-orm";
import { bookingHolds, getDb, stripeEvents } from "@/lib/db";
import { finalizePayment } from "@/lib/booking-finalize";
import { cryptoProvider, getStripe } from "@/lib/stripe-server";

// No Clerk session here: Stripe calls this, and the Stripe-Signature on the raw body is the authentication.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret) return Response.json({ error: "Not configured" }, { status: 500 });
  if (!signature) return Response.json({ error: "Invalid signature" }, { status: 400 });

  const raw = await request.text();
  let event;
  try {
    event = await getStripe().webhooks.constructEventAsync(raw, signature, secret, undefined, cryptoProvider);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { db, pool } = getDb();
  try {
    const [seen] = await db.select().from(stripeEvents).where(eq(stripeEvents.eventId, event.id)).limit(1);
    if (seen) return Response.json({ received: true, duplicate: true });

    if (event.type === "payment_intent.succeeded") {
      await finalizePayment(db, event.data.object.id);
    } else if (event.type === "payment_intent.canceled") {
      await db
        .update(bookingHolds)
        .set({ status: "expired" })
        .where(and(eq(bookingHolds.paymentIntentId, event.data.object.id), eq(bookingHolds.status, "open")));
    }
    // payment_intent.payment_failed needs no change: the hold stays open so the guest can try another card.

    await db.insert(stripeEvents).values({ eventId: event.id, type: event.type }).onConflictDoNothing();
    return Response.json({ received: true });
  } catch (e) {
    console.error("stripe_webhook_failed", event.type, (e as Error).message);
    return Response.json({ error: "Processing failed" }, { status: 500 }); // Stripe retries
  } finally {
    await pool.end();
  }
}
