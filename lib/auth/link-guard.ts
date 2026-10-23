import "server-only"

// ─── Hesap bağlamada ikinci savunma hattı ───
// Auth.js bir OAuth hesabını mevcut bir kullanıcıya üç yoldan bağlar
// (@auth/core handle-login.js): oturum çerezindeki kullanıcıya (oturum içi),
// e-posta eşleşmesiyle (allowDangerousEmailAccountLinking) ya da yeni yarattığı
// kullanıcıya. İlk ikisinin kararı signIn callback'te verilir (bkz. auth.ts),
// ama Auth.js'in "oturum var mı / kime bağlanacak" hesabı bizimkinden ayrı
// yürüyor; ikisi bir gün ayrışırsa (ör. çerez adı kuralı) bağlama sessizce
// yanlış kullanıcıya yapılabilirdi.
//
// Bu yüzden adapter.linkAccount sarılır: bir hesap yalnız (a) bu istekte
// yaratılmış bir kullanıcıya ya da (b) signIn callback'in AYNI sağlayıcı
// hesabı için açıkça izin verdiği hedefe bağlanabilir. signIn callback ile
// linkAccount aynı istekte, aynı süreçte arka arkaya çalışır; izin kısa ömürlü
// ve tek kullanımlıktır.

type Allowance = { expires: number } & ({ userId: string } | { email: string })

const TTL_MS = 60_000
const allowances = new Map<string, Allowance>()
const createdUsers = new Map<string, number>()

const accountKey = (provider: string, providerAccountId: string) =>
  `${provider}:${providerAccountId}`

function prune(now: number) {
  for (const [k, v] of allowances) if (v.expires < now) allowances.delete(k)
  for (const [k, exp] of createdUsers) if (exp < now) createdUsers.delete(k)
}

/** signIn callback: bu sağlayıcı hesabının bağlanabileceği hedef. */
export function allowLink(
  provider: string,
  providerAccountId: string,
  target: { userId: string } | { email: string }
) {
  const now = Date.now()
  prune(now)
  allowances.set(accountKey(provider, providerAccountId), {
    ...target,
    expires: now + TTL_MS,
  })
}

/** adapter.createUser: bu istekte yaratılan kullanıcı. */
export function markUserCreated(userId: string) {
  const now = Date.now()
  prune(now)
  createdUsers.set(userId, now + TTL_MS)
}

/**
 * adapter.linkAccount öncesi. İzin yoksa fırlatır (Auth.js girişi hata
 * sayfasına düşürür, bağlama yapılmaz). `emailOf` yalnız e-posta hedefli
 * izinde hedef kullanıcının adresini okumak için çağrılır.
 */
export async function assertLinkAllowed(
  link: { provider: string; providerAccountId: string; userId: string },
  emailOf: (userId: string) => Promise<string | null>
): Promise<void> {
  const now = Date.now()
  const created = createdUsers.get(link.userId)
  if (created !== undefined && created >= now) {
    createdUsers.delete(link.userId)
    return
  }
  const key = accountKey(link.provider, link.providerAccountId)
  const allowance = allowances.get(key)
  allowances.delete(key)
  if (allowance && allowance.expires >= now) {
    if ("userId" in allowance && allowance.userId === link.userId) return
    if ("email" in allowance) {
      const email = await emailOf(link.userId)
      if (email && email.toLowerCase() === allowance.email.toLowerCase()) return
    }
  }
  throw new Error("account_link_not_allowed")
}
