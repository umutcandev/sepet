"use server"

import { and, count, eq, isNull, ne } from "drizzle-orm"
import type { Session } from "next-auth"

import { auth, signIn } from "@/auth"
import { db, accounts, passkeys, users, userSessions } from "@/lib/db"
import { hasSudo } from "@/lib/auth/sudo"
import { recordLinkIntent } from "@/lib/auth/oauth-link"
import {
  OAUTH_PROVIDER_LABELS,
  type OAuthProviderId,
} from "@/lib/auth/providers"
import { sendMail } from "@/lib/email/mailer"
import { accountUnlinkedEmail } from "@/lib/email/templates"
import { withUserLock } from "@/lib/security/user-lock"

// Ayarlar > Hesap > Bağlı hesaplar. Bağlama, oturum açıkken yapılan bir OAuth
// girişidir: Auth.js yeni sağlayıcı hesabını oturumdaki kullanıcıya bağlar.
// Bu kalıcı bir giriş yolu eklediği için geçiş anahtarı eklemek gibi sudo
// ister; niyet kaydı ve signIn callback'teki kontrol için bkz.
// lib/auth/oauth-link.ts (authorizeInSessionLink).

export type LinkedAccountsState = Record<OAuthProviderId, boolean>

export type LinkResult =
  | { ok: false; error: string; code?: "sudo_required" }
  | { ok: true }

const SUDO_REQUIRED = "Devam etmek için kimliğini doğrula."

export async function getLinkedAccountsAction(): Promise<LinkedAccountsState | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const rows = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(eq(accounts.userId, session.user.id))
  const linked = new Set(rows.map((r) => r.provider))
  return { google: linked.has("google"), facebook: linked.has("facebook") }
}

async function startLink(
  session: Session | null,
  provider: OAuthProviderId
): Promise<LinkResult> {
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }
  const uid = session.user.id
  const sid = session.sid
  if (!sid || !(await hasSudo(uid, sid))) {
    return { ok: false, error: SUDO_REQUIRED, code: "sudo_required" }
  }

  const [existing] = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(and(eq(accounts.userId, uid), eq(accounts.provider, provider)))
    .limit(1)
  if (existing) return { ok: false, error: "Bu hesap zaten bağlı." }

  await recordLinkIntent(uid, sid, provider)
  // Sağlayıcıya yönlendirir (NEXT_REDIRECT fırlatır); dönüşte sonuç
  // ?hesap-baglama= ile bildirilir (bkz. AccountLinkResultHost).
  await signIn(provider, { redirectTo: "/?hesap-baglama=basarili" })
  return { ok: true }
}

// Sağlayıcı id'si parametre DEĞİL (bkz. lib/actions/auth.ts aynı gerekçe).
export async function linkGoogleAction(): Promise<LinkResult> {
  return startLink(await auth(), "google")
}

export async function linkFacebookAction(): Promise<LinkResult> {
  return startLink(await auth(), "facebook")
}

// ─── Bağlantıyı kaldır ───
// Sudo ister (kalıcı bir giriş yolunu kaldırmak da hassas). Son giriş yöntemi
// kaldırılamaz: şifre, geçiş anahtarı ya da başka bir bağlı hesap yoksa hesap
// kilitlenirdi (geçiş anahtarı silmedeki kuralın aynısı). Sağlayıcı başına
// hangi oturumun açıldığı tutulmadığından, tanınmayan bir bağlantıyla girmiş
// birini dışarıda bırakmak için bu cihaz HARİÇ tüm oturumlar kapatılır (şifre
// değişikliğiyle aynı davranış).

const LAST_METHOD =
  "Bu, hesabına girmenin tek yolu. Kaldırmadan önce bir şifre ya da geçiş anahtarı ekle."

async function startUnlink(
  session: Session | null,
  provider: OAuthProviderId
): Promise<LinkResult> {
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." }
  const uid = session.user.id
  const sid = session.sid
  if (!sid || !(await hasSudo(uid, sid))) {
    return { ok: false, error: SUDO_REQUIRED, code: "sudo_required" }
  }

  // Kontrol → silme aralığı, geçiş anahtarı silmeyle AYNI kullanıcı kilidi
  // altında (bkz. lib/security/user-lock.ts "login-method"): paralel
  // isteklerle son giriş yöntemi kuralı delinemez.
  return withUserLock(uid, "login-method", async (): Promise<LinkResult> => {
    const [[u], linkedRows, [keys]] = await Promise.all([
      db
        .select({ email: users.email, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, uid))
        .limit(1),
      db
        .select({ provider: accounts.provider })
        .from(accounts)
        .where(eq(accounts.userId, uid)),
      db.select({ n: count() }).from(passkeys).where(eq(passkeys.userId, uid)),
    ])
    if (!u) return { ok: false, error: "Oturum bulunamadı." }
    if (!linkedRows.some((r) => r.provider === provider)) {
      return { ok: false, error: "Bu hesap bağlı değil." }
    }
    const otherProviders = linkedRows.filter((r) => r.provider !== provider)
    if (
      !u.passwordHash &&
      (keys?.n ?? 0) === 0 &&
      otherProviders.length === 0
    ) {
      return { ok: false, error: LAST_METHOD }
    }

    await db
      .delete(accounts)
      .where(and(eq(accounts.userId, uid), eq(accounts.provider, provider)))

    await db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(userSessions.userId, uid),
          isNull(userSessions.revokedAt),
          ne(userSessions.id, sid)
        )
      )

    if (u.email) {
      void sendMail({
        to: u.email,
        ...accountUnlinkedEmail({
          providerLabel: OAUTH_PROVIDER_LABELS[provider],
        }),
      })
    }
    return { ok: true }
  })
}

export async function unlinkGoogleAction(): Promise<LinkResult> {
  return startUnlink(await auth(), "google")
}

export async function unlinkFacebookAction(): Promise<LinkResult> {
  return startUnlink(await auth(), "facebook")
}
