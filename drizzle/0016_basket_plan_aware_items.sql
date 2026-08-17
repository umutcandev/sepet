-- Sepet/fiş kayıt deneyimi denetimi — Aşama B şema eklemeleri.
--
-- UYGULAMA NOTU: bu dosyayı DOĞRUDAN çalıştır (Neon konsolu / psql). `db:push`
-- ile gitmek istersen aşağıdaki iki RENAME için drizzle-kit interaktif olarak
-- "created or renamed?" diye sorar; "renamed" seçilmezse kayıtlı fiyatlar
-- drop+create ile SİLİNİR. SQL'i elle uygulayıp sonra `db:push` çalıştırmak en
-- güvenlisi: push hiçbir fark görmez.

-- ─── basket_item ───

-- Bu iki kolon bir plan fiyatı değil, temsilci ürünün tüm marketlerdeki en
-- düşük fiyatı. Adı ne olduğunu söylesin (veri korunur, yalnızca ad değişir).
ALTER TABLE "basket_item" RENAME COLUMN "bestPrice" TO "minPrice";
ALTER TABLE "basket_item" RENAME COLUMN "bestMarket" TO "minPriceMarket";

ALTER TABLE "basket_item" ADD COLUMN IF NOT EXISTS "sortIndex" integer DEFAULT 0 NOT NULL;
ALTER TABLE "basket_item" ADD COLUMN IF NOT EXISTS "matchedBrand" text;
ALTER TABLE "basket_item" ADD COLUMN IF NOT EXISTS "matchedImageUrl" text;
ALTER TABLE "basket_item" ADD COLUMN IF NOT EXISTS "lookupStatus" text;

-- Eski satırlarda eşleşme durumu yok. Eşleşen ürün id'si varsa "ok" kabul et;
-- yoksa NULL bırak — "veri yok" ile "bulunamadı" tam da ayırmak istediğimiz şey,
-- geçmişe dönük olarak "no_match" uydurmak yeni bir yanlış olurdu.
UPDATE "basket_item" SET "lookupStatus" = 'ok' WHERE "matchedProductId" IS NOT NULL;

-- ─── receipt_item ───

ALTER TABLE "receipt_item" ADD COLUMN IF NOT EXISTS "sortIndex" integer DEFAULT 0 NOT NULL;
ALTER TABLE "receipt_item" ADD COLUMN IF NOT EXISTS "matchedBrand" text;
ALTER TABLE "receipt_item" ADD COLUMN IF NOT EXISTS "matchedImageUrl" text;
ALTER TABLE "receipt_item" ADD COLUMN IF NOT EXISTS "lookupStatus" text;

UPDATE "receipt_item" SET "lookupStatus" = 'ok' WHERE "matchedProductId" IS NOT NULL;

-- ─── receipt ───

-- Fişe ad verilemiyordu; liste sayfasında her fiş birbirinin aynı görünüyordu.
ALTER TABLE "receipt" ADD COLUMN IF NOT EXISTS "name" text;
