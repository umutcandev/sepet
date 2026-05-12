"use client"

import * as React from "react"
import Image from "next/image"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"
import { LoginForm } from "@/components/auth/login-form"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  callbackUrl?: string
}

export function LoginDialog({ open, onOpenChange, callbackUrl }: Props) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-foreground/15 supports-backdrop-filter:backdrop-blur-xs",
            "data-open:animate-in data-open:fade-in-0",
            "data-closed:animate-out data-closed:fade-out-0",
            "duration-200",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            // Mobile (default): full-screen slide-up
            "fixed inset-0 z-50 flex w-full max-w-none bg-background outline-none",
            "data-open:animate-in data-open:slide-in-from-bottom-8 data-open:fade-in-0",
            "data-closed:animate-out data-closed:slide-out-to-bottom-8 data-closed:fade-out-0",
            "duration-200",
            // Desktop (≥768px): centered two-column dialog
            "md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:max-h-[min(720px,calc(100dvh-2rem))] md:w-[min(100%-2rem,860px)]",
            "md:-translate-x-1/2 md:-translate-y-1/2 md:overflow-hidden md:rounded-xl md:ring-1 md:ring-foreground/10",
            "md:data-open:slide-in-from-bottom-0 md:data-open:zoom-in-95",
            "md:data-closed:slide-out-to-bottom-0 md:data-closed:zoom-out-95",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Giriş Yap
          </DialogPrimitive.Title>

          {/* Mobile-only: background image with bottom gradient */}
          <div className="absolute inset-0 md:hidden">
            <Image
              src="/login-image.webp"
              alt=""
              fill
              priority
              quality={95}
              sizes="100vw"
              className="object-cover object-top"
            />
            <div className="absolute inset-x-0 bottom-0 h-[50%] bg-[linear-gradient(to_top,var(--background)_0%,color-mix(in_oklab,var(--background)_85%,transparent)_55%,transparent_100%)]" />
          </div>

          {/* Desktop-only: left image column */}
          <div className="relative hidden md:block md:flex-1">
            <Image
              src="/login-image.webp"
              alt=""
              fill
              priority
              sizes="(min-width: 768px) 50vw, 0"
              className="object-cover"
            />
          </div>

          {/* Form column */}
          <div className="relative flex w-full justify-center md:w-[420px] md:shrink-0">
            <LoginForm variant="md" callbackUrl={callbackUrl} />
          </div>

          {/* Close button */}
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 right-3 z-10 bg-background/70 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none"
              aria-label="Kapat"
            >
              <XIcon />
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
