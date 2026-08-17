-- Fiş karşılaştırmasının tabanı PAKET BAŞINA'ya çekildi: `receiptUnitPrice` ile
-- `bestPrice` artık aynı tabanda (bkz. lib/ai/schemas.ts → ReceiptComparison ve
-- lib/ai/effective-cost.ts → miktar fiyatı ETKİLEMEZ).
--
-- Bu değişiklikten ÖNCE kaydedilmiş fişlerde `savingsTL`, "fiş satır toplamı −
-- en iyi fiyat × adet" ile hesaplanmıştı. Kolonlar yerinde durduğu için geriye
-- dönük yeniden hesaplanabiliyor; yapılmazsa eski fişler yeni kayıtlarla farklı
-- tabanda kalır — satırda iki paket fiyatı, altında adete göre şişmiş bir fark.
--
-- UYGULAMA NOTU: şema değiştirmez, yalnızca veri günceller. Doğrudan çalıştır
-- (Neon konsolu / psql); `db:push` bu dosyayı görmez ve bir fark de algılamaz.

-- ─── 1) Eksik birim fiyatları satır toplamından türet ───
-- Kayıt sayfası karşılaştırmanın fiş tarafını bu kolondan okuyor; OCR yalnızca
-- satır toplamını okuduysa kolon boş kalmıştı.
UPDATE "receipt_item"
SET "receiptUnitPrice" = ROUND("receiptTotalPrice" / "quantity", 2)
WHERE "receiptUnitPrice" IS NULL
  AND "receiptTotalPrice" IS NOT NULL
  AND "quantity" > 0;

-- ─── 2) Kalem farkını paket tabanına çek ───
-- `savingsTL` NULL olan satırlara DOKUNMA: null "kıyaslanamaz" demek (farklı
-- boyut eşleşmesi ya da bayat fiş), 0 ile aynı şey değil.
UPDATE "receipt_item"
SET "savingsTL" = GREATEST(0, "receiptUnitPrice" - "bestPrice")
WHERE "savingsTL" IS NOT NULL
  AND "bestPrice" IS NOT NULL
  AND "receiptUnitPrice" IS NOT NULL;

-- ─── 3) Fiş başlığındaki toplam tasarruf kalemlerin toplamıdır ───
-- Bayat fişlerde tüm kalemler NULL kalır → SUM NULL → 0. Bu doğru: o fişlerde
-- tasarruf hesabı zaten yapılmıyor.
UPDATE "receipt" r
SET "potentialSavingsTL" = COALESCE(
  (SELECT SUM(i."savingsTL") FROM "receipt_item" i WHERE i."receiptId" = r."id"),
  0
);
