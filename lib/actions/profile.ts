"use server"

import { eq } from "drizzle-orm"
import { z } from "zod"

import { auth, signOut } from "@/auth"
import { db, users, userSessions } from "@/lib/db"
import { isOwnedAvatarUrl } from "@/lib/storage/r2"

const nameSchema = z
  .string()
  .trim()
  .min(1, "Ad boş olamaz")
  .max(80, "Ad en fazla 80 karakter olabilir")

/** Kullanıcının görünen tam adını günceller. */
export async function updateProfileName(
  name: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }

  const parsed = nameSchema.safeParse(name)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz ad." }
  }

  await db
    .update(users)
    .set({ name: parsed.data })
    .where(eq(users.id, session.user.id))
  return { ok: true }
}

/** Yüklenen özel avatarı kullanıcıya bağlar (yalnızca kendi R2 klasörü). */
export async function setAvatar(
  publicUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }

  if (!isOwnedAvatarUrl(publicUrl, session.user.id)) {
    return { ok: false, error: "Geçersiz görsel." }
  }

  await db
    .update(users)
    .set({ customImage: publicUrl })
    .where(eq(users.id, session.user.id))
  return { ok: true }
}

/** Özel avatarı kaldırır → görünen avatar tekrar Google fotoğrafına döner. */
export async function resetAvatar(): Promise<{ ok: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false }

  await db
    .update(users)
    .set({ customImage: null })
    .where(eq(users.id, session.user.id))
  return { ok: true }
}

/**
 * Hesabı arşivler (yumuşak silme): archivedAt'i set eder, tüm cihaz oturumlarını
 * kapatır ve oturumu sonlandırır. 14 gün içinde tekrar giriş yapılmazsa cron
 * (purge-archived) kalıcı siler; giriş yapılırsa jwt callback archivedAt'i
 * null'lar (geri açılır).
 */
export async function archiveAccount(): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return
  const uid = session.user.id

  await db.update(users).set({ archivedAt: new Date() }).where(eq(users.id, uid))
  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(eq(userSessions.userId, uid))

  await signOut({ redirectTo: "/" })
}
