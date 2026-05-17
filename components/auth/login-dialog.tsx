"use client"

import * as React from "react"
import Image from "next/image"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"
import { LoginForm } from "@/components/auth/login-form"
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query"
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-background">
        <DrawerTitle className="sr-only">Giriş Yap</DrawerTitle>
        <div className="flex justify-center">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function DesktopDialog({ open, onOpenChange, callbackUrl }: Props) {
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
            "fixed top-1/2 left-1/2 z-50 flex h-auto max-h-[min(720px,calc(100dvh-2rem))] w-[min(100%-2rem,860px)]",
            "-translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-background ring-1 ring-foreground/10 outline-none",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
            "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            "duration-200",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Giriş Yap
          </DialogPrimitive.Title>

          <div className="relative flex-1">
            <Image
              src="/login-image.webp"
              alt=""
              fill
              priority
              sizes="(min-width: 768px) 50vw, 0"
              className="object-cover"
            />
          </div>

          <div className="relative flex w-[420px] shrink-0 justify-center">
            <LoginForm callbackUrl={callbackUrl} />
          </div>

          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 right-3 z-10"
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
