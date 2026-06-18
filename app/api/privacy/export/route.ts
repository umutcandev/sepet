import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { exportLimiter } from "@/lib/security/rate-limit"
import { buildUserExport } from "@/lib/privacy/export"
import {
  isExportCategory,
  EXPORT_CATEGORIES,
  type ExportCategory,
} from "@/lib/privacy/categories"

export const runtime = "nodejs"
// Veri derleme + R2 görsel çekme uzun sürebilir; statik optimizasyondan kaçın.
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const { success } = await exportLimiter.limit(userId)
  if (!success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Çok fazla dışa aktarma isteği. Lütfen biraz sonra tekrar dene." },
      { status: 429 },
    )
  }

  // Body opsiyonel: { categories?: string[] }. Geçersiz/boş gelirse tüm
  // kategoriler dahil edilir.
  let categories: ExportCategory[] = EXPORT_CATEGORIES
  try {
    const body = (await req.json()) as unknown
    const raw =
      body && typeof body === "object" && "categories" in body
        ? (body as { categories?: unknown }).categories
        : undefined
    if (Array.isArray(raw)) {
      const filtered = raw.filter(isExportCategory)
      if (filtered.length > 0) categories = filtered
    }
  } catch {
    // Body yok/geçersiz JSON → tüm kategoriler.
  }

  try {
    const { bytes, filename } = await buildUserExport(userId, categories)
    return new NextResponse(bytes as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("[privacy/export] failed", err)
    return NextResponse.json(
      { error: "export_failed", message: "Veriler dışa aktarılamadı." },
      { status: 500 },
    )
  }
}
