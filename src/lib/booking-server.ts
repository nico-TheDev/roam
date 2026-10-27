import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { bookingHolds, bookings, customers, getDb } from "@/lib/db";
import { getStripe } from "@/lib/stripe-server";
import {
  type BookingInput,
  type BookingReason,
  type StayTerms,
  priceStay,
  validateStay,
} from "@/lib/booking-rules";

type Db = ReturnType<typeof getDb>["db"];

export const json = (body: unknown, status = 200) => Response.json(body, { status });
export const fail = (reason: BookingReason, status = 400) => json({ error: reason, reason }, status);

const PROJECT_ID = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.EXPO_PUBLIC_SANITY_DATASET;
const STAY_ID = /^[A-Za-z0-9_.-]{1,128}$/;

export type BookableStay = StayTerms & {
  id: string;
  /** False when the host paused the stay. */
  listed: boolean;
  title: string;
  city: string;
  state: string;
  imageUrl: string | null;
  cancellationPolicy: { title: string; body: string } | null;
};

// The live API, not the CDN, so a cached price can never be charged. The dataset is public.
const QUERY = `*[_type == "property" && _id == $id][0]{
  "id": _id, title, "listed": listed != false, nightlyPrice, cleaningFee, minNights, maxGuests,
  "city": location.city, "state": location.state,
  "imageUrl": images[0].asset->url,
  "cancellationPolicy": cancellationPolicy->{ title, body }
}`;

