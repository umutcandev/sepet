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
