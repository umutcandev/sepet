"use server"

import { eq } from "drizzle-orm"

import { auth } from "@/auth"
import { db, baskets, receipts, conversations } from "@/lib/db"

import { deleteBaskets } from "./baskets"
import { deleteReceipts } from "./receipts"
import { deleteConversations } from "./conversations"

// Gizlilik → "Verilerimi sil": bir kullanıcının belirli bir veri türünün
// tamamını siler. Kullanıcının satır id'lerini toplayıp mevcut toplu-silme
// aksiyonlarına devreder; böylece R2 görsel temizliği (fişler), CASCADE ve
// revalidate davranışı tek yerde korunur ve tekrarlanmaz.

export async function clearAllBaskets(): Promise<{ deleted: number }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")

  const rows = await db
    .select({ id: baskets.id })
    .from(baskets)
    .where(eq(baskets.userId, session.user.id))
  if (rows.length === 0) return { deleted: 0 }

  return deleteBaskets(rows.map((r) => r.id))
}

export async function clearAllReceipts(): Promise<{ deleted: number }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")

  const rows = await db
    .select({ id: receipts.id })
    .from(receipts)
    .where(eq(receipts.userId, session.user.id))
  if (rows.length === 0) return { deleted: 0 }

  // deleteReceipts, RETURNING ile topladığı imageR2Key'leri R2'den de siler.
  return deleteReceipts(rows.map((r) => r.id))
}

export async function clearAllConversations(): Promise<{ deleted: number }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("unauthorized")

  const rows = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.userId, session.user.id))
  if (rows.length === 0) return { deleted: 0 }

  return deleteConversations(rows.map((r) => r.id))
}
