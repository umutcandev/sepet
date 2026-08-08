// Ham ürün adından miktar/birim sözcüklerini ayıklayan paylaşılan saf util.
// Hem sunucu tarafı (lib/ai/tools.ts) hem client (receipt-approval-card.tsx)
// bunu kullanır — bağımlılıksız tutulmalı.

export const TURKISH_QUANTITY_TOKENS = new Set([
  "tane",
  "adet",
  "paket",
  "kutu",
  "şişe",
  "şise",
  "kg",
  "g",
  "gr",
  "gram",
  "kilo",
  "lt",
  "l",
  "litre",
  "ml",
  "bir",
  "iki",
  "üç",
  "uc",
  "dört",
  "dort",
  "beş",
  "bes",
  "altı",
  "alti",
  "yarım",
  "yarim",
])

export function stripQuantityTokens(input: string): string {
  return input
    .toLocaleLowerCase("tr-TR")
    .replace(/[0-9]+([.,][0-9]+)?/g, " ")
    .split(/\s+/)
    .filter((tok) => tok.length > 1 && !TURKISH_QUANTITY_TOKENS.has(tok))
    .join(" ")
    .trim()
}

/**
 * Bir sorgunun giderek genelleşen biçimleri — sondan kelime atarak, en
 * spesifikten en genele. Tam sorgunun kendisi DÖNMEZ; çağıran onu zaten
 * denemiştir.
 *
 * Neden gerekli: marketfiyati kelimeleri AND'liyor, her ek kelime sonucu
 * daraltıyor ve 3+ kelimede çoğu sorgu sıfıra düşüyor. Ölçüm (2026-08-08,
 * İstanbul, 34 depo):
 *
 *   "omo"                 → 37 sonuç      "vanish oxi"          → 1 sonuç
 *   "omo sıvı"            →  2 sonuç      "vanish oxi toz"      → 0
 *   "omo sivi color"      →  0            "vanish oxi toz renk" → 0
 *
 * Her iki sıfır sonuç da fiş OCR'ının ürettiği sorgulardı, oysa ürünler
 * katalogda vardı ("Omo Renkliler Sıvı Deterjan 1.69 Lt" = fişteki "OMO SIVI
 * 1690 ML COLOR"). Fiş satırları tipik olarak 3-4 kelime olduğundan fiş
 * karşılaştırmasında hiçbir kalem eşleşmiyordu.
 *
 * Türkçe karakter bir etken DEĞİL: "bingo kirec" ve "bingo kireç" aynı sonucu
 * veriyor, yani upstream normalize ediyor. Tek etken kelime sayısı.
 */
export function queryGeneralizations(query: string): string[] {
  const words = query.trim().split(/\s+/).filter(Boolean)
  const out: string[] = []
  for (let n = words.length - 1; n >= 1; n--) {
    out.push(words.slice(0, n).join(" "))
  }
  return out
}
