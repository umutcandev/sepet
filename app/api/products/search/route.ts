import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { MF_PAGE_SIZE, searchProducts } from "@/lib/marketfiyati/cache"
import { MarketfiyatiError } from "@/lib/marketfiyati/client"
import { getUserLocationContext } from "@/lib/auth/location"

export const runtime = "nodejs"

// Üst sınır: sayfa parametresi kullanıcı girdisi; sınırsız bırakmak upstream'e
// keyfi derin sayfa isteği açar. 40 sayfa × 24 = 960 ürün, hiçbir aramanın
// pratik derinliğinin çok üstünde.
const MAX_PAGE = 40

function parsePage(raw: string | null): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.min(MAX_PAGE, Math.max(0, Math.trunc(n)))
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const q = url.searchParams.get("q")?.trim() ?? ""
  const page = parsePage(url.searchParams.get("page"))
  if (q.length < 2) {
    return NextResponse.json({
      hits: [],
      cached: false,
      total: 0,
      page: 0,
      hasMore: false,
    })
  }

  try {
    const loc = await getUserLocationContext()
    const result = await searchProducts(q, loc, { page, size: MF_PAGE_SIZE })
    return NextResponse.json(result)
  } catch (err) {
    const status = err instanceof MarketfiyatiError ? err.status : 500
    // İç hata detayını client'a sızdırma — yalnız sunucu loguna yaz.
    console.error("[products/search] failed", err)
    return NextResponse.json({ error: "search_failed" }, { status })
  }
}
