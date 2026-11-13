import { getSharedReceiptImageKey } from "@/lib/data/record-shares"
import {
  sanitizedImageResponse,
  sharedImageNotFound,
} from "@/lib/share/sanitized-image"

// Paylaşılan fişin görseli; paylaşım varken ve sahibi görseli gizlemediyse
// verilir (bkz. lib/share/sanitized-image).

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const key = await getSharedReceiptImageKey(token)
  if (!key) return sharedImageNotFound()
  return sanitizedImageResponse(key)
}
