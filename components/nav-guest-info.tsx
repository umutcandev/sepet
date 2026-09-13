"use client"

import * as React from "react"
import { RiArrowRightUpLine, RiCloseLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import { Squircle } from "@/components/ui/squircle"
import { useMounted } from "@/hooks/use-mounted"

const DISMISS_KEY = "sepet:guest-beta-notice-dismissed"

export function NavGuestInfo() {
  const mounted = useMounted()
  // Başlangıç değerini lazy initializer'da localStorage'dan oku — setState'i
  // effect içinde çağırmak yerine (react-hooks/set-state-in-effect). Render
  // zaten `mounted` ile geciktirildiği için SSR/hydration uyuşmazlığı olmaz:
  // sunucuda ve ilk client render'da `mounted` false → null döner.
  const [dismissed, setDismissed] = React.useState(() => {
    if (typeof window === "undefined") return false
    try {
      return window.localStorage.getItem(DISMISS_KEY) === "1"
    } catch {
      // localStorage erişilemezse (ör. gizli mod) kutuyu göstermeye devam et
      return false
    }
  })

  const handleDismiss = () => {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, "1")
    } catch {
      // Yoksay: bir sonraki ziyarette tekrar görünür, sorun değil
    }
  }

  if (!mounted || dismissed) return null

  return (
    // Sarmalayıcı gizlemeyi ve marjı taşır, Squircle'ın kendisi değil: `effects`
    // açıkken Lisse araya bir div doğuruyor ve `hidden` içerideki elemana
    // düştüğü için rayda o boş kutu footer'ın gap'inden pay almaya devam ederdi.
    <div className="mb-2 group-data-[collapsible=icon]:hidden">
      {/* Yüzey reçetesi sitedeki diğer kartlarla BİREBİR (bkz. featured-post-card):
          radius="xl" + effects + bg-card + smooth-shadow-ring-sm, `border` YOK.
          Kapat düğmesinin odak halkası 8px içeride, clip-path'e takılmıyor. */}
      <Squircle
        radius="xl"
        effects
        className="relative bg-card p-3.5 smooth-shadow-ring-sm"
      >
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleDismiss}
          aria-label="Kapat"
          className="absolute top-2 right-2 text-muted-foreground/60 hover:text-foreground"
        >
          <RiCloseLine />
        </Button>

        <p className="cn-font-heading pr-6 text-sm leading-snug font-medium text-card-foreground">
          Geri bildirim
        </p>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
          Sepet geliştirme aşamasındadır. Bir hata fark edersen ya da fikrin
          varsa GitHub üzerinden bize ulaşabilirsin.
        </p>
        {/* Buton DEĞİL bağlantı: hemen altında Oturum Açın düğmesi duruyor, iki
            dolu yüzey üst üste gelince hangisinin asıl eylem olduğu kayboluyor. */}
        <a
          href="https://github.com/umutcandev/sepet"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-[0.8125rem] font-medium text-foreground underline-offset-4 transition-colors hover:underline"
        >
          GitHub&apos;da katkıda bulun
          <RiArrowRightUpLine className="size-3.5" />
        </a>
      </Squircle>
    </div>
  )
}
