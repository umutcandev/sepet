-- Geçiş anahtarları (WebAuthn / passkey): kimlik bilgisi tablosu + kullanıcı
-- başına opak WebAuthn tanıtıcısı. Challenge'lar DB'de değil, Redis'te tek
-- kullanımlık ve TTL'li tutulur (bkz. lib/auth/webauthn.ts) → temizlik cron'u yok.
-- Not: bu repo'da şema db:push ile uygulanır; bu dosya kayıt amaçlıdır.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "webauthnUserId" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user" ADD CONSTRAINT "user_webauthnUserId_unique" UNIQUE("webauthnUserId");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "passkey" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"credentialId" text NOT NULL,
	"publicKey" text NOT NULL,
	"counter" bigint DEFAULT 0 NOT NULL,
	"transports" jsonb,
	"aaguid" text,
	"deviceType" text NOT NULL,
	"backedUp" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastUsedAt" timestamp
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "passkey" ADD CONSTRAINT "passkey_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "passkey_credential_idx" ON "passkey" USING btree ("credentialId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "passkey_user_idx" ON "passkey" USING btree ("userId");
