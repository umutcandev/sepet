import { getSharedImageKey } from "@/lib/data/conversation-shares"
import {
  sanitizedImageResponse,
  sharedImageNotFound,
} from "@/lib/share/sanitized-image"

// Paylaşılan sohbetteki n. görsel; paylaşım varken ve sahibi "Resimleri
// gizle" demediyse verilir (bkz. lib/share/sanitized-image).

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; ref: string }> }
) {
  const { token, ref } = await params
  if (!/^\d{1,2}$/.test(ref)) return sharedImageNotFound()
  const key = await getSharedImageKey(token, Number(ref))
  if (!key) return sharedImageNotFound()
  return sanitizedImageResponse(key)
}
