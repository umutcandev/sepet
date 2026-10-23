"use client"

import * as React from "react"
import { toast } from "@/components/ui/sonner"

// Ayarlar > Bağlı hesaplar dönüşünü karşılar: bağlama sağlayıcının sayfasından
// `/?hesap-baglama=<sonuç>` ile döner (başarı: lib/actions/linked-accounts.ts,
// red: auth.ts signIn callback). Bir kez toast gösterip parametreyi temizler
// (bkz. CheckoutResultHost aynı desen).
const MESSAGES: Record<string, () => void> = {
  basarili: () =>
    toast.success("Hesap bağlandı. Artık onunla da giriş yapabilirsin."),
  "baska-hesap": () =>
    toast.error("Bu hesap başka bir Sepet hesabına bağlı.", {
      description: "Önce o hesaptan kaldırman gerekir.",
    }),
  yetki: () =>
    toast.error("Hesap bağlanamadı.", {
      description: "Ayarlar > Hesap > Bağlı hesaplar'dan yeniden dene.",
    }),
  oturum: () =>
    toast.error("Oturumunun süresi dolmuş.", {
      description: "Tekrar giriş yapıp yeniden dene.",
    }),
}

export function AccountLinkResultHost() {
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get("hesap-baglama")
    if (!result) return

    // Map değil düz nesne ama yalnız kendi anahtarları (prototip zinciri değil).
    // Bir sonraki tick'e ertelenir: bu effect, layout'ta sonra gelen
    // <Toaster>'ın abone olduğu effect'ten ÖNCE çalışıyor; sonner o anda
    // dinleyicisi olmayan toast'u düşürüyordu.
    const show = Object.hasOwn(MESSAGES, result) ? MESSAGES[result] : null
    if (show) window.setTimeout(show, 0)

    const url = new URL(window.location.href)
    url.searchParams.delete("hesap-baglama")
    window.history.replaceState(null, "", url.pathname + url.search)
  }, [])

  return null
}
