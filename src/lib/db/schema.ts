import { sql } from "drizzle-orm";
import { date, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Private booking records. Sanity stays public; nothing here is ever sent to the app unfiltered.
// The exclusion constraints (no overlapping date ranges per stay) live in drizzle/0001_constraints.sql.

export type Breakdown = { nights: number; nightlyCents: number; cleaningCents: number };
export type StaySnapshot = {
  title: string;
  city: string;
  state: string;
  imageUrl: string | null;
  cancellationPolicy: { title: string; body: string } | null;
};

export const customers = pgTable("customers", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const reservation = {
  clerkUserId: text("clerk_user_id").notNull(),
  stayId: text("stay_id").notNull(),
  checkIn: date("check_in", { mode: "string" }).notNull(),
  checkOut: date("check_out", { mode: "string" }).notNull(),
  guests: integer("guests").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  breakdown: jsonb("breakdown").$type<Breakdown>().notNull(),
  staySnapshot: jsonb("stay_snapshot").$type<StaySnapshot>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

/** Pending reservation while the guest pays. Not a booking. */
export const bookingHolds = pgTable(
  "booking_holds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...reservation,
    paymentIntentId: text("payment_intent_id").unique(),
    status: text("status", { enum: ["open", "converted", "expired", "refunded"] }).notNull().default("open"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("booking_holds_user_idx").on(t.clerkUserId)],
);

/** Exists only after Stripe confirmed the payment. */
export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...reservation,
    holdId: uuid("hold_id").notNull(),
    paymentIntentId: text("payment_intent_id").notNull().unique(),
    status: text("status", { enum: ["confirmed"] }).notNull().default("confirmed"),
  },
  (t) => [index("bookings_user_idx").on(t.clerkUserId, t.checkIn)],
);

export const stripeEvents = pgTable("stripe_events", {
  eventId: text("event_id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().default(sql`now()`),
});
