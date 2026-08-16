import { cache } from "react"

import { getBasketDetail } from "@/lib/actions/baskets"
import { getReceiptDetail } from "@/lib/actions/receipts"

/**
 * `generateMetadata` ve sayfa bileşeni aynı kaydı okur. Next.js yalnızca `fetch`
 * çağrılarını tekilleştirir, veritabanı çağrılarını değil — sarmalanmadığında
 * her sayfa açılışı sorguları iki kez çalıştırırdı. `cache` aynı render
 * geçişindeki ikinci çağrıyı ilkinin sonucuna bağlar.
 */
export const getBasketDetailCached = cache(getBasketDetail)
export const getReceiptDetailCached = cache(getReceiptDetail)
