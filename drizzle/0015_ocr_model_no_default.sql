-- Fiş OCR modeli gemini-2.5-flash → gemini-2.5-flash-lite olarak değişti.
-- "ocrModel" sütununun varsayılanı eski model adına sabitlenmişti; varsayılan
-- bırakmak, değer verilmeyen bir insert'te sessizce YANLIŞ model kaydetmek
-- demek. Sütunun amacı fişin hangi modelle okunduğunu tutmak olduğundan
-- varsayılan tamamen kaldırılıyor; yazan taraf değeri her zaman açıkça verir
-- (lib/ai/models.ts → OCR_MODEL_NAME).
--
-- Geçmiş satırlara DOKUNULMUYOR: eski fişler gerçekten gemini-2.5-flash ile
-- okundu ve öyle kalmalı.
ALTER TABLE "receipt" ALTER COLUMN "ocrModel" DROP DEFAULT;
