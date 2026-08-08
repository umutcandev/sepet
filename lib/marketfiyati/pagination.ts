/**
 * Sayfalama saf mantığı. `cache.ts` içinde inline duruyordu ama orası top-level'da
 * Redis ve DB bağlantısı kuruyor — bu fonksiyonları ayrı tutmak yan etkisiz test
 * edilebilmelerini sağlıyor.
 */

/**
 * Sonraki sayfa var mı?
 *
 * - Sayfa istenen boyuttan az geldiyse liste bitmiştir (kesin son).
 * - `total` biliniyorsa bu sayfanın sonuna kadar görülebilecek ürün sayısıyla
 *   karşılaştırılır.
 * - marketfiyati `numberOfFound` vermezse (null) dolu sayfa "muhtemelen devamı
 *   var" sayılır; kullanıcı bir tık daha yapıp boş dönüşle durur — eksik sayfa
 *   döndürmekten iyidir.
 *
 * @param page 0 tabanlı, çekilen SON sayfanın indeksi
 * @param received o son sayfadan dönen ürün sayısı
 */
export function computeHasMore(
  total: number | null,
  page: number,
  size: number,
  received: number,
): boolean {
  if (received < size) return false
  if (total === null) return true
  return (page + 1) * size < total
}

/**
 * Sayfaları tek listede birleştirir, `productId` tekrarlarını atar.
 * Upstream sıralaması istekler arasında oynayabildiğinden aynı ürün iki sayfada
 * birden görünebiliyor. İlk görülen kazanır; sıra korunur (alaka sırası bilgi
 * taşıyor, yeniden sıralamıyoruz).
 */
export function mergeUniqueById<T extends { productId: string }>(
  pages: readonly T[][],
): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const page of pages) {
    for (const item of page) {
      if (seen.has(item.productId)) continue
      seen.add(item.productId)
      out.push(item)
    }
  }
  return out
}
