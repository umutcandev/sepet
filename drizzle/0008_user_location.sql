ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "locationLat" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "locationLng" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "locationDistance" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "locationLabel" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "selectedDepotIds" jsonb;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "locationUpdatedAt" timestamp;
