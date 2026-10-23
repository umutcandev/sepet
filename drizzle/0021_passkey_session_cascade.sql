-- Geçiş anahtarı silinince o anahtarla açılmış oturum satırları da silinir
-- (önceden passkeyId null'a düşüyordu). İptal ile silme iki ayrı ifadeyken,
-- aradaki bir girişin oturumu iptalden kaçabiliyordu; bkz. lib/db/schema.ts
-- user_session.passkeyId ve lib/actions/passkeys.ts deletePasskeyAction.
-- Not: bu repo'da şema db:push ile uygulanır; bu dosya kayıt amaçlıdır.
ALTER TABLE "user_session" DROP CONSTRAINT IF EXISTS "user_session_passkeyId_passkey_id_fk";--> statement-breakpoint
ALTER TABLE "user_session" ADD CONSTRAINT "user_session_passkeyId_passkey_id_fk" FOREIGN KEY ("passkeyId") REFERENCES "public"."passkey"("id") ON DELETE cascade ON UPDATE no action;
