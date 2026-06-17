"use client"

import * as React from "react"
import {
  ChartColumnIcon,
  CreditCardIcon,
  MapPinIcon,
  RefreshCwIcon,
  SearchIcon,
  Settings2Icon,
  ShieldIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { getUsageSnapshot } from "@/lib/actions/usage"
import type { UsageSnapshot } from "@/lib/usage/usage"
import { useUserLocation } from "@/lib/stores/location"
import { locationDialog } from "@/lib/stores/location-dialog"

type TabKey = "genel" | "hesap" | "gizlilik" | "abonelik" | "kullanim"

const NAV_ITEMS: Array<{
  key: TabKey
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { key: "genel", label: "Genel", icon: Settings2Icon },
  { key: "hesap", label: "Hesap", icon: UserIcon },
  { key: "gizlilik", label: "Gizlilik", icon: ShieldIcon },
  { key: "abonelik", label: "Abonelik", icon: CreditCardIcon },
  { key: "kullanim", label: "Kullanım", icon: ChartColumnIcon },
]

const TAB_LABEL: Record<TabKey, string> = {
  genel: "Genel",
  hesap: "Hesap",
  gizlilik: "Gizlilik",
  abonelik: "Abonelik",
  kullanim: "Kullanım",
}

// Aranabilir ayar girdileri. `target` dolu olanlar, açıldıkları sekmedeki ilgili
// öğeye (data-search-target) kaydırılıp vurgulanır; boş olanlar yalnızca sekmeyi açar.
type SearchEntry = {
  key: string
  tab: TabKey
  title: string
  subtitle: string
  keywords: string
  target?: string
  icon: React.ComponentType<{ className?: string }>
}

// Genel sekmesindeki tekil ayarlar — `target` değeri, paneldeki
// data-search-target ile birebir eşleşmelidir.
const GENEL_SETTINGS: Array<{
  target: string
  title: string
  keywords: string
}> = [
  {
    target: "konum",
    title: "Konum",
    keywords: "konum adres sehir mahalle harita market sube bolge",
  },
]

// Kullanım panelindeki tekil ayarlar — `target` değeri, paneldeki
// data-search-target ile birebir eşleşmelidir.
const KULLANIM_SETTINGS: Array<{
  target: string
  title: string
  keywords: string
}> = [
  {
    target: "limits",
    title: "Kullanım Limitleri",
    keywords: "limit kota plan abonelik free pro yenilenir",
  },
  { target: "chat", title: "Sohbet", keywords: "mesaj asistan konuşma" },
  {
    target: "text-messages",
    title: "Asistan mesajları",
    keywords: "metin sohbet mesaj yazı",
  },
  {
    target: "image-analyses",
    title: "Görsel analizleri",
    keywords: "resim fotoğraf analiz görüntü kamera",
  },
  { target: "storage", title: "Depolama", keywords: "kayıt saklama alan" },
  {
    target: "saved-baskets",
    title: "Sepet kaydetme",
    keywords: "sepet kayıt liste",
  },
  {
    target: "saved-receipts",
    title: "Fiş kaydetme",
    keywords: "fiş fatura kayıt makbuz",
  },
]

const SEARCH_ENTRIES: SearchEntry[] = [
  ...NAV_ITEMS.map(
    (n): SearchEntry => ({
      key: `tab:${n.key}`,
      tab: n.key,
      title: n.label,
      subtitle: "Bölüm",
      keywords: "",
      icon: n.icon,
    }),
  ),
  ...GENEL_SETTINGS.map(
    (s): SearchEntry => ({
      key: `genel:${s.target}`,
      tab: "genel",
      title: s.title,
      subtitle: TAB_LABEL.genel,
      keywords: s.keywords,
      target: s.target,
      icon: MapPinIcon,
    }),
  ),
  ...KULLANIM_SETTINGS.map(
    (s): SearchEntry => ({
      key: `kullanim:${s.target}`,
      tab: "kullanim",
      title: s.title,
      subtitle: TAB_LABEL.kullanim,
      keywords: s.keywords,
      target: s.target,
      icon: ChartColumnIcon,
    }),
  ),
]

// Türkçe-duyarlı, aksandan bağımsız normalleştirme. Karakter eşlemeleri 1:1
// olduğu için sonuç dizgesi, orijinalle aynı uzunlukta ve indeks hizalı kalır;
// bu da eşleşen aralığın orijinal metin üzerinde vurgulanmasını mümkün kılar.
function normalize(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
}

function HighlightedLabel({ text, query }: { text: string; query: string }) {
  const q = normalize(query.trim())
  if (!q) return <>{text}</>
  const idx = normalize(text).indexOf(q)
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-primary/15 text-foreground">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  )
}

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [tab, setTab] = React.useState<TabKey>("genel")
  const [query, setQuery] = React.useState("")

  const contentRef = React.useRef<HTMLDivElement>(null)
  const highlightTimer = React.useRef<number | null>(null)
  const highlighted = React.useRef<HTMLElement | null>(null)

  const clearHighlight = React.useCallback(() => {
    if (highlightTimer.current !== null) {
      window.clearTimeout(highlightTimer.current)
      highlightTimer.current = null
    }
    if (highlighted.current) {
      highlighted.current.classList.remove("settings-search-highlight")
      highlighted.current = null
    }
  }, [])

  // Hedef öğe panel yüklemesi (örn. kullanım verisi) nedeniyle henüz DOM'da
  // olmayabilir; kısa aralıklarla ~4 sn boyunca arar, bulunca ortalayıp vurgular.
  const focusTarget = React.useCallback(
    (target: string) => {
      let attempts = 0
      const run = () => {
        const el = contentRef.current?.querySelector<HTMLElement>(
          `[data-search-target="${target}"]`,
        )
        if (el) {
          clearHighlight()
          el.scrollIntoView({ behavior: "smooth", block: "center" })
          el.classList.add("settings-search-highlight")
          highlighted.current = el
          highlightTimer.current = window.setTimeout(() => {
            el.classList.remove("settings-search-highlight")
            highlighted.current = null
            highlightTimer.current = null
          }, 2400)
          return
        }
        if (attempts++ < 40) window.setTimeout(run, 100)
      }
      run()
    },
    [clearHighlight],
  )

  const handleSelect = React.useCallback(
    (entry: SearchEntry) => {
      setTab(entry.tab)
      setQuery("")
      if (entry.target) focusTarget(entry.target)
    },
    [focusTarget],
  )

  // Dialog kapanınca aramayı ve vurguyu sıfırla.
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        setQuery("")
        clearHighlight()
      }
      onOpenChange(next)
    },
    [onOpenChange, clearHighlight],
  )

  // Unmount'ta bekleyen vurgu timer'ını temizle.
  React.useEffect(() => () => clearHighlight(), [clearHighlight])

  const trimmed = query.trim()
  const results = React.useMemo(() => {
    const q = normalize(trimmed)
    if (!q) return []
    return SEARCH_ENTRIES.filter(
      (e) => normalize(e.title).includes(q) || normalize(e.keywords).includes(q),
    )
  }, [trimmed])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogTitle className="sr-only">Ayarlar</DialogTitle>
        <DialogDescription className="sr-only">
          Hesap ve kullanım ayarları
        </DialogDescription>

        <div className="flex h-[min(600px,82svh)] min-h-0 min-w-0 flex-col sm:flex-row">
          {/* Gezinme — mobilde üstte yatay menü, masaüstünde solda dikey kenar */}
          <nav className="relative flex shrink-0 flex-col gap-3.5 border-b bg-muted/30 px-4 pt-4 pb-2.5 sm:w-52 sm:gap-2 sm:border-r sm:border-b-0 sm:px-3 sm:pt-3 sm:pb-3">
            {/* Mobil başlık — masaüstü dikey menüsünde gerekmez */}
            <div
              aria-hidden
              className="cn-font-heading pr-10 text-base font-medium leading-none sm:hidden"
            >
              Ayarlar
            </div>
            {/* Arama yalnızca masaüstünde gösterilir */}
            <div className="relative hidden px-0.5 pt-0.5 sm:block">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && query) {
                    // Aramayı temizle ama dialog'u kapatma.
                    e.preventDefault()
                    e.stopPropagation()
                    setQuery("")
                  }
                }}
                placeholder="Arama yapın"
                aria-label="Arama yapın"
                className="h-8 pl-8 text-sm [&::-webkit-search-cancel-button]:appearance-none"
              />
            </div>
            <div className="hidden px-2 pt-1 text-[11px] font-medium tracking-wide text-muted-foreground/70 sm:block">
              Ayarlar
            </div>
            <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none] sm:flex-col sm:gap-0.5 sm:overflow-x-visible [&::-webkit-scrollbar]:hidden">
              {NAV_ITEMS.map((item) => {
                const active = tab === item.key
                const Icon = item.icon
                return (
                  <li key={item.key} className="shrink-0 sm:w-full">
                    <button
                      type="button"
                      onClick={() => setTab(item.key)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-7 w-full items-center gap-1.5 rounded-lg px-2.5 text-left text-sm font-medium transition-colors sm:h-8 sm:gap-2.5 sm:px-2",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                      )}
                    >
                      <Icon className="hidden shrink-0 sm:block sm:size-4" />
                      <span className="truncate sm:flex-1">{item.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {trimmed && (
              <div className="absolute top-12 left-1.5 z-30 w-[min(18rem,calc(100vw-4rem))] overflow-hidden rounded-xl border bg-popover shadow-lg ring-1 ring-foreground/10">
                {results.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    “{trimmed}” için sonuç bulunamadı
                  </div>
                ) : (
                  <ul className="max-h-72 overflow-y-auto p-1.5">
                    {results.map((r) => {
                      const Icon = r.icon
                      return (
                        <li key={r.key}>
                          <button
                            type="button"
                            onClick={() => handleSelect(r)}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent"
                          >
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                              <Icon className="size-4" />
                            </span>
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate text-sm">
                                <HighlightedLabel
                                  text={r.title}
                                  query={trimmed}
                                />
                              </span>
                              <span className="truncate text-xs text-muted-foreground">
                                {r.subtitle}
                              </span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </nav>

          {/* İçerik */}
          <div ref={contentRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <div className="px-5 pt-6 pb-8 sm:px-7 sm:pt-10">
              {tab === "genel" ? (
                <GeneralPanel />
              ) : tab === "kullanim" ? (
                <UsagePanel />
              ) : (
                <ComingSoonPanel tab={tab} />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Tek ayar satırı: solda ikonsuz başlık + açıklama, sağda kontrol (buton,
// input, select…). Kart yok; birden fazla satır <Separator /> ile ayrılır.
function SettingRow({
  title,
  description,
  target,
  children,
}: {
  title: string
  description?: React.ReactNode
  target?: string
  children: React.ReactNode
}) {
  return (
    <div
      data-search-target={target}
      className="flex items-center justify-between gap-3 sm:gap-6"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        {description ? (
          <span className="text-sm break-words text-muted-foreground">
            {description}
          </span>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// Genel ayarlar — şimdilik tek girdi: konum. Buton, global konum modalını
// (locationDialog) açar; modal kaydedince useUserLocation güncellenir ve
// satırdaki açıklama anında yeni adresi yansıtır. Yeni ayarlar eklendikçe her
// SettingRow arasına <Separator /> konur.
function GeneralPanel() {
  const { location } = useUserLocation()
  const label = location?.label?.trim()

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <h2 className="cn-font-heading text-md font-semibold">Genel Ayarlar</h2>
        <p className="text-sm text-muted-foreground">
          Hesabının temel tercihlerini buradan yönet.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <SettingRow
          title="Konum"
          target="konum"
          description={
            label ?? "Sepetini en iyi şekilde göstermek için konumunu belirt."
          }
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => locationDialog.open()}
          >
            {label ? "Düzenle" : "Konum seç"}
          </Button>
        </SettingRow>
      </div>
    </div>
  )
}

// İşlevi henüz hazır olmayan sekmeler (Hesap, Gizlilik, Abonelik) için yer
// tutucu. Başlık ve ikonu NAV_ITEMS'ten kendisi çözer; gövdede "Yakında" gösterir.
function ComingSoonPanel({ tab }: { tab: TabKey }) {
  const item = NAV_ITEMS.find((n) => n.key === tab)
  const Icon = item?.icon ?? Settings2Icon
  const title = TAB_LABEL[tab]

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <h2 className="cn-font-heading text-md font-semibold">{title}</h2>
      </header>

      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
        <span className="text-sm font-medium">Yakında</span>
      </div>
    </div>
  )
}

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
      <header data-search-target="limits" className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <h2 className="cn-font-heading text-md font-semibold">
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
