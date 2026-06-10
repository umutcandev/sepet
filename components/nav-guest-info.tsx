"use client"

import * as React from "react"
import { ArrowUpRightIcon, XIcon } from "lucide-react"

import { useMounted } from "@/hooks/use-mounted"

const DISMISS_KEY = "sepet:guest-beta-notice-dismissed"

export function NavGuestInfo() {
  const mounted = useMounted()
  const [dismissed, setDismissed] = React.useState(false)

  React.useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1")
    } catch {
      // localStorage erişilemezse (ör. gizli mod) kutuyu göstermeye devam et
    }
  }, [])

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
    <div className="relative mb-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3.5 group-data-[collapsible=icon]:hidden">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Kapat"
        className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-foreground"
      >
        <XIcon className="size-4" />
      </button>

      <p className="pr-6 text-[14px] font-medium leading-tight text-foreground">
        Geri bildirim
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        Sepet geliştirme aşamasındadır. Bir hata fark edersen ya da fikrin varsa
        GitHub üzerinden bize ulaşabilirsin.
      </p>
      <a
        href="https://github.com/umutcandev/sepet"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-foreground underline-offset-2 transition-colors hover:underline"
      >
        GitHub&apos;da katkıda bulun
        <ArrowUpRightIcon className="size-3.5" />
      </a>
    </div>
  )
}
