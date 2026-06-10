import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { searchProducts } from "@/lib/marketfiyati/cache"
import { MarketfiyatiError } from "@/lib/marketfiyati/client"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const q = url.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) {
    return NextResponse.json({ hits: [], cached: false })
  }

  try {
    const result = await searchProducts(q)
    return NextResponse.json(result)
  } catch (err) {
    const status = err instanceof MarketfiyatiError ? err.status : 500
    // İç hata detayını client'a sızdırma — yalnız sunucu loguna yaz.
    console.error("[products/search] failed", err)
    return NextResponse.json({ error: "search_failed" }, { status })
  }
}
