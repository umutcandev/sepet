import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getProductByBarcode, isBarcode } from "@/lib/camgoz/cache"
import { CamgozError } from "@/lib/camgoz/client"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ barcode: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { barcode } = await params
  if (!isBarcode(barcode)) {
    return NextResponse.json({ error: "invalid_barcode" }, { status: 400 })
  }

  try {
    const detail = await getProductByBarcode(barcode)
    if (!detail) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }
    return NextResponse.json({ detail })
  } catch (err) {
    const status = err instanceof CamgozError ? err.status : 500
    const message =
      err instanceof Error ? err.message : "unknown camgoz error"
    return NextResponse.json({ error: message }, { status })
  }
}
