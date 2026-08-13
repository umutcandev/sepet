"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/components/ui/sonner"

import { LoginDialog } from "@/components/auth/login-dialog"
import { useLoginDialog } from "@/lib/stores/login-dialog"
import { sessionSnapshot } from "@/lib/auth/session-snapshot"

// NextAuth başarısız akışları `pages` (= "/") + ?error=<kod> ile buraya düşürür
// (bkz. auth.ts). Kodların İngilizce adları @auth/core'un istemciye açtığı sabit
// kümedir (errors.ts → clientErrors; bunun dışındaki her hata "Configuration"a
// indirgenir). FacebookNoEmail ise signIn callback'imizin kendi yönlendirmesi.
//
// Düz nesne DEĞİL, Map: kod adres çubuğundan geliyor ve `{}[kod]` araması
// "__proto__" / "constructor" / "valueOf" gibi değerlerde prototip zincirine
// düşüp string yerine nesne ya da fonksiyon döndürür. Sonner başlığı doğrudan
// React child olarak basıyor (fonksiyonsa çağırıyor) → "Objects are not valid as
// a React child" ile render patlar. Map'te prototip anahtarı yok.
const AUTH_ERROR_MESSAGES = new Map<string, string>([
  // kind: "signIn" → pages.signIn
  [
    "OAuthAccountNotLinked",
    "Bu e-posta adresi zaten kayıtlı. Önce mevcut giriş yönteminle giriş yap.",
  ],
  [
    "AccountNotLinked",
    "Bu e-posta adresi zaten kayıtlı. Önce mevcut giriş yönteminle giriş yap.",
  ],
  ["OAuthCallbackError", "Giriş tamamlanamadı, tekrar dener misin?"],
  ["CredentialsSignin", "E-posta ya da şifren hatalı."],
  ["MissingCSRF", "Oturum doğrulaması geçersiz. Sayfayı yenileyip tekrar dene."],
  // kind: "error" → pages.error
  ["AccessDenied", "Giriş izni verilmedi."],
  ["Verification", "Bağlantının süresi dolmuş. Yeniden dene."],
  ["Configuration", "Giriş şu an yapılamıyor. Birazdan tekrar dener misin?"],
  // Kendi signIn callback'imizin yönlendirmesi (auth.ts).
  [
    "FacebookNoEmail",
    "Facebook hesabından e-posta alınamadı. E-posta ile devam edebilirsin.",
  ],
])

// NextAuth'un eklediği parametreler. `callbackUrl`'i pages.signIn yönlendirmesi
// koyuyor; ikisi de bize ait, işlendikten sonra adres çubuğunda kalmamalı ve
// aşağıdaki callbackUrl'e sızmamalı.
const AUTH_PARAMS = ["error", "callbackUrl"] as const

function withoutAuthParams(params: URLSearchParams | null): string {
  const rest = new URLSearchParams(params?.toString() ?? "")
  for (const key of AUTH_PARAMS) rest.delete(key)
  return rest.toString()
}

export function LoginDialogHost() {
  const { open, setOpen } = useLoginDialog()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const callbackUrl = React.useMemo(() => {
    if (!pathname) return "/"
    // Token sayfalarından (şifre sıfırlama, e-posta doğrulama) giriş sonrası aynı
    // sayfaya dönmek anlamsız: tek kullanımlık token zaten tükenmiş olur, kullanıcı
    // yeniden forma bakar. Bu sayfalarda her zaman ana sayfaya yönlendir.
    if (pathname === "/sifre-sifirla" || pathname === "/dogrula") return "/"
    // NextAuth'un kendi parametreleri dışarıda bırakılır: aksi halde başarısız
    // bir denemeden sonra açılan modal `?error=` kodunu callbackUrl'e taşır ve
    // BAŞARILI girişin ardından kullanıcı yeniden hata mesajıyla karşılaşır
    // (router.replace temizliği bir RSC gidiş-dönüşü sürdüğü için o aralıkta
    // butona basmak yeterli).
    const qs = withoutAuthParams(searchParams)
    return qs ? `${pathname}?${qs}` : pathname
  }, [pathname, searchParams])

  // Aynı hata kodunu iki kez işleme (StrictMode çift mount + router.replace
  // sonrası yeniden render).
  const handledError = React.useRef<string | null>(null)
  const authError = searchParams?.get("error") ?? null

  React.useEffect(() => {
    if (!authError || handledError.current === authError) return

    // Tanımadığımız koda hiç dokunma: bize ait olmayan bir ?error= parametresini
    // silmeyelim, uydurma bir kod da mesaj araması yaptırmasın.
    const message = AUTH_ERROR_MESSAGES.get(authError)
    if (!message) return

    handledError.current = authError

    // Snapshot'ta GERÇEK bir kullanıcı varsa bu hata bu tarayıcının başlattığı
    // bir giriş denemesinden gelmiyordur: sosyal giriş her zaman önce
    // markPending() yazar, misafirde ise snapshot zaten boştur. Oturumu açık
    // birine gönderilen ".../sayfa?error=..." linki onu misafir durumuna düşürüp
    // (data-session="guest" → header avatardan "Hemen Başla"ya döner) gerçek
    // domainde sahte bir giriş istemi göstermesin. Parametreyi sessizce temizle.
    const snapshot = sessionSnapshot.get()
    const looksSignedIn = snapshot !== null && !("pending" in snapshot)

    if (!looksSignedIn) {
      // Butona basılırken markPending() yazılmıştı; başarısız dönüşte bu iyimser
      // "authed" ipucu temizlenmezse header /api/me cevaplayana dek avatar
      // skeleton'ında takılı kalır.
      sessionSnapshot.set(null)
      toast.error(message)
      setOpen(true)
    }

    // ?error= adres çubuğunda kalmasın: yenilemede tekrar tetiklenir ve
    // paylaşılan link başkasına hata gösterir.
    const qs = withoutAuthParams(searchParams)
    router.replace(qs ? `${pathname}?${qs}` : (pathname ?? "/"), {
      scroll: false,
    })
  }, [authError, pathname, router, searchParams, setOpen])

  return <LoginDialog open={open} onOpenChange={setOpen} callbackUrl={callbackUrl} />
}
