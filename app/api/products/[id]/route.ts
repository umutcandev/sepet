import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getProductById,
  getProductByBarcode,
  isBarcode,
} from "@/lib/marketfiyati/cache"
import { MarketfiyatiError } from "@/lib/marketfiyati/client"
import { getUserLocationContext } from "@/lib/auth/location"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const value = decodeURIComponent(id).trim()
  if (!value) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 })
  }

  try {
    const loc = await getUserLocationContext()
    // Barkod (8-14 hane) → searchByIdentity barkod akışı; aksi halde opak
    // productId ile detay. Hem barkod tarayıcı hem arama kartı tıklaması çalışır.
    const detail = isBarcode(value)
      ? await getProductByBarcode(value, loc)
      : await getProductById(value, loc)
    if (!detail) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }
    return NextResponse.json({ detail })
  } catch (err) {
    const status = err instanceof MarketfiyatiError ? err.status : 500
    // İç hata detayını client'a sızdırma — yalnız sunucu loguna yaz.
    console.error("[products/[id]] failed", err)
    return NextResponse.json({ error: "lookup_failed" }, { status })
  }
}
