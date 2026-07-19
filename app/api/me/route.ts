import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth/session"
import { listConversations } from "@/lib/actions/conversations"

// İstemci tarafı oturum kaynağı. Kök layout artık `auth()` okumadığı için
// ana sayfa/blog gibi paylaşımlı rotalar statik/ISR olarak CDN'de cache'lenir;
// kullanıcıya özel veri (SessionProvider) bu uçtan mount sonrası çekilir.
// Kimliğe bağlı olduğundan her zaman dinamik ve cache'siz servis edilir.
export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getCurrentUser()
  const conversations = user ? await listConversations() : []

  return NextResponse.json(
    { user, conversations },
    { headers: { "Cache-Control": "private, no-store" } },
  )
}
