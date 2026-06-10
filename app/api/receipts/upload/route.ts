import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { uploadReceiptDirect, validateUpload } from "@/lib/storage/r2"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const contentType = req.headers.get("content-type") ?? ""

  // Gövdeyi belleğe almadan önce ön-kontrol: bildirilen Content-Length zaten
  // sınırı aşıyorsa (ya da content-type geçersizse) hemen reddet — büyük
  // yüklemeyi buffer'lamaya gerek yok. Header yok/biçimsizse atla, gerçek
  // boyut kontrolü buffer sonrası yine yapılıyor.
  const rawLength = req.headers.get("content-length")
  const declaredLength = rawLength != null ? Number(rawLength) : null
  if (declaredLength != null && Number.isFinite(declaredLength)) {
    const pre = validateUpload({ contentType, size: declaredLength })
    if (!pre.ok) {
      return NextResponse.json(
        { error: "invalid_upload", message: pre.reason },
        { status: pre.status },
      )
    }
  }

  const body = await req.arrayBuffer()
  const size = body.byteLength

  const check = validateUpload({ contentType, size })
  if (!check.ok) {
    return NextResponse.json(
      { error: "invalid_upload", message: check.reason },
      { status: check.status },
    )
  }

  try {
    const out = await uploadReceiptDirect({
      userId: session.user.id,
      contentType,
      body: new Uint8Array(body),
    })
    return NextResponse.json(out)
  } catch (err) {
    console.error("[receipts/upload] failed", err)
    return NextResponse.json(
      { error: "upload_failed", message: "Dosya yüklenemedi." },
      { status: 500 },
    )
  }
}
