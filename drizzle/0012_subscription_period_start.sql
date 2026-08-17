-- Abonelik dönem başlangıcı (= yenileme günü). Pro kota penceresi takvim ayına
-- değil, bu günün gün-of-month'una sabitli aylık pencereye göre sıfırlanır
-- (bkz. lib/usage/period.ts billingPeriod). Polar webhook'larıyla senkronlanır.
-- Not: bu repo'da şema db:push ile uygulanır; bu dosya kayıt amaçlıdır.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscriptionCurrentPeriodStart" timestamp;
