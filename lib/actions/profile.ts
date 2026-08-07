"use server"

import { eq } from "drizzle-orm"
import { z } from "zod"

import { auth, signOut } from "@/auth"
import { db, users, userSessions } from "@/lib/db"
import { deleteAvatarByUrl, isOwnedAvatarUrl } from "@/lib/storage/r2"

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

/**
 * Yüklenen özel avatarı kullanıcıya bağlar (yalnızca kendi R2 klasörü).
 *
 * Yazmadan önce eski değer okunur ve UPDATE sonrası o nesne R2'den silinir:
 * aksi halde avatar her değiştirildiğinde bir dosya daha yetim kalır ve
 * yalnızca hesap purge'ünde temizlenirdi. Silme best-effort — başarısız olsa da
 * yeni avatar geçerlidir.
 *
 * (Postgres'te `UPDATE … RETURNING` yeni satırı döndürdüğü için eski değeri
 * ayrı bir SELECT ile okumak zorundayız. İki sekmeden aynı anda değiştirmede en
 * kötü ihtimalle bir nesne yetim kalır — bugünkü "her seferinde yetim"den
 * kesinlikle daha iyi.)
 */
export async function setAvatar(
  publicUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }
  const uid = session.user.id

  if (!isOwnedAvatarUrl(publicUrl, uid)) {
    return { ok: false, error: "Geçersiz görsel." }
  }

  const [prev] = await db
    .select({ customImage: users.customImage })
    .from(users)
    .where(eq(users.id, uid))
    .limit(1)

  await db.update(users).set({ customImage: publicUrl }).where(eq(users.id, uid))

  // Aynı URL yeniden set edilirse aktif nesneyi silme.
  if (prev?.customImage && prev.customImage !== publicUrl) {
    await deleteAvatarByUrl(prev.customImage, uid)
  }
  return { ok: true }
}

/** Özel avatarı kaldırır → görünen avatar tekrar sağlayıcı fotoğrafına döner. */
export async function resetAvatar(): Promise<{ ok: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false }
  const uid = session.user.id

  const [row] = await db
    .select({ customImage: users.customImage })
    .from(users)
    .where(eq(users.id, uid))
    .limit(1)

  await db.update(users).set({ customImage: null }).where(eq(users.id, uid))

  // Artık referans veren satır yok → nesneyi de temizle.
  if (row?.customImage) await deleteAvatarByUrl(row.customImage, uid)
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
