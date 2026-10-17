-- Paylaşılan sohbette görseller: kopyadaki görsellerin R2 anahtarları (yalnız
-- sunucuda) ve sahibinin "Resimleri gizle" tercihi. Var olan paylaşımlarda
-- görsel hiç yoktu; varsayılan gizli olduğu için öyle kalırlar.
-- Not: bu repo'da şema db:push ile uygulanır; bu dosya kayıt amaçlıdır.
ALTER TABLE "conversation_share" ADD COLUMN IF NOT EXISTS "images" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_share" ADD COLUMN IF NOT EXISTS "hideImages" boolean DEFAULT true NOT NULL;
