import "server-only"

import { randomUUID } from "node:crypto"

import { redis } from "@/lib/redis"

// Kullanıcı + kapsam başına kısa ömürlü Redis kilidi. neon-http transaction
// desteklemediğinden "kontrol et → yaz" adımları tek ifadede atomik değil;
// action doğrudan ve paralel çağrılabildiği için kontrol iki istekte de geçip
// kural delinebiliyordu. Kilit bu aralığı aynı kullanıcı için serileştirir.
// TTL, kilidi tutan istek düşerse kilidin kendiliğinden açılmasını sağlar.
//
// Kapsamlar:
//  - "basket" / "receipt": depolama kotası (count → insert, bkz. saveBasket /
//    saveReceipt).
//  - "login-method": son giriş yöntemi kuralı. Geçiş anahtarı silme ve bağlı
//    hesap kaldırma AYNI kapsamı kullanır; ayrı kilitlerle "Google'ı kaldır" ve
//    "son anahtarı sil" paralel gönderilip her ikisi de diğerini hâlâ var
//    görürdü ve hesap giriş yöntemsiz kalırdı.
export type UserLockScope = "basket" | "receipt" | "login-method"

const LOCK_TTL_S = 15
const RETRY_DELAY_MS = 100
const MAX_ATTEMPTS = 30

// Yalnız kilidi alan isteğin token'ıyla eşleşiyorsa sil: TTL dolup başka bir
// istek kilidi aldıysa onunkini bırakma.
const RELEASE_SCRIPT = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`

export async function withUserLock<T>(
  userId: string,
  scope: UserLockScope,
  fn: () => Promise<T>
): Promise<T> {
  const key = `lock:user:${scope}:${userId}`
  const token = randomUUID()
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const acquired = await redis.set(key, token, { nx: true, ex: LOCK_TTL_S })
    if (acquired) {
      try {
        return await fn()
      } finally {
        await redis.eval(RELEASE_SCRIPT, [key], [token]).catch(() => {})
      }
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
  }
  throw new Error("user_lock_timeout")
}
