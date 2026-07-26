import "server-only"

import { eq } from "drizzle-orm"

import { db, accounts } from "@/lib/db"
import { isOAuthProviderId, type OAuthProviderId } from "@/lib/auth/providers"

/**
 * Kullanıcının bağlı OAuth sağlayıcısı. Otomatik hesap bağlama yalnız Google'da
 * açık olduğundan pratikte en fazla bir satır bulunur; birden fazlaysa ilki
 * yeterli (metinlerde tek bir isim gösteriyoruz).
 *
 * Sorgu DB'ye dokunduğu için etiket/tip sabitlerinden ayrı dosyada: providers.ts
 * client component'lerden de import ediliyor, bu modül ise server-only.
 */
export async function getLinkedProvider(
  userId: string,
): Promise<OAuthProviderId | null> {
  const rows = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(eq(accounts.userId, userId))

  for (const row of rows) {
    if (isOAuthProviderId(row.provider)) return row.provider
  }
  return null
}
