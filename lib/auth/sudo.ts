import "server-only"

import { redis } from "@/lib/redis"

// ─── "Sudo" penceresi: hassas işlem öncesi yeniden doğrulama ───
// Salt oturum cookie'si, kalıcı erişim veren işlemler (geçiş anahtarı ekleme)
// ya da giriş yöntemini silmek için yeterli değil: çalınmış bir cookie'yle
// saldırgan kendi anahtarını ekleyip oturum kapatılsa bile hesaba dönebilirdi.
// Kullanıcı bir faktörle (geçiş anahtarı, şifre, TOTP ya da şifresiz hesapta
// e-posta kodu) kimliğini teyit edince BU oturum için 10 dk'lık bir pencere
// açılır (GitHub sudo modu gibi); pencere kayan değil, sabittir.
//
// Anahtar cihaz oturumuna (sid) bağlıdır: başka cihazdaki teyit buraya geçmez.
// sid yalnız oturum kaydı yazılamadıysa yoktur; o oturumda pencere HİÇ açılmaz.
// Kullanıcı kapsamlı ortak bir anahtar, sid'siz bütün oturumlara (başka
// cihazlar dahil) aynı pencereyi verirdi.
const SUDO_TTL_S = 10 * 60

function sudoKey(userId: string, sid: string) {
  return `sudo:${userId}:${sid}`
}

export async function grantSudo(userId: string, sid: string | undefined) {
  if (!sid) return
  await redis.set(sudoKey(userId, sid), 1, { ex: SUDO_TTL_S })
}

export async function hasSudo(
  userId: string,
  sid: string | undefined
): Promise<boolean> {
  if (!sid) return false
  return (await redis.exists(sudoKey(userId, sid))) === 1
}
