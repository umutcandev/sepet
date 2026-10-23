-- Polar abonelik event'lerini sıralamak için son uygulanan event'in
-- modifiedAt'i (bkz. app/api/webhooks/polar). Polar teslim sırasını garanti
-- etmez; aynı aboneliğin daha eski bir görüntüsü bu değerden eskiyse atlanır.
-- Not: bu repo'da şema db:push ile uygulanır; bu dosya kayıt amaçlıdır.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscriptionModifiedAt" timestamp;
