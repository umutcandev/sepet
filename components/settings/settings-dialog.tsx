"use client"

import * as React from "react"
import {
  BadgeCheckIcon,
  BellIcon,
  ChartColumnIcon,
  CreditCardIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { getUsageSnapshot } from "@/lib/actions/usage"
import type { UsageSnapshot } from "@/lib/usage/usage"

type TabKey = "hesap" | "kullanim" | "faturalandirma" | "bildirimler"

const NAV_ITEMS: Array<{
  key: TabKey
  label: string
  icon: React.ComponentType<{ className?: string }>
  available: boolean
}> = [
  { key: "hesap", label: "Hesap", icon: BadgeCheckIcon, available: false },
  { key: "kullanim", label: "Kullanım", icon: ChartColumnIcon, available: true },
  {
    key: "faturalandirma",
    label: "Faturalandırma",
    icon: CreditCardIcon,
    available: false,
  },
  { key: "bildirimler", label: "Bildirimler", icon: BellIcon, available: false },
]

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [tab, setTab] = React.useState<TabKey>("kullanim")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogTitle className="sr-only">Ayarlar</DialogTitle>
        <DialogDescription className="sr-only">
          Hesap ve kullanım ayarları
        </DialogDescription>

        <div className="flex h-[min(600px,82svh)] min-h-0">
          {/* Sol kenar — sekme menüsü */}
          <nav className="flex w-36 shrink-0 flex-col gap-2 border-r bg-muted/30 p-2 sm:w-52 sm:p-3">
            <div className="px-2 pt-1 text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase">
              Ayarlar
            </div>
            <ul className="flex flex-col gap-0.5">
              {NAV_ITEMS.map((item) => {
                const active = tab === item.key
                const Icon = item.icon
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      disabled={!item.available}
                      onClick={() => item.available && setTab(item.key)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm transition-colors",
                        active
                          ? "bg-accent font-medium text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                        !item.available &&
                          "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {!item.available && (
                        <Badge
                          variant="secondary"
                          className="hidden px-1 text-[9px] sm:inline-flex"
                        >
                          YAKINDA
                        </Badge>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Sağ taraf — içerik */}
          <div className="min-w-0 flex-1 overflow-y-auto">
            <div className="px-5 pt-10 pb-8 sm:px-7">
              {tab === "kullanim" ? <UsagePanel /> : <PlaceholderPanel />}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PlaceholderPanel() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
      <span>Bu bölüm yakında kullanıma açılacak.</span>
    </div>
  )
}

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

const timeFmt = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
})

// Dialog kapanınca Radix içeriği unmount eder → her açılışta bu panel sıfırdan
// mount olur ve "loading" ile başlar. Veri mount'ta bir kez çekilir; kullanıcı
// yenile düğmesiyle (özellikle anlık sepet/fiş sayıları için) tekrar çekebilir.
function UsagePanel() {
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
      <header className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <h2 className="cn-font-heading text-lg font-semibold">
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
              <h3 className="text-md font-medium">Sohbet</h3>
              {resetLabel && (
                <span className="text-xs text-muted-foreground">
                  {resetLabel} tarihinde yenilenir
                </span>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <UsageMeter
                label="Asistan mesajları"
                {...snap.metrics.textMessages}
              />
              <UsageMeter
                label="Görsel analizleri"
                {...snap.metrics.imageAnalyses}
              />
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="text-md font-medium">Depolama</h3>
            <div className="flex flex-col gap-3">
              <UsageMeter label="Sepet kaydetme" {...snap.metrics.savedBaskets} />
              <UsageMeter label="Fiş kaydetme" {...snap.metrics.savedReceipts} />
            </div>
          </section>

          <div className="flex items-center justify-between gap-2 pt-2">
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

          {snap.plan !== "pro" && <ProUpsell />}
        </>
      )}
    </div>
  )
}

function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string
  used: number
  limit: number | null
}) {
  const unlimited = limit === null
  const safeLimit = limit ?? 0
  const pct = unlimited
    ? 0
    : Math.min(100, Math.round((used / Math.max(1, safeLimit)) * 100))
  const isFull = !unlimited && used >= safeLimit
  const isNear = !unlimited && !isFull && pct >= 80

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
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

function ProUpsell() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
      <SparklesIcon className="mt-0.5 size-4 shrink-0 text-foreground" />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">
          Daha fazlasına mı ihtiyacın var?
        </span>
        <span className="text-xs text-muted-foreground">
          Yakında yayınlanacak Pro ile aylık limitlerin yükselir; Sepet kaydetme
          ve fiş sınırsız olur.
        </span>
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
