"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { LoginDialog } from "@/components/auth/login-dialog"
import { useLoginDialog } from "@/lib/stores/login-dialog"
import { sessionSnapshot } from "@/lib/auth/session-snapshot"

// NextAuth başarısız OAuth akışlarını `pages.error` (= "/") + ?error=<kod> ile
// buraya düşürür (bkz. auth.ts). Kodların İngilizce adları @auth/core'dan gelir;
// FacebookNoEmail ise signIn callback'imizin kendi yönlendirmesidir.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "Bu e-posta adresi zaten kayıtlı. Önce mevcut giriş yönteminle giriş yap.",
  FacebookNoEmail:
    "Facebook hesabından e-posta alınamadı. E-posta ile devam edebilirsin.",
  AccessDenied: "Giriş izni verilmedi.",
}

const AUTH_ERROR_FALLBACK = "Giriş yapılamadı, tekrar dener misin?"

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
    const qs = searchParams?.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }, [pathname, searchParams])

  // Aynı hata kodunu iki kez işleme (StrictMode çift mount + router.replace
  // sonrası yeniden render).
  const handledError = React.useRef<string | null>(null)
  const authError = searchParams?.get("error") ?? null

  React.useEffect(() => {
    if (!authError || handledError.current === authError) return
    handledError.current = authError

    // Butona basılırken markPending() yazılmıştı; başarısız dönüşte bu iyimser
    // "authed" ipucu temizlenmezse header /api/me cevaplayana dek avatar
    // skeleton'ında takılı kalır.
    sessionSnapshot.set(null)

    toast.error(AUTH_ERROR_MESSAGES[authError] ?? AUTH_ERROR_FALLBACK)
    setOpen(true)

    // ?error= adres çubuğunda kalmasın: yenilemede tekrar tetiklenir ve
    // paylaşılan link başkasına hata gösterir.
    const rest = new URLSearchParams(searchParams?.toString() ?? "")
    rest.delete("error")
    const qs = rest.toString()
    router.replace(qs ? `${pathname}?${qs}` : (pathname ?? "/"), {
      scroll: false,
    })
  }, [authError, pathname, router, searchParams, setOpen])

  return <LoginDialog open={open} onOpenChange={setOpen} callbackUrl={callbackUrl} />
}
