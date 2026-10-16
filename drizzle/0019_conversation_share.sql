-- Paylaşılan sohbetler: sohbetin temizlenmiş anlık görüntüsü + bağlantı token'ı.
-- Sohbet başına tek satır; paylaşımı kapatmak satırı siler (bkz. lib/db/schema.ts).
-- Not: bu repo'da şema db:push ile uygulanır; bu dosya kayıt amaçlıdır.
CREATE TABLE IF NOT EXISTS "conversation_share" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"conversationId" uuid NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"messages" jsonb NOT NULL,
	"contentHash" text NOT NULL,
	"anonymous" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_share" ADD CONSTRAINT "conversation_share_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_share" ADD CONSTRAINT "conversation_share_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_share_token_idx" ON "conversation_share" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_share_conversation_idx" ON "conversation_share" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_share_user_idx" ON "conversation_share" USING btree ("userId","updatedAt" DESC NULLS LAST);
