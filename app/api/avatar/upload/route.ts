import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  sniffImageType,
  uploadAvatarDirect,
  validateUpload,
} from "@/lib/storage/r2"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const contentType = req.headers.get("content-type") ?? ""

  // Gövdeyi belleğe almadan önce bildirilen Content-Length ile ön-kontrol;
  // gerçek boyut kontrolü buffer sonrası yine yapılır (bkz. receipts/upload).
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
  // Bildirilen tür tek başına yetmez: dosyanın kendi imzası JPEG/PNG/WebP
  // olmalı. Nesne imzadan çıkan türle yazılır.
  const bytes = new Uint8Array(body)
  const sniffedType = sniffImageType(bytes)
  if (!sniffedType) {
    return NextResponse.json(
      {
        error: "invalid_upload",
        message: "Sadece JPEG / PNG / WebP fotoğraf kabul ediliyor.",
      },
      { status: 415 },
    )
  }

  try {
    const out = await uploadAvatarDirect({
      userId: session.user.id,
      contentType: sniffedType,
      body: bytes,
    })
    return NextResponse.json(out)
  } catch (err) {
    console.error("[avatar/upload] failed", err)
    return NextResponse.json(
      { error: "upload_failed", message: "Dosya yüklenemedi." },
      { status: 500 },
    )
  }
}
