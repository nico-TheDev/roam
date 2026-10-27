CREATE TABLE "booking_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"stay_id" text NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"guests" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"breakdown" jsonb NOT NULL,
	"stay_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payment_intent_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "booking_holds_payment_intent_id_unique" UNIQUE("payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"stay_id" text NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"guests" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"breakdown" jsonb NOT NULL,
	"stay_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hold_id" uuid NOT NULL,
	"payment_intent_id" text NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	CONSTRAINT "bookings_payment_intent_id_unique" UNIQUE("payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "booking_holds_user_idx" ON "booking_holds" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "bookings_user_idx" ON "bookings" USING btree ("clerk_user_id","check_in");