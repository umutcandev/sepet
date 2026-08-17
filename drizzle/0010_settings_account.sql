ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "customImage" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "archivedAt" timestamp;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_session" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"userAgent" text,
	"deviceLabel" text,
	"ip" text,
	"locationLabel" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL,
	"revokedAt" timestamp
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_session" ADD CONSTRAINT "user_session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_session_user_idx" ON "user_session" USING btree ("userId");
