"use client"

import * as React from "react"
import { RiCloseLine } from "@remixicon/react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"
import { LoginForm } from "@/components/auth/login-form"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useRestoreFocusOnClose } from "@/hooks/use-restore-focus-on-close"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  callbackUrl?: string
}

export function LoginDialog({ open, onOpenChange, callbackUrl }: Props) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (isDesktop) {
    return (
      <DesktopDialog
        open={open}
        onOpenChange={onOpenChange}
        callbackUrl={callbackUrl}
      />
    )
  }

  return (
    <MobileDialog
      open={open}
      onOpenChange={onOpenChange}
      callbackUrl={callbackUrl}
    />
  )
}

// Mobil: bottom sheet DEĞİL, tam ekran takeover. Sheet (vaul) input odaklanınca
// klavyeye göre kendini yeniden konumlandırmaya çalışıyor ve iOS'ta zıplayıp
// gizlenebiliyordu. Tam ekranda yeniden konumlanacak bir şey yok: kapsayıcı
// h-dvh + iç kaydırma; klavye açılınca Android viewport'u küçültür
// (interactiveWidget: resizes-content), iOS odaklanan input'u en yakın
// kaydırılabilir atada görünür alana getirir.
function MobileDialog({ open, onOpenChange, callbackUrl }: Props) {
  // Trigger yok (store'dan açılıyor) → odağı geri veren tek mekanizma bu.
  // `open` ŞART: bu bileşen Root'la birlikte sürekli mount kalıyor, mount anı
  // açılış anı değil.
  const restoreFocus = useRestoreFocusOnClose(open)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onCloseAutoFocus={restoreFocus}
          className={cn(
            "fixed inset-0 z-50 flex h-dvh w-full flex-col bg-background outline-none",
            "data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-8",
            "data-closed:animate-out data-closed:fill-mode-forwards data-closed:fade-out-0 data-closed:slide-out-to-bottom-8",
            "duration-300",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Oturum Açın
          </DialogPrimitive.Title>

          <div className="flex-1 overflow-y-auto pt-[env(safe-area-inset-top)] pb-[max(env(safe-area-inset-bottom),1rem)]">
            <LoginForm callbackUrl={callbackUrl} />
          </div>

          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10"
              aria-label="Kapat"
            >
              <RiCloseLine />
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function DesktopDialog({ open, onOpenChange, callbackUrl }: Props) {
  const restoreFocus = useRestoreFocusOnClose(open)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-foreground/15 supports-backdrop-filter:backdrop-blur-xs",
            "data-open:animate-in data-open:fade-in-0",
            "data-closed:animate-out data-closed:fill-mode-forwards data-closed:fade-out-0",
            "duration-200",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onCloseAutoFocus={restoreFocus}
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex h-auto max-h-[min(720px,calc(100dvh-2rem))] w-[min(100%-2rem,420px)]",
            "-translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-background smooth-shadow-ring-lg outline-none",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
            "data-closed:animate-out data-closed:fill-mode-forwards data-closed:fade-out-0 data-closed:zoom-out-95",
            "duration-200",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Oturum Açın
          </DialogPrimitive.Title>

          <div className="relative flex w-full justify-center">
            <LoginForm callbackUrl={callbackUrl} />
          </div>

          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 right-3 z-10"
              aria-label="Kapat"
            >
              <RiCloseLine />
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
