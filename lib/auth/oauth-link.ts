import "server-only"

import { and, eq } from "drizzle-orm"
import type { AdapterAccountType } from "next-auth/adapters"

import { db, users, accounts } from "@/lib/db"
import { redis } from "@/lib/redis"
import { createPendingLogin, PENDING_TTL_MS } from "@/lib/auth/pending-login"
import { hasSudo } from "@/lib/auth/sudo"

// ─── Google'ın TOTP'li bir hesaba İLK bağlanışı ───
// Google, e-posta eşleşmesiyle mevcut hesaba otomatik bağlanır
// (allowDangerousEmailAccountLinking, bkz. auth.ts). 2FA yalnız şifreyle girişi
// korur; zaten bağlı bir Google hesabıyla giriş TOTP sormaz (bilinçli). Ama
// bağlantı kurulurken de sorulmasaydı, e-postası Google hesabı olan kullanıcının
// o hesabını ele geçiren TOTP'ye hiç takılmadan girerdi.
//
// Bu yüzden ilk bağlamada Auth.js bağlamadan ÖNCE durdurulur (signIn callback):
// pending_login + bekleyen bağlama kaydı yazılır, kullanıcı mevcut 2FA adımına
// gider (aynı deneme sınırı ve hız limitleri). Kod doğrulanınca hesap bağlanır;
// sonraki Google girişleri bağlı hesap olarak TOTP'siz devam eder.

type PendingLink = {
  u: string
  provider: string
  providerAccountId: string
  type: AdapterAccountType
}

const linkKey = (pendingId: string) => `oauth-link:${pendingId}`

/**
 * Otomatik bağlama hedefinin e-postası KANITLANMAMIŞ mı?
 *
 * Google, e-posta eşleşmesiyle mevcut satıra otomatik bağlanıyor. Bu yalnız
 * satırın e-postası daha önce kanıtlandıysa güvenli: aksi halde saldırgan
 * kurbanın adresini İDDİA eden bir sağlayıcıyla (Facebook — Graph yanıtında
 * email_verified yok) satırı önden yaratır, kurban Google ile girince aynı
 * hesaba bağlanır ve ikisi aynı hesabı paylaşır (ön-kayıt / hesap devralma).
 *
 * Kanıt `users.emailVerified`'da KALICI tutulur: e-posta kodlu kayıt, posta
 * kutusuna giden bağlantıyla şifre belirleme ve e-postası satırla eşleşen
 * doğrulanmış bir Google girişi onu doldurur; Auth.js OAuth ile oluşturduğu
 * satırda null bırakır. Eskiden "satırda ŞU AN Facebook hesabı var mı" diye
 * bakılıyordu; saldırgan Ayarlar'dan başka bir giriş yolu ekleyip Facebook'u
 * kaldırınca iz siliniyordu. Kanıtsız satıra bağlama reddedilir; kullanıcı
 * mevcut yöntemiyle girmeye yönlendirilir (OAuthAccountNotLinked). Bu OAuth
 * hesabı zaten bağlıysa (normal giriş) engel yok.
 */
export async function isUnverifiedLinkTarget(input: {
  email: string | null | undefined
  provider: string
  providerAccountId: string
}): Promise<boolean> {
  if (!input.email) return false

  const [linked] = await db
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, input.provider),
        eq(accounts.providerAccountId, input.providerAccountId)
      )
    )
    .limit(1)
  if (linked) return false

  // Auth.js'in otomatik bağlamada kullandığı eşleşmenin aynısı (getUserByEmail).
  const [target] = await db
    .select({ emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1)
  return Boolean(target) && target.emailVerified == null
}

/**
 * Bu OAuth hesabı henüz bağlı değilse ve aynı e-postalı mevcut hesapta TOTP
 * açıksa 2FA adımı için ham pending token döner; aksi halde null (giriş normal
 * sürer).
 */
export async function beginLinkTwoFactor(input: {
  email: string | null | undefined
  provider: string
  providerAccountId: string
  type: AdapterAccountType
}): Promise<string | null> {
  if (!input.email) return null

  const [linked] = await db
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, input.provider),
        eq(accounts.providerAccountId, input.providerAccountId)
      )
    )
    .limit(1)
  if (linked) return null

  // Auth.js'in otomatik bağlamada kullandığı eşleşmenin aynısı (getUserByEmail;
  // e-posta küçük harfe çevrilmiş gelir).
  const [u] = await db
    .select({ id: users.id, totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1)
  if (!u?.totpEnabled) return null

  const pending = await createPendingLogin(u.id)
  await redis.set<PendingLink>(
    linkKey(pending.id),
    {
      u: u.id,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      type: input.type,
    },
    { ex: Math.ceil(PENDING_TTL_MS / 1000) }
  )
  return pending.token
}

/**
 * 2FA bu pending ile başarıyla tamamlandı: bekleyen bir bağlama varsa hesabı
 * bağla. Sağlayıcı token'ları saklanmaz (uygulama kullanmıyor); bağlantı yalnız
 * kimlik eşlemesi. Hesap bu arada başka kullanıcıya bağlandıysa dokunulmaz.
 */
export async function completeLinkTwoFactor(pendingId: string, userId: string) {
  const link = await redis.getdel<PendingLink>(linkKey(pendingId))
  if (!link || link.u !== userId) return
  await db
    .insert(accounts)
    .values({
      userId,
      type: link.type,
      provider: link.provider,
      providerAccountId: link.providerAccountId,
    })
    .onConflictDoNothing()
}

// ─── Oturum açıkken hesap bağlama (Ayarlar > Bağlı hesaplar) ───
// Auth.js, oturum çerezi varken bağlı olmayan bir OAuth hesabıyla gelinirse o
// hesabı e-postaya bakmadan ÇEREZDEKİ kullanıcıya bağlar (handle-login.js).
// Çerezi kendisi çözer; bizim iptal kontrolümüzü (user_session) ve sudo
// penceresini bilmez. Kısıt olmasaydı çalınmış — hatta iptal edilmiş ama
// süresi dolmamış — bir çerezle /api/auth/signin/google'a gidip saldırganın
// Google hesabını kurbanın hesabına bağlamak mümkündü: şifre değişikliğinden ve
// oturum kapatmadan sağ çıkan kalıcı bir giriş yolu.
//
// Bu yüzden oturum açıkken bağlama yalnız Ayarlar'dan başlatılan, sudo'lu ve
// AYNI cihaz oturumuna (sid) ait bir niyet kaydıyla geçer (signIn callback,
// bkz. auth.ts). Niyet tek kullanımlıktır.

type LinkIntent = { provider: string; sid: string }
// Bağlama onayı: AYNI OAuth hesabı (providerAccountId) için ve yalnız bu
// girişte geçerli. newLink: yeni bir bağlantı mı (bildirim e-postası) yoksa
// zaten bağlı hesapla yeniden doğrulama mı.
type LinkDone = LinkIntent & { providerAccountId: string; newLink: boolean }

const LINK_INTENT_TTL_S = 10 * 60
// signIn callback'ten jwt callback'e: bağlama onaylandı, yeni oturum kaydı
// açma, bu cihazın mevcut kaydını (sid) sürdür.
const LINK_DONE_TTL_S = 5 * 60

const linkIntentKey = (userId: string) => `oauth-link-intent:${userId}`
const linkDoneKey = (userId: string) => `oauth-link-done:${userId}`

/** Ayarlar'dan bağlama başlatılırken (sudo doğrulandıktan sonra) yazılır. */
export async function recordLinkIntent(
  userId: string,
  sid: string,
  provider: string
) {
  await redis.set<LinkIntent>(
    linkIntentKey(userId),
    { provider, sid },
    { ex: LINK_INTENT_TTL_S }
  )
}

/**
 * Oturum açıkken gelen OAuth girişi için signIn callback kararı: `true`
 * (Auth.js bu hesabı oturumdaki kullanıcıya bağlar ya da zaten bağlıysa hiçbir
 * şey yapmaz) veya bir yönlendirme adresi (bağlama yapılmaz).
 */
export async function authorizeInSessionLink(input: {
  userId: string
  sid: string
  provider: string
  providerAccountId: string
}): Promise<true | string> {
  const [linked] = await db
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, input.provider),
        eq(accounts.providerAccountId, input.providerAccountId)
      )
    )
    .limit(1)
  if (linked) {
    if (linked.userId !== input.userId) return "/?hesap-baglama=baska-hesap"
    // Zaten bu kullanıcıya bağlı: Auth.js bağlamaz, yalnız yeniden giriş
    // yapar. Bu cihazın mevcut oturum kaydı sürsün (yeni kayıt açılmasın).
    await markLinkDone(input, false)
    return true
  }

  const intent = await redis.getdel<LinkIntent>(linkIntentKey(input.userId))
  if (
    !intent ||
    intent.provider !== input.provider ||
    intent.sid !== input.sid ||
    !(await hasSudo(input.userId, input.sid))
  ) {
    return "/?hesap-baglama=yetki"
  }

  await markLinkDone(input, true)
  return true
}

async function markLinkDone(
  input: {
    userId: string
    sid: string
    provider: string
    providerAccountId: string
  },
  newLink: boolean
) {
  await redis.set<LinkDone>(
    linkDoneKey(input.userId),
    {
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      sid: input.sid,
      newLink,
    },
    { ex: LINK_DONE_TTL_S }
  )
}

/**
 * jwt callback (ilk giriş dalı): bu giriş Ayarlar'dan onaylanmış bir oturum içi
 * girişse cihazın mevcut oturum kaydı (yeni kayıt açılmaz), değilse null.
 * Sağlayıcı ve sağlayıcı hesabı (providerAccountId) da eşleşmeli: aynı
 * kullanıcının aynı sağlayıcıdaki başka bir girişi (ör. başka cihazda) bu
 * kaydı devralamaz.
 */
export async function takeLinkedSession(
  userId: string,
  account: { provider?: string; providerAccountId?: string } | null | undefined
): Promise<{ sid: string; newLink: boolean } | null> {
  if (!account?.provider || !account.providerAccountId) return null
  const done = await redis.get<LinkDone>(linkDoneKey(userId))
  if (
    !done ||
    done.provider !== account.provider ||
    done.providerAccountId !== account.providerAccountId
  ) {
    return null
  }
  await redis.del(linkDoneKey(userId))
  return { sid: done.sid, newLink: done.newLink }
}
