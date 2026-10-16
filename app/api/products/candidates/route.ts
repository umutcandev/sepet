import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { searchCandidatePool } from "@/lib/ai/tools"
import { MarketfiyatiError } from "@/lib/marketfiyati/client"
import { getUserLocationContext } from "@/lib/auth/location"
import type { Candidate } from "@/lib/ai/match-result"

export const runtime = "nodejs"

/**
 * Sepet Özeti'ndeki ürün değiştirme ekranının aday listesi: eşleştirmenin
 * gördüğü havuzun AYNISI (aynı sorgu, aynı sayfa sayısı, aynı fiyat filtresi),
 * her aday market fiyatlarıyla. Ekrandaki aramayla başka bir ürün aranırken
 * de aynı uç kullanılır.
 *
 * AI çağrısı yok, kota harcamaz. `/api/products` altında durması bilinçli:
 * proxy ürün aramalarının hız limitini burada da uygular; `/api/assistant`
 * altında olsaydı sohbetin dakikada 10 isteklik bütçesini yerdi.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? ""
  if (q.length < 2 || q.length > 100) {
    return NextResponse.json({ products: [] })
  }

  try {
    const loc = await getUserLocationContext()
    const { hits } = await searchCandidatePool(q, loc)
    const products: Candidate[] = hits.map((d) => ({
      productId: d.productId,
      name: d.name,
      brand: d.brand,
      category: d.category,
      imageUrl: d.imageUrl,
      averagePrice: d.averagePrice,
      minPrice: d.minPrice,
      maxPrice: d.maxPrice,
      marketCount: d.marketCount,
      markets: d.markets,
    }))
    return NextResponse.json({ products })
  } catch (err) {
    const status = err instanceof MarketfiyatiError ? err.status : 500
    // İç hata detayını client'a sızdırma — yalnız sunucu loguna yaz.
    console.error("[products/candidates] failed", err)
    return NextResponse.json({ error: "search_failed" }, { status })
  }
}
