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
