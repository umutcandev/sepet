"use client"

import * as React from "react"
import { toast } from "@/components/ui/sonner"

// Polar checkout dönüşünü karşılar: successUrl `/?abonelik=basarili` (hata
// durumunda `/?abonelik=hata`) ile döner. Bir kez toast gösterip query param'ı
// URL'den temizler — böylece sayfa yenilenince toast tekrar çıkmaz. Plan'ı
// webhook kısa süre içinde Pro'ya çeker; kullanıcı Ayarlar → Abonelik'te güncel
// durumu görür. window.location okunduğu için Suspense sınırı gerektirmez.
export function CheckoutResultHost() {
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get("abonelik")
    if (!result) return

    // Bir sonraki tick'e ertelenir: bu effect, layout'ta sonra gelen
    // <Toaster>'ın abone olduğu effect'ten ÖNCE çalışıyor; sonner o anda
    // dinleyicisi olmayan toast'u düşürüyordu (ödeme dönüşü bildirimi hiç
    // görünmüyordu).
    window.setTimeout(() => showResult(result), 0)

    const url = new URL(window.location.href)
    url.searchParams.delete("abonelik")
    window.history.replaceState(null, "", url.pathname + url.search)
  }, [])

  return null
}

function showResult(result: string) {
  if (result === "basarili") {
    toast.success("Pro aboneliğin alındı!", {
      description:
        "Yeni limitlerin birkaç saniye içinde etkinleşir. Teşekkürler!",
    })
  } else if (result === "hata") {
    toast.error("Ödeme tamamlanamadı", {
      description: "Bir şeyler ters gitti. Lütfen tekrar dene.",
    })
  } else if (result === "portal-yok") {
    toast.info("Yönetilecek abonelik bulunamadı", {
      description: "Henüz Polar üzerinden alınmış bir aboneliğin yok.",
    })
  } else if (result === "portal-hata") {
    toast.error("Abonelik portalı açılamadı", {
      description: "Lütfen birazdan tekrar dene.",
    })
  }
}
