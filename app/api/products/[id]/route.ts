import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getProductById,
  getProductByBarcode,
  isBarcode,
} from "@/lib/marketfiyati/cache"
import { MarketfiyatiError } from "@/lib/marketfiyati/client"

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
    // Barkod (8-14 hane) → searchByIdentity barkod akışı; aksi halde opak
    // productId ile detay. Hem barkod tarayıcı hem arama kartı tıklaması çalışır.
    const detail = isBarcode(value)
      ? await getProductByBarcode(value)
      : await getProductById(value)
    if (!detail) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }
    return NextResponse.json({ detail })
  } catch (err) {
    const status = err instanceof MarketfiyatiError ? err.status : 500
    const message =
      err instanceof Error ? err.message : "unknown marketfiyati error"
    return NextResponse.json({ error: message }, { status })
  }
}
