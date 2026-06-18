import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { exportLimiter } from "@/lib/security/rate-limit"
import { buildUserExportStream } from "@/lib/privacy/export"
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

  // CSRF defense-in-depth: tarayıcı kaynaklı cross-site POST'ları reddet. Origin
  // header'ı varsa istekteki host ile eşleşmeli. (SameSite=Lax cookie zaten büyük
  // ölçüde korur; bu ek bir katman. Origin yoksa atlanır.)
  const origin = req.headers.get("origin")
  if (origin) {
    const host = req.headers.get("host")
    let originHost: string | null = null
    try {
      originHost = new URL(origin).host
    } catch {
      originHost = null
    }
    if (!host || originHost !== host) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }
  }

  const { success } = await exportLimiter.limit(userId)
  if (!success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Çok fazla dışa aktarma isteği. Lütfen biraz sonra tekrar dene." },
      { status: 429 },
    )
  }

  // Body opsiyonel: { categories?: string[] }.
  //  - categories hiç yoksa → tüm kategoriler (varsayılan).
  //  - categories gönderildi ama geçerli bir değer içermiyorsa → 400 (client
  //    en az bir seçim gönderir; sessizce "hepsi"ne düşmeyiz).
  let categories: ExportCategory[] = EXPORT_CATEGORIES
  let badRequest = false
  try {
    const body = (await req.json()) as unknown
    if (body && typeof body === "object" && "categories" in body) {
      const raw = (body as { categories?: unknown }).categories
      if (Array.isArray(raw)) {
        const filtered = raw.filter(isExportCategory)
        if (filtered.length > 0) categories = filtered
        else badRequest = true
      } else if (raw !== undefined) {
        badRequest = true
      }
    }
  } catch {
    // Body yok/geçersiz JSON → tüm kategoriler (varsayılan).
  }

  if (badRequest) {
    return NextResponse.json(
      { error: "bad_request", message: "Geçerli bir kategori seçilmedi." },
      { status: 400 },
    )
  }

  // Arşiv stream olarak akıtılır (tüm ZIP belleğe alınmaz). DB sorguları ve R2
  // çekimleri stream okunurken (start) çalışır; oradaki hatalar stream'i
  // hata'ya düşürür ve indirme yarıda kesilir (status zaten 200 gönderilmiştir).
  const { stream, filename } = buildUserExportStream(userId, categories)
  return new NextResponse(stream as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
