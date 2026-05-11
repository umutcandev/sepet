import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { searchProducts } from "@/lib/camgoz/cache"
import { CamgozError } from "@/lib/camgoz/client"

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
    const status = err instanceof CamgozError ? err.status : 500
    const message =
      err instanceof Error ? err.message : "unknown camgoz error"
    return NextResponse.json({ error: message }, { status })
  }
}
