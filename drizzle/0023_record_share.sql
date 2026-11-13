-- Paylaşılan sepet ve fişler: kaydın temizlenmiş anlık görüntüsü + bağlantı token'ı.
-- Kayıt başına tek satır; paylaşımı kapatmak satırı siler (bkz. lib/db/schema.ts).
-- Not: bu repo'da şema db:push ile uygulanır; bu dosya kayıt amaçlıdır.
CREATE TABLE IF NOT EXISTS "record_share" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"kind" text NOT NULL,
	"basketId" uuid,
	"receiptId" uuid,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"contentHash" text NOT NULL,
	"anonymous" boolean DEFAULT false NOT NULL,
	"imageKey" text,
	"hideImages" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "record_share_target_check" CHECK (("kind" = 'basket' AND "basketId" IS NOT NULL AND "receiptId" IS NULL) OR ("kind" = 'receipt' AND "receiptId" IS NOT NULL AND "basketId" IS NULL))
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "record_share" ADD CONSTRAINT "record_share_basketId_basket_id_fk" FOREIGN KEY ("basketId") REFERENCES "public"."basket"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "record_share" ADD CONSTRAINT "record_share_receiptId_receipt_id_fk" FOREIGN KEY ("receiptId") REFERENCES "public"."receipt"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "record_share" ADD CONSTRAINT "record_share_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "record_share_token_idx" ON "record_share" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "record_share_basket_idx" ON "record_share" USING btree ("basketId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "record_share_receipt_idx" ON "record_share" USING btree ("receiptId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "record_share_user_idx" ON "record_share" USING btree ("userId","updatedAt" DESC NULLS LAST);
