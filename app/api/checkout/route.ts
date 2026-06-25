import { NextResponse, type NextRequest } from "next/server"

import { auth } from "@/auth"
import { polar, PRO_PRODUCT_IDS, type BillingInterval } from "@/lib/polar/client"

// Pro aboneliği için Polar checkout oturumu açıp kullanıcıyı oraya yönlendirir.
// Checkout, oturum açmış kullanıcının id'sine externalCustomerId ile bağlanır;
// ödeme tamamlanınca webhook bu id'den doğru hesabı bulur. İstemciden gelen
// hiçbir kimlik bilgisine güvenilmez — interval dışında her şey sunucudan gelir.
//
// Kullanım: /api/checkout?interval=month  |  /api/checkout?interval=year
export async function GET(req: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  const origin = req.nextUrl.origin

  if (!userId) {
    // Giriş yoksa ana sayfaya dön; login akışı orada tetiklenir.
    return NextResponse.redirect(new URL("/?login=1", origin))
  }

  const interval: BillingInterval =
    req.nextUrl.searchParams.get("interval") === "year" ? "year" : "month"
  const productId = PRO_PRODUCT_IDS[interval]

  if (!productId) {
    return NextResponse.json({ error: "polar_not_configured" }, { status: 500 })
  }

  try {
    const checkout = await polar.checkouts.create({
      products: [productId],
      externalCustomerId: userId,
      customerEmail: session.user?.email ?? undefined,
      successUrl: `${origin}/?abonelik=basarili`,
      metadata: { userId, interval },
    })
    return NextResponse.redirect(checkout.url)
  } catch (error) {
    console.error("[polar] checkout oluşturulamadı", error)
    return NextResponse.redirect(new URL("/?abonelik=hata", origin))
  }
}
