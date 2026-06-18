import { NextResponse } from "next/server"
import { and, eq, isNotNull, lt } from "drizzle-orm"

import { db, users } from "@/lib/db"
import { deleteUserStorage } from "@/lib/storage/r2"

export const runtime = "nodejs"
export const maxDuration = 60

// Arşivlenen hesaplar bu kadar gün sonra kalıcı silinir.
const GRACE_DAYS = 14

export async function GET(req: Request) {
  // Vercel Cron, CRON_SECRET set edilmişse Authorization: Bearer <secret>
  // başlığını otomatik gönderir. Secret yoksa uç kapalıdır.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 })
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000)
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(isNotNull(users.archivedAt), lt(users.archivedAt, cutoff)))

  let purged = 0
  for (const u of rows) {
    try {
      // Önce R2 nesneleri (avatar + fişler), sonra DB satırı; users silinince
      // accounts/session/user_session/receipts/baskets/conversations/usage
      // cascade ile temizlenir.
      await deleteUserStorage(u.id)
      await db.delete(users).where(eq(users.id, u.id))
      purged++
    } catch (err) {
      console.error("[cron/purge-archived] failed for", u.id, err)
    }
  }

  return NextResponse.json({ scanned: rows.length, purged })
}
