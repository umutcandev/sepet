import { CustomerPortal } from "@polar-sh/nextjs"
import { NextResponse, type NextRequest } from "next/server"
import { eq } from "drizzle-orm"

import { auth } from "@/auth"
import { db, users } from "@/lib/db"
import { polarAccessToken, polarServer } from "@/lib/polar/client"

// Müşteri portalı: kullanıcı aboneliğini görüntüler, planını değiştirir veya
// iptal eder. Portal yalnızca Polar tarafında müşterisi olan (yani gerçekten
// checkout'tan geçmiş → webhook'la polarCustomerId yazılmış) kullanıcılar için
// açılabilir. plan elle 'pro' yapılmış olabilir; o durumda Polar müşterisi
// yoktur, bu yüzden Polar'ı hiç çağırmadan kullanıcıyı bilgilendiririz.
export async function GET(req: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  const origin = req.nextUrl.origin

  if (!userId) {
    return NextResponse.redirect(new URL("/?login=1", origin))
  }

  const [row] = await db
    .select({ polarCustomerId: users.polarCustomerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const customerId = row?.polarCustomerId
  if (!customerId) {
    // Polar müşterisi yok (örn. plan elle ayarlanmış) → portal açılamaz.
    return NextResponse.redirect(new URL("/?abonelik=portal-yok", origin))
  }

  try {
    const portal = CustomerPortal({
      accessToken: polarAccessToken,
      server: polarServer,
      getCustomerId: async () => customerId,
    })
    return await portal(req)
  } catch (error) {
    // Adaptör Polar hatasını yutamazsa isteği çökertmesin; bilgilendirip dön.
    console.error("[polar] portal açılamadı", error)
    return NextResponse.redirect(new URL("/?abonelik=portal-hata", origin))
  }
}
