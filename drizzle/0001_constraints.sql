CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE booking_holds ADD CONSTRAINT booking_holds_no_overlap
  EXCLUDE USING gist (stay_id WITH =, daterange(check_in, check_out) WITH &&) WHERE (status = 'open');
--> statement-breakpoint
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (stay_id WITH =, daterange(check_in, check_out) WITH &&) WHERE (status = 'confirmed');
--> statement-breakpoint
ALTER TABLE booking_holds ADD CONSTRAINT booking_holds_dates CHECK (check_out > check_in);
--> statement-breakpoint
ALTER TABLE bookings ADD CONSTRAINT bookings_dates CHECK (check_out > check_in);
