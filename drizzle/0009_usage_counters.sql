ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_counter" (
	"userId" text NOT NULL,
	"period" text NOT NULL,
	"textMessages" integer DEFAULT 0 NOT NULL,
	"imageAnalyses" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usage_counter_userId_period_pk" PRIMARY KEY("userId","period")
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_counter" ADD CONSTRAINT "usage_counter_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