export async function loadBookableStay(stayId: string): Promise<BookableStay | null> {
  if (!PROJECT_ID || !DATASET) throw new Error("Sanity is not configured");
  const url =
    `https://${PROJECT_ID}.api.sanity.io/v2026-02-01/data/query/${DATASET}` +
    `?query=${encodeURIComponent(QUERY)}&$id=${encodeURIComponent(JSON.stringify(stayId))}&perspective=published`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity responded ${res.status}`);
  const { result } = (await res.json()) as { result: (Omit<BookableStay, "cleaningFee" | "minNights"> & { cleaningFee: number | null; minNights: number | null }) | null };
  if (!result || !Number.isFinite(result.nightlyPrice)) return null;
  return {
    ...result,
    cleaningFee: result.cleaningFee ?? 0,
    minNights: result.minNights ?? 1,
    cancellationPolicy: result.cancellationPolicy?.title ? result.cancellationPolicy : null,
  };
}

/** The request body, checked for shape only. Dates and guests are validated against the stay afterwards. */
export async function readBookingInput(request: Request): Promise<BookingInput | null> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.stayId !== "string" || !STAY_ID.test(body.stayId)) return null;
  if (typeof body.checkIn !== "string" || typeof body.checkOut !== "string") return null;
  if (typeof body.guests !== "number") return null;
  return { stayId: body.stayId, checkIn: body.checkIn, checkOut: body.checkOut, guests: body.guests };
}

/** Confirmed bookings and holds still alive that overlap [checkIn, checkOut). Expired holds don't count. */
export async function isTaken(db: Db, stayId: string, checkIn: string, checkOut: string, ignoreHoldId?: string) {
  const overlap = (c: { checkIn: any; checkOut: any }) => and(lt(c.checkIn, checkOut), gt(c.checkOut, checkIn));
  const [booked] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.stayId, stayId), eq(bookings.status, "confirmed"), overlap(bookings)))
    .limit(1);
  if (booked) return true;
  const holds = await db
    .select({ id: bookingHolds.id })
    .from(bookingHolds)
    .where(
      and(eq(bookingHolds.stayId, stayId), eq(bookingHolds.status, "open"), gt(bookingHolds.expiresAt, new Date()), overlap(bookingHolds)),
    );
  return holds.some((h) => h.id !== ignoreHoldId);
}

/** Validates a request against the stay and prices it. The only place the price is decided. */
export function quoteFor(input: BookingInput, stay: BookableStay) {
  if (!stay.listed) return { ok: false as const, reason: "paused" as const };
  const check = validateStay(input, stay);
  if (!check.ok) return check;
  return { ok: true as const, nights: check.nights, ...priceStay(stay, check.nights) };
}

// ---- Checkout: hold the dates, then create the PaymentIntent ----

export const holdMinutes = () => Number(process.env.BOOKING_HOLD_MINUTES) || 15;

const isOverlapViolation = (e: unknown) => {
  const code = (e as { code?: string; cause?: { code?: string } })?.code ?? (e as { cause?: { code?: string } })?.cause?.code;
  return code === "23P01";
};

async function getStripeCustomer(db: Db, stripe: Stripe, userId: string) {
  const [existing] = await db.select().from(customers).where(eq(customers.clerkUserId, userId)).limit(1);
  if (existing) return existing.stripeCustomerId;
  const created = await stripe.customers.create(
    { metadata: { clerk_user_id: userId } },
    { idempotencyKey: `customer:${userId}` },
  );
  await db.insert(customers).values({ clerkUserId: userId, stripeCustomerId: created.id }).onConflictDoNothing();
  const [row] = await db.select().from(customers).where(eq(customers.clerkUserId, userId)).limit(1);
  return row.stripeCustomerId;
}

export type CheckoutResult =
  | { ok: true; holdId: string; clientSecret: string | null; paid: boolean; amountCents: number; expiresAt: string }
  | { ok: false; reason: BookingReason };

/** Re-validates, holds the dates under a per-stay lock, and creates (or reuses) the PaymentIntent. */
export async function createCheckout(userId: string, input: BookingInput, stay: BookableStay): Promise<CheckoutResult> {
  const quote = quoteFor(input, stay);
  if (!quote.ok) return { ok: false, reason: quote.reason };

  const stripe = getStripe();
  const { db, pool } = getDb();
  try {
    const { hold, released } = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${stay.id}))`);
      await tx
        .update(bookingHolds)
        .set({ status: "expired" })
        .where(and(eq(bookingHolds.stayId, stay.id), eq(bookingHolds.status, "open"), lt(bookingHolds.expiresAt, new Date())));

      const mine = await tx
        .select()
        .from(bookingHolds)
        .where(and(eq(bookingHolds.clerkUserId, userId), eq(bookingHolds.stayId, stay.id), eq(bookingHolds.status, "open")));
      const same = mine.find(
        (h) => h.checkIn === input.checkIn && h.checkOut === input.checkOut && h.guests === input.guests && h.amountCents === quote.totalCents,
      );
      if (same) return { hold: same, released: [] as string[] };

      // A different request from the same guest replaces their earlier hold.
      const others = mine.filter((h) => h !== same);
      if (others.length) {
        await tx.update(bookingHolds).set({ status: "expired" }).where(inArray(bookingHolds.id, others.map((h) => h.id)));
      }
      if (await isTaken(tx as unknown as Db, stay.id, input.checkIn, input.checkOut)) throw new Error("unavailable");

      const [created] = await tx
        .insert(bookingHolds)
        .values({
          clerkUserId: userId,
          stayId: stay.id,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          guests: input.guests,
          amountCents: quote.totalCents,
          breakdown: quote.breakdown,
          staySnapshot: {
            title: stay.title,
            city: stay.city,
            state: stay.state,
            imageUrl: stay.imageUrl,
            cancellationPolicy: stay.cancellationPolicy,
          },
          expiresAt: new Date(Date.now() + holdMinutes() * 60_000),
        })
        .returning();
      return { hold: created, released: others.flatMap((h) => (h.paymentIntentId ? [h.paymentIntentId] : [])) };
    });

    for (const id of released) await stripe.paymentIntents.cancel(id).catch(() => {});

    let intent: Stripe.PaymentIntent | null = null;
    if (hold.paymentIntentId) intent = await stripe.paymentIntents.retrieve(hold.paymentIntentId);
    if (intent && (intent.status === "succeeded" || intent.status === "processing")) {
      return { ok: true, holdId: hold.id, clientSecret: null, paid: true, amountCents: hold.amountCents, expiresAt: hold.expiresAt.toISOString() };
    }
    if (!intent || intent.status === "canceled") {
      const customer = await getStripeCustomer(db, stripe, userId);
      intent = await stripe.paymentIntents.create(
        {
          amount: hold.amountCents,
          currency: hold.currency,
          customer,
          automatic_payment_methods: { enabled: true },
          description: `Roam: ${stay.title}, ${hold.checkIn} to ${hold.checkOut}`,
          metadata: { hold_id: hold.id, clerk_user_id: userId, stay_id: stay.id },
        },
        { idempotencyKey: `hold:${hold.id}:${hold.paymentIntentId ?? "new"}` },
      );
      await db.update(bookingHolds).set({ paymentIntentId: intent.id }).where(eq(bookingHolds.id, hold.id));
    }
    return {
      ok: true,
      holdId: hold.id,
      clientSecret: intent.client_secret,
      paid: false,
      amountCents: hold.amountCents,
      expiresAt: hold.expiresAt.toISOString(),
    };
  } catch (e) {
    if ((e as Error).message === "unavailable" || (e as Error).cause === "unavailable" || isOverlapViolation(e)) {
      return { ok: false, reason: "unavailable" };
    }
    throw e;
  } finally {
    await pool.end();
  }
}
