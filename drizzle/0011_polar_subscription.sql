-- Polar abonelik senkronizasyonu için kullanıcı kolonları.
-- `plan` (free/pro) tek doğruluk kaynağıdır; bu alanlar Polar webhook'larıyla
-- senkronlanır ve Abonelik panelini besler + müşteri portalını açmak için tutulur.
-- Not: bu repo'da şema db:push ile uygulanır; bu dosya kayıt amaçlıdır.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "polarCustomerId" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "polarSubscriptionId" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscriptionStatus" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscriptionInterval" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscriptionCurrentPeriodEnd" timestamp;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscriptionCancelAtPeriodEnd" boolean DEFAULT false NOT NULL;
