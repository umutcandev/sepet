import "server-only"

import { after } from "next/server"
import { eq, inArray } from "drizzle-orm"

import { db, basketItems, receiptItems } from "@/lib/db"
import { getProductById } from "@/lib/marketfiyati/cache"
import { getUserLocationContext } from "@/lib/auth/location"
import type { LocationContext } from "@/lib/marketfiyati/client"

/**
 * Kayıt sayfalarındaki kalem görsellerini tamamlar.
 *
 * `matchedImageUrl` sütunu sepet/fiş kalemlerine sonradan eklendi; ondan önce
 * kaydedilmiş HER kalemde NULL. Kayıt sayfaları da yalnız bu sütunu okuduğu
 * için eski kayıtların tamamı kalıcı olarak boş yer-tutucu gösteriyordu — veri
 * kaybı değil, hiç yazılmamış bir alan. Yeni kayıtların düzgün olması eski
 * kayıtları düzeltmez; geçmiş, kullanıcının açtığı asıl sayfa.
 *
 * Satırda `matchedProductId` duruyor: görsel canlı üründen çözülebilir. Çözülen
 * değer satıra geri yazılır, yani maliyet kalem başına yalnız bir kez ödenir ve
 * ileride başka bir sebeple boş kalan satırlar da kendiliğinden onarılır.
 */

/**
 * "Baktım, ürünün görseli yok" işareti. NULL bırakılsaydı sonuçsuz sorgu her
 * sayfa açılışında tekrarlanırdı. Okuyan taraf boş string'i görselsiz sayar.
 */
const NO_IMAGE = ""

/**
 * Tek render'da yapılacak en fazla canlı ürün sorgusu. Redis'te olan ürün
 * bedava gelir; olmayan bir API isteği demektir. Tavan, çok kalemli tek bir
 * kaydın sayfa açılışını uzatmasını engeller — kalanlar sonraki açılışta
 * tamamlanır.
 */
const MAX_LOOKUPS = 12

type ImageFillable = {
  id: string
  matchedProductId: string | null
  matchedImageUrl: string | null
}

type Target = "basket" | "receipt"

/**
 * Görseli eksik kalemleri `matchedProductId` üzerinden tamamlar ve sonucu
 * satırlara geri yazar. Sorgu/DB hatası sayfayı düşürmez: elde ne varsa onunla
 * render edilir.
 */
export async function withResolvedItemImages<T extends ImageFillable>(
  items: T[],
  target: Target,
): Promise<T[]> {
  const pending = items.filter(
    (it) => it.matchedProductId && it.matchedImageUrl == null,
  )
  if (pending.length === 0) return items

  // Aynı ürün birden çok kalemde geçebilir → ürün başına tek sorgu.
  const productIds = [
    ...new Set(pending.map((it) => it.matchedProductId as string)),
  ].slice(0, MAX_LOOKUPS)

  let loc: LocationContext
  try {
    loc = await getUserLocationContext()
  } catch (err) {
    console.error("[item-images] location resolve failed", err)
    return items
  }

  const resolved = new Map<string, string>()
  await Promise.all(
    productIds.map(async (productId) => {
      try {
        const detail = await getProductById(productId, loc)
        // Ürün bulunamadıysa da NO_IMAGE yazılır: eşleşen ürün kataloğdan
        // düşmüş demektir, tekrar sormanın karşılığı yok.
        resolved.set(productId, detail?.imageUrl ?? NO_IMAGE)
      } catch (err) {
        // Kota/ağ hatası kalıcı bir "görseli yok" işareti bırakmamalı —
        // satır NULL kalır, sonraki açılışta yeniden denenir.
        console.error("[item-images] lookup failed", productId, err)
      }
    }),
  )
  if (resolved.size === 0) return items

  // Geri yazma sayfanın render'ını bekletmez; kullanıcı görseli bu istekte
  // zaten görür, UPDATE yalnız bir sonraki açılışın maliyetini düşürür.
  after(() => persist(target, pending, resolved))

  return items.map((it) => {
    const url = it.matchedProductId
      ? resolved.get(it.matchedProductId)
      : undefined
    if (url === undefined) return it
    return { ...it, matchedImageUrl: url || null }
  })
}

async function persist(
  target: Target,
  pending: ImageFillable[],
  resolved: Map<string, string>,
): Promise<void> {
  const table = target === "basket" ? basketItems : receiptItems

  // Aynı görsele düşen satırlar tek UPDATE'te toplanır.
  const byUrl = new Map<string, string[]>()
  for (const item of pending) {
    const url = item.matchedProductId
      ? resolved.get(item.matchedProductId)
      : undefined
    if (url === undefined) continue
    const ids = byUrl.get(url)
    if (ids) ids.push(item.id)
    else byUrl.set(url, [item.id])
  }

  try {
    await Promise.all(
      [...byUrl].map(([url, ids]) =>
        db
          .update(table)
          .set({ matchedImageUrl: url })
          .where(
            ids.length === 1 ? eq(table.id, ids[0]) : inArray(table.id, ids),
          ),
      ),
    )
  } catch (err) {
    console.error("[item-images] backfill write failed", err)
  }
}
