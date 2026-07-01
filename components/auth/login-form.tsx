"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowUpRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LEGAL_LAST_UPDATED,
  PrivacyContent,
  TermsContent,
} from "@/components/legal/legal-content"
import { signInWithGoogleAction } from "@/lib/actions/auth"

type Props = {
  callbackUrl?: string
}

export function LoginForm({ callbackUrl }: Props) {
  return (
    <div className="flex w-full max-w-[402px] flex-col items-center px-6 pt-10 pb-6 text-center md:pt-12">
      <Image
        src="/brand/sepet-square-dark.webp"
        alt="Sepet"
        width={256}
        height={256}
        className="h-16 w-16 rounded-xl dark:hidden"
      />
      <Image
        src="/brand/sepet-square-light.webp"
        alt=""
        aria-hidden
        width={256}
        height={256}
        className="hidden h-16 w-16 rounded-xl dark:block"
      />

      <h1 className="mt-5 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
        Oturum Açın
      </h1>
      <p className="mt-2 max-w-[300px] text-[14px] leading-[1.4] tracking-[-0.01em] text-muted-foreground">
        Ne alacağını yaz, Sepet&apos;in için en ucuz marketi bulalım.
      </p>

      <form
        className="mt-7 w-full"
        action={async () => {
          await signInWithGoogleAction(callbackUrl)
        }}
      >
        <Button
          type="submit"
          size="lg"
          className="h-[44px] w-full gap-2 rounded-xl px-[6px] text-[14px] font-medium tracking-[-0.01em]"
        >
          <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full">
            <GoogleIcon />
          </span>
          Google ile giriş yap
        </Button>
      </form>

      <p className="mt-3.5 text-[11px] leading-[1.5] tracking-[-0.005em] text-muted-foreground/60">
        Devam ederek <TermsDialog /> ve <PrivacyDialog />&apos;i kabul ediyorsun.
      </p>
    </div>
  )
}

function TermsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Şartlar
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Kullanım Şartları</DialogTitle>
          <DialogDescription>
            Son güncelleme: {LEGAL_LAST_UPDATED}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <TermsContent />
        </ScrollArea>
        <Link
          href="/kullanim-sartlari"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          Tam sayfada aç
          <ArrowUpRightIcon className="size-3" />
        </Link>
      </DialogContent>
    </Dialog>
  )
}

function PrivacyDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Gizlilik Politikası
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gizlilik Politikası</DialogTitle>
          <DialogDescription>
            Son güncelleme: {LEGAL_LAST_UPDATED}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <PrivacyContent />
        </ScrollArea>
        <Link
          href="/gizlilik"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          Tam sayfada aç
          <ArrowUpRightIcon className="size-3" />
        </Link>
      </DialogContent>
    </Dialog>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}
