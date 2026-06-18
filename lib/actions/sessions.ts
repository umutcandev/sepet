"use server"

import { and, desc, eq, isNull } from "drizzle-orm"

import { auth, signOut } from "@/auth"
import { db, userSessions } from "@/lib/db"

export type SessionRow = {
  id: string
  deviceLabel: string
  locationLabel: string
  /** ISO string — istemcide tr-TR Intl ile biçimlenir. */
  createdAt: string
  lastSeenAt: string
  isCurrent: boolean
}

/** Geçerli kullanıcının kapatılmamış (aktif) cihaz oturumlarını döner. */
export async function listSessions(): Promise<SessionRow[]> {
  const session = await auth()
  if (!session?.user?.id) return []
  const currentSid = session.sid ?? null

  const rows = await db
    .select()
    .from(userSessions)
    .where(
      and(
        eq(userSessions.userId, session.user.id),
        isNull(userSessions.revokedAt),
      ),
    )
    .orderBy(desc(userSessions.lastSeenAt))

  return rows.map((r) => ({
    id: r.id,
    deviceLabel: r.deviceLabel ?? "Bilinmeyen cihaz",
    locationLabel: r.locationLabel ?? "Bilinmiyor",
    createdAt: r.createdAt.toISOString(),
    lastSeenAt: r.lastSeenAt.toISOString(),
    isCurrent: r.id === currentSid,
  }))
}

/** Tek bir cihaz oturumunu kapatır (yalnızca kullanıcının kendi oturumu). */
export async function revokeSession(id: string): Promise<{ ok: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false }

  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(userSessions.id, id), eq(userSessions.userId, session.user.id)),
    )
  return { ok: true }
}

/** Tüm cihazlardan çıkış: kullanıcının her oturumunu kapatır ve oturumu bitirir. */
export async function revokeAllSessions(): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return

  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(eq(userSessions.userId, session.user.id))

  await signOut({ redirectTo: "/" })
}
