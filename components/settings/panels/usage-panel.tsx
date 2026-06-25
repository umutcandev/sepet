"use client"

import * as React from "react"
import { RefreshCwIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { getUsageSnapshot } from "@/lib/actions/usage"
import type { UsageSnapshot } from "@/lib/usage/usage"

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

const timeFmt = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
})

// Dialog kapanınca Radix içeriği unmount eder → her açılışta bu panel sıfırdan
// mount olur ve "loading" ile başlar. Veri mount'ta bir kez çekilir; kullanıcı
// yenile düğmesiyle (özellikle anlık sepet/fiş sayıları için) tekrar çekebilir.
export function UsagePanel({ onUpgrade }: { onUpgrade?: () => void }) {
  const [snap, setSnap] = React.useState<UsageSnapshot | null>(null)
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">(
    "loading",
  )
  const [refreshing, setRefreshing] = React.useState(false)
  const [updatedAt, setUpdatedAt] = React.useState<Date | null>(null)

  React.useEffect(() => {
    let active = true
    getUsageSnapshot()
      .then((s) => {
        if (!active) return
        if (!s) {
          setStatus("error")
          return
        }
        setSnap(s)
        setStatus("ready")
        setUpdatedAt(new Date())
      })
      .catch(() => {
        if (active) setStatus("error")
      })
    return () => {
      active = false
    }
  }, [])

  const refresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      const s = await getUsageSnapshot()
      if (!s) {
        setStatus("error")
        return
      }
      setSnap(s)
      setStatus("ready")
      setUpdatedAt(new Date())
    } catch {
      setStatus("error")
    } finally {
      setRefreshing(false)
    }
  }, [])

  const planLabel = snap?.plan === "pro" ? "Pro" : "Free"
  const resetLabel = snap ? dateFmt.format(snap.resetAt) : null

  return (
    <div className="flex flex-col gap-8">
      <header data-search-target="limits" className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <h2 className="cn-font-heading text-lg font-semibold sm:text-xl">
            Kullanım Limitleri
          </h2>
          <Badge variant={snap?.plan === "pro" ? "default" : "secondary"}>
            {planLabel}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Mevcut abonelik planınıza göre kalan kullanım limitlerinizi görüntüleyin.
        </p>
      </header>

      {status === "loading" && <UsageSkeleton />}

      {status === "error" && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <span>Kullanım bilgisi şu an yüklenemedi. Lütfen tekrar dene.</span>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
          >
            <RefreshCwIcon className={cn(refreshing && "animate-spin")} />
            Tekrar dene
          </Button>
        </div>
      )}

      {status === "ready" && snap && (
        <>
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h3 data-search-target="chat" className="text-md font-medium">
                Sohbet
              </h3>
              {resetLabel && (
                <span className="text-xs text-muted-foreground">
                  {resetLabel}&apos;da yenilenir
                </span>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <UsageMeter
                label="Asistan mesajları"
                targetId="text-messages"
                {...snap.metrics.textMessages}
              />
              <UsageMeter
                label="Görsel analizleri"
                targetId="image-analyses"
                {...snap.metrics.imageAnalyses}
              />
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h3 data-search-target="storage" className="text-md font-medium">
              Depolama
            </h3>
            <div className="flex flex-col gap-3">
              <UsageMeter
                label="Sepet kaydetme"
                targetId="saved-baskets"
                {...snap.metrics.savedBaskets}
              />
              <UsageMeter
                label="Fiş kaydetme"
                targetId="saved-receipts"
                {...snap.metrics.savedReceipts}
              />
            </div>
          </section>

          <div className="flex items-center gap-1 pt-2">
            <span className="text-xs text-muted-foreground">
              {updatedAt
                ? `Son güncelleme: ${timeFmt.format(updatedAt)}`
                : "Güncel"}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={refresh}
              disabled={refreshing}
              aria-label="Kullanımı yenile"
            >
              <RefreshCwIcon
                className={cn("size-3.5", refreshing && "animate-spin")}
              />
            </Button>
          </div>

          {snap.plan !== "pro" && <ProUpsell onUpgrade={onUpgrade} />}
        </>
      )}
    </div>
  )
}

function UsageMeter({
  label,
  used,
  limit,
  targetId,
}: {
  label: string
  used: number
  limit: number | null
  targetId?: string
}) {
  const unlimited = limit === null
  const safeLimit = limit ?? 0
  const pct = unlimited
    ? 0
    : Math.min(100, Math.round((used / Math.max(1, safeLimit)) * 100))
  const isFull = !unlimited && used >= safeLimit
  const isNear = !unlimited && !isFull && pct >= 80

  return (
    <div
      data-search-target={targetId}
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2"
    >
      <span className="w-44 shrink-0 text-sm text-foreground">{label}</span>
      <div className="flex min-w-50 grow items-center gap-3">
        <div className="grow">
          {unlimited ? (
            <div className="h-2 w-full rounded-full bg-muted" />
          ) : (
            <Progress
              value={pct}
              className={cn(
                "h-2",
                isFull && "[&_[data-slot=progress-indicator]]:bg-destructive",
                isNear && "[&_[data-slot=progress-indicator]]:bg-amber-500",
              )}
            />
          )}
        </div>
        <span
          className={cn(
            "min-w-16 shrink-0 text-right text-xs tabular-nums",
            isFull ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {unlimited ? "Sınırsız" : `${used} / ${safeLimit}`}
        </span>
      </div>
    </div>
  )
}

function ProUpsell({ onUpgrade }: { onUpgrade?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex min-w-0 grow flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            Daha fazlasına mı ihtiyacın var?
          </span>
          <span className="text-xs text-muted-foreground">
            Hemen planını yükselt ve kullanım limitlerini artır. Pro plan ile daha yüksek kullanımların keyfini çıkar!
          </span>
        </div>
        {onUpgrade && (
          <Button
            variant="default"
            size="sm"
            className="self-start"
            onClick={onUpgrade}
          >
            Pro&apos;ya Geç
          </Button>
        )}
      </div>
    </div>
  )
}

function UsageSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {[0, 1].map((s) => (
        <div key={s} className="flex flex-col gap-4">
          <Skeleton className="h-4 w-32" />
          {[0, 1].map((r) => (
            <div
              key={r}
              className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2"
            >
              <Skeleton className="h-4 w-44 shrink-0" />
              <div className="flex min-w-50 grow items-center gap-3">
                <Skeleton className="h-2 grow rounded-full" />
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
