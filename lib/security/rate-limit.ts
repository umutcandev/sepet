import { Ratelimit } from "@upstash/ratelimit"

import { redis } from "@/lib/redis"

export const productLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "rl:products",
  analytics: true,
})

export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:auth",
})

// Konum modalı pin sürükledikçe / mesafe değiştikçe /api/location/nearest'a
// (WAF korumalı external API'ye proxy) istek atar. Debounce + abort var; bu
// limit yalnızca kötüye kullanımı sınırlar, normal etkileşim altında kalır.
export const locationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(40, "1 m"),
  prefix: "rl:location",
  analytics: true,
})

export const receiptUploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "rl:receipts:upload",
  analytics: true,
})

// Avatar yükleme (/api/avatar/upload → R2). Profil fotoğrafı nadiren değişir;
// bu yüzden fişten daha sıkı bir tavan yeterli. Yalnızca kötüye kullanımı (R2'ye
// sürekli yükleme) sınırlar, normal kullanıcıyı etkilemez.
export const avatarUploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:avatar:upload",
  analytics: true,
})

// NOT: assistantBurstLimiter / assistantDailyLimiter kaldırıldı. AI asistanı
// (/api/assistant/chat) artık hesap özelinde aylık kota + atomik rezervasyon
// ile sınırlanıyor (bkz. lib/usage). Yukarıdaki limiter'lar yalnızca altyapı
// korumasıdır.

// /api/transcribe (sesli giriş → Gemini Flash Lite audio) bilinçli olarak aylık
// kotaya DAHİL DEĞİL ("mesaj mesajdır": üretilen metin /chat'te zaten sayılır).
// Ama gerçek bir AI maliyeti üretir ve eski assistant burst/daily limiter'ı
// kaldırılınca korumasız kaldı. Bu yüzden adanmış bir altyapı limiti uygulanır:
// burst kötü-amaçlı döngüyü kırar, günlük tavan tek bir hesabın bakiyeyi
// tüketmesini sert biçimde imkânsız kılar. Sayılar cömert ama sınırlı: gerçek
// bir sesli kullanıcı (her dikte ayrı kayıt) bu tavanlara çarpmaz.
export const transcribeBurstLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(15, "1 m"),
  prefix: "rl:transcribe:burst",
  analytics: true,
})

export const transcribeDailyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(80, "1 d"),
  prefix: "rl:transcribe:daily",
  analytics: true,
})

// Veri dışa aktarma (/api/privacy/export). Her istek tüm kullanıcı verisini
// derleyip fiş görsellerini R2'den çekip ZIP'ler — pahalı. Hesap özelinde
// (userId anahtarıyla) sıkı bir tavan: normal kullanıcı nadiren dışa aktarır,
// bu limit yalnızca tekrar tekrar tetikleyen kötüye kullanımı sınırlar.
export const exportLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  prefix: "rl:privacy:export",
  analytics: true,
})

// ─── E-posta/şifre kimlik doğrulama limiter'ları ───
// Bunlar proxy.ts değil, server action'lar içinde uygulanır (bkz.
// lib/security/action-rate-limit.ts). Derinlemesine savunma: DB `attempts`
// kolonları asıl sert limittir (Redis flush'a dayanıklı); aşağıdakiler yumuşak
// throttle katmanıdır.

// Şifreyle giriş. Aynı limiter iki ayrı anahtarla çağrılır: hem IP hem e-posta
// başına (brute-force iki eksenden de sınırlanır).
export const credentialsLoginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:auth:login",
  analytics: true,
})

// Kayıt başlatma (e-posta doğrulama). IP başına.
export const registerLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  prefix: "rl:auth:register",
  analytics: true,
})

// E-posta gönderimi — e-posta başına sıkı tavan (posta kutusu spam'lenmesin).
export const emailSendLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "10 m"),
  prefix: "rl:auth:email",
  analytics: true,
})

// E-posta gönderimi — IP başına (bir IP'nin toplu mail tetiklemesini keser).
export const emailSendIpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  prefix: "rl:auth:email:ip",
  analytics: true,
})

// Kod doğrulama denemeleri. Anahtar: e-posta veya tokenHash.
export const codeVerifyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:auth:code",
  analytics: true,
})

// 2FA kod denemeleri. Anahtar: pending tokenHash.
export const twoFactorLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "rl:auth:2fa",
  analytics: true,
})

// Şifre değiştirme/belirleme. Anahtar: userId.
export const passwordChangeLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  prefix: "rl:auth:pwchange",
  analytics: true,
})
