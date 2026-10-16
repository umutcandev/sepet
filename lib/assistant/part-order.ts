/**
 * Asistan mesajında text/reasoning kısımları tool & file kart(lar)ından ÖNCE
 * gelir: sunucu stream sırası genelde [tool, reasoning, text]; kullanıcı için
 * doğal okuma sırası ise önce kısa özet/açıklama, sonra detay/kart.
 *
 * Kartlarda asıl sonuç Sepet Özeti: eşleştirme part'ı (artık yalnızca
 * eşleştirilemeyen kalemleri gösteriyor) sunucuda önce gelse de özetin
 * hemen ALTINA taşınır. Eski sohbetler de aynı sırayla görünür.
 *
 * Sohbet ekranı, paylaşılan sayfa ve markdown kopyası aynı sırayı kullanır.
 */
export function orderAssistantParts<P extends { type: string }>(
  parts: P[]
): P[] {
  const isProse = (p: P) => p.type === "text" || p.type === "reasoning"
  const prose = parts.filter(isProse)
  const cards = parts.filter((p) => !isProse(p))
  const at = cards.findIndex((p) => p.type === "tool-summarizeOptimization")
  // Özet henüz gelmediyse eşleştirme part'ı (yükleniyor etiketi) yerinde kalır.
  if (at === -1) return [...prose, ...cards]
  const isLookup = (p: P) => p.type === "tool-lookupProducts"
  return [
    ...prose,
    ...cards.slice(0, at + 1).filter((p) => !isLookup(p)),
    ...cards.filter(isLookup),
    ...cards.slice(at + 1).filter((p) => !isLookup(p)),
  ]
}
