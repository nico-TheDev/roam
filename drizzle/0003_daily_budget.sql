CREATE TABLE "daily_budget" (
	"day" date NOT NULL,
	"kind" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_budget_day_kind_pk" PRIMARY KEY("day","kind")
);
