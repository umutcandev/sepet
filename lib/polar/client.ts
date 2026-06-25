import "server-only"
import { Polar } from "@polar-sh/sdk"

// Polar ortamı. Org Live'da kurulu olduğu için varsayılan "production";
// test için POLAR_SERVER=sandbox verilir. SDK ve @polar-sh/nextjs adaptörleri
// (checkout/portal) aynı değeri kullanmalı.
export const polarServer: "sandbox" | "production" =
  process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production"

export const polarAccessToken = process.env.POLAR_ACCESS_TOKEN ?? ""

// Sunucu tarafı Polar istemcisi (checkout oluşturma vb.). Token eksikse yine de
// örneklenir; ilk API çağrısında Polar 401 döner ve ilgili route 5xx'e düşer —
// böylece eksik konfigürasyon sessizce yanlış davranışa dönüşmez.
export const polar = new Polar({
  accessToken: polarAccessToken,
  server: polarServer,
})

export type BillingInterval = "month" | "year"

// Pro için Polar'da iki ayrı ürün vardır (aylık/yıllık); ikisi de plan=pro'ya
// karşılık gelir. Eşleme tek yerde tutulur ki checkout ve webhook aynı doğruyu
// görsün.
export const PRO_PRODUCT_IDS: Record<BillingInterval, string> = {
  month: process.env.POLAR_PRODUCT_ID_PRO_MONTHLY ?? "",
  year: process.env.POLAR_PRODUCT_ID_PRO_YEARLY ?? "",
}

// Bir Polar ürün ID'sini faturalama dönemimize çevirir; tanımadığımız bir ürünse
// null (webhook'ta "bu bizim Pro ürünümüz mü?" kontrolü için de kullanılır).
export function intervalForProduct(productId: string): BillingInterval | null {
  if (productId && productId === PRO_PRODUCT_IDS.month) return "month"
  if (productId && productId === PRO_PRODUCT_IDS.year) return "year"
  return null
}
