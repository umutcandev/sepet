"use client"

import * as React from "react"
import Link from "next/link"
import { RiAlertLine, RiResetLeftLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"

/**
 * Rota sınırı hatası. Bu sayfalarda `error.tsx` hiç yoktu: eksik/bozuk bir
 * `summaryJson` sunucu bileşenini düşürdüğünde kullanıcı ham hata ekranı
 * görüyordu. Okuma yolu artık zod ile korunuyor (bkz. lib/basket-plan.ts), bu
 * ise geriye kalan her şey için ağ.
 */
export function RecordErrorState({
  error,
  reset,
  backHref,
  backLabel,
  title,
}: {
  error: Error & { digest?: string }
  reset: () => void
  backHref: string
  backLabel: string
  title: string
}) {
  React.useEffect(() => {
    console.error("[record detail] render failed", error)
  }, [error])

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <RiAlertLine className="size-5" />
      </div>
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Kayıt açılırken beklenmedik bir şey oldu. Tekrar deneyin.
      </p>
      <div className="mt-5 flex items-center justify-center gap-2">
        <Button type="button" onClick={reset}>
          <RiResetLeftLine className="mr-1.5 size-3.5" />
          Tekrar dene
        </Button>
        <Button variant="outline" asChild>
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </div>
    </div>
  )
}
