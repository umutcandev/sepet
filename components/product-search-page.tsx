"use client"

import * as React from "react"
import Image from "next/image"
import {
  RiAlertLine,
  RiBarcodeBoxLine,
  RiImageLine,
  RiSearchLine,
} from "@remixicon/react"

import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog"
import { ProductDetailPanel } from "@/components/product-detail-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
} from "@/components/ui/responsive-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useCurrentUser } from "@/components/providers/session-provider"
import { useRequireAuth } from "@/lib/hooks/use-require-auth"
import { useRequireLocation } from "@/lib/hooks/use-require-location"
import { useUserLocation } from "@/lib/stores/location"
import { locationDialog } from "@/lib/stores/location-dialog"
import { loginDialog } from "@/lib/stores/login-dialog"
import { formatTLOrDash } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ProductHit } from "@/lib/marketfiyati/types"

type SearchResponse = {
  hits: ProductHit[]
  total: number | null
  page: number
  hasMore: boolean
}

type Result =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ok"
      query: string
      hits: ProductHit[]
      total: number | null
      page: number
      hasMore: boolean
      loadingMore: boolean
    }

export function ProductSearchPage({
  initialQuery = "",
}: {
  /**
   * URL'den gelen sorgu (`/urun-ara?q=...`). Arama tamamen bileşen state'inde
   * durduğu için hiçbir yerden derin link kurulamıyordu — eşleşmeyen bir kalem
   * "kendin ara"ya bağlanamıyor, bir arama paylaşılamıyordu.
   */
  initialQuery?: string
} = {}) {
  const seedQuery = initialQuery.trim()
  const hasSeed = seedQuery.length >= 2

  const [q, setQ] = React.useState(initialQuery)
  // URL'den sorgu geldiyse ilk render zaten yükleniyor durumunda başlar —
  // efekt içinde senkron setState yapmak zorunda kalmayalım diye.
  const [result, setResult] = React.useState<Result>(
    hasSeed ? { kind: "loading" } : { kind: "idle" },
  )
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = React.useState(false)
  const abortRef = React.useRef<AbortController | null>(null)
  const guard = useRequireAuth()
  const locationGuard = useRequireLocation()
  // Sarmalayıcı guard'lar event zamanı için; derin link render sonrası tek
  // seferlik bir akış olduğundan kapıları ham durumdan okuyor.
  const { isAuthenticated, loading: sessionLoading } = useCurrentUser()
  const { hasLocation } = useUserLocation()

  React.useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  /**
   * Derin linkin (`?q=`) hangi kapıda olduğu. Sıra formunkiyle aynı: önce
   * oturum, sonra konum. Karar efekte değil RENDER'a ait — efekt gövdesinde
   * senkron setState zincirleme render'a yol açıyor (react-hooks/
   * set-state-in-effect), o yüzden "kapıda bekliyor" saklanan bir state değil
   * türetilen bir değer.
   */
  const seedGate: "none" | "session" | "auth" | "location" | "ready" = !hasSeed
    ? "none"
    : sessionLoading
      ? "session"
      : !isAuthenticated
        ? "auth"
        : !hasLocation
          ? "location"
          : "ready"

  // Kapıda bekleyen seed varken iskelet göstermek yanıltıcı olurdu: arama hiç
  // başlamadı, modalın cevabı bekleniyor. Görüntü boş duruma düşer; yazma
  // alanındaki sorgu yerinde durduğu için kullanıcı elle de arayabilir.
  const view: Result =
    seedGate === "auth" || seedGate === "location" ? { kind: "idle" } : result

  const trimmed = q.trim()
  const canSubmit = trimmed.length >= 2 && view.kind !== "loading"

  async function fetchPage(
    value: string,
    page: number,
    signal: AbortSignal,
  ): Promise<SearchResponse> {
    const res = await fetch(
      `/api/products/search?q=${encodeURIComponent(value)}&page=${page}`,
      { signal },
    )
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string
      } | null
      throw new Error(body?.error ?? `HTTP ${res.status}`)
    }
    return (await res.json()) as SearchResponse
  }

  async function runSearchWith(query: string) {
    const value = query.trim()
    if (value.length < 2) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setResult({ kind: "loading" })

    try {
      const data = await fetchPage(value, 0, ctrl.signal)
      if (ctrl.signal.aborted) return
      setResult({
        kind: "ok",
        query: value,
        hits: data.hits,
        total: data.total,
        page: data.page,
        hasMore: data.hasMore,
        loadingMore: false,
      })
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      setResult({ kind: "error", message: (err as Error).message })
    }
  }

  async function loadMore() {
    if (result.kind !== "ok" || !result.hasMore || result.loadingMore) return
    const { query, page } = result
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setResult({ ...result, loadingMore: true })

    try {
      const data = await fetchPage(query, page + 1, ctrl.signal)
      if (ctrl.signal.aborted) return
      setResult((prev) => {
        // Yeni bir arama araya girmişse (farklı sorgu ya da liste sıfırlanmışsa)
        // bu sayfayı yok say — yanlış sorgunun sonucunu eklemeyelim.
        if (prev.kind !== "ok" || prev.query !== query) return prev
        const seen = new Set(prev.hits.map((h) => h.productId))
        const fresh = data.hits.filter((h) => !seen.has(h.productId))
        return {
          ...prev,
          hits: [...prev.hits, ...fresh],
          total: data.total ?? prev.total,
          page: data.page,
          hasMore: data.hasMore,
          loadingMore: false,
        }
      })
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      // Sayfa yüklenemedi — mevcut liste dursun, buton tekrar denenebilir kalsın.
      setResult((prev) =>
        prev.kind === "ok" ? { ...prev, loadingMore: false } : prev,
      )
    }
  }

  function handleBarcodeDetected(barcode: string) {
    setScannerOpen(false)
    setQ(barcode)
    runSearchWith(barcode)
  }

  // Önce auth, sonra konum kapısı: konum yoksa modal açılır, kaydedince aksiyon
  // devam eder. preventDefault/blur senkron kalsın diye gated kısım event almaz.
  // eslint-disable-next-line react-hooks/refs -- guard wrappers run at event time, not render
  const submitSearch = guard(locationGuard(() => runSearchWith(q)))
  const openScanner = guard(locationGuard(() => setScannerOpen(true)))

  // URL'den gelen sorguyu bir kez kendiliğinden çalıştır.
  //
  // Efekt `fetchPage`e doğrudan düşüyordu, yani formun geçtiği oturum ve konum
  // kapılarını atlıyordu: oturumsuz bir ziyaretçi API'den 401 alıyor ve arama
  // sonucu yerine ham "unauthorized" metnini görüyordu. Paylaşılan bir arama
  // linkinin ilk izlenimi bu olamaz — kapılar burada, `guard(locationGuard(…))`
  // ile aynı sırayla elle uygulanır.
  const seededRef = React.useRef(false)
  React.useEffect(() => {
    // "session": /api/me henüz çözülmedi. Misafir varsayıp login modalı açmak
    // yeni giriş yapmış kullanıcıyı boş yere durdururdu — bekle.
    if (seededRef.current || seedGate === "none" || seedGate === "session") {
      return
    }

    if (seedGate === "auth") {
      // `seededRef` bilerek işaretlenmiyor: giriş yapılınca efekt yeniden
      // çalışır ve arama kullanıcı bir şey yapmadan koşar.
      loginDialog.open()
      return
    }

    seededRef.current = true
    if (seedGate === "location") {
      // Konum kaydedilince bekleyen aksiyon olarak çalışır (bkz. locationDialog).
      // Buradaki setState efekt gövdesinde değil, kullanıcı aksiyonunda.
      locationDialog.open(() => void runSearchWith(seedQuery))
      return
    }

    // İstek doğrudan burada kurulur; `runSearchWith` "loading"i senkron
    // yazardı. İptal, unmount'taki ortak `abortRef` temizliğine bağlı.
    const ctrl = new AbortController()
    abortRef.current = ctrl
    fetchPage(seedQuery, 0, ctrl.signal)
      .then((data) => {
        if (ctrl.signal.aborted) return
        setResult({
          kind: "ok",
          query: seedQuery,
          hits: data.hits,
          total: data.total,
          page: data.page,
          hasMore: data.hasMore,
          loadingMore: false,
        })
      })
      .catch((err: Error) => {
        if (ctrl.signal.aborted || err.name === "AbortError") return
        setResult({ kind: "error", message: err.message })
      })
    // `fetchPage`/`runSearchWith` her render'da yeniden kurulur; tek çalışmayı
    // `seededRef` garanti ettiği için bağımlılık listesinde yokturlar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedGate, seedQuery])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Ürün Ara</h1>
        <p className="text-sm text-muted-foreground">
          Ürün adı ya da barkod ile BİM, A101, Migros, Şok,
          CarrefourSA ve Tarım Kredi marketlerinde güncel fiyatları karşılaştır.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submitSearch()
        }}
        className="mb-6 flex max-w-xl items-center gap-2"
      >
        <div className="relative flex-1">
          <RiSearchLine className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Ürün adı ya da barkod"
            placeholder="Barkod, ürün adı ya da marka arayın..."
            className="h-9 pl-8 bg-sidebar"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            inputMode="search"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Barkod tara"
          className="h-9 px-3"
          onClick={(e) => {
            // Dialog açılınca Radix dış ağaca aria-hidden koyuyor; tetikleyici
            // buton focus'lu kalırsa erişilebilirlik uyarısı çıkar. Önce blur
            // (senkron), konum kapısı sonra.
            e.currentTarget.blur()
            openScanner()
          }}
        >
          <RiBarcodeBoxLine className="size-4" />
          Barkod
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!canSubmit}
          className="h-9 px-3"
        >
          {view.kind === "loading" ? (
            <Spinner className="size-3.5" />
          ) : (
            <RiSearchLine className="size-3.5" />
          )}
          Ara
        </Button>
      </form>

      <ResultArea
        result={view}
        onSelect={guard(setSelectedId)}
        onLoadMore={loadMore}
      />

      <ResponsiveDialog
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      >
        <ResponsiveDialogContent>
          {selectedId && <ProductDetailPanel productId={selectedId} />}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={handleBarcodeDetected}
      />
    </div>
  )
}

function ResultArea({
  result,
  onSelect,
  onLoadMore,
}: {
  result: Result
  onSelect: (productId: string) => void
  onLoadMore: () => void
}) {
  if (result.kind === "loading") {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (result.kind === "error") {
    return (
      <EmptyState>
        <p
          role="alert"
          className="flex items-center gap-1.5 text-sm text-destructive"
        >
          <RiAlertLine aria-hidden="true" className="size-4 shrink-0" />
          Hata: {result.message}
        </p>
      </EmptyState>
    )
  }

  if (result.kind === "idle") {
    return (
      <EmptyState>
        <p className="text-sm text-muted-foreground">
          Arama sonucu burada görünecek. En iyi sonuçlar için ürün adı veya barkod ile arama yapın.
        </p>
      </EmptyState>
    )
  }

  if (result.hits.length === 0) {
    return (
      <EmptyState>
        <p className="text-sm text-muted-foreground">
          “{result.query}” için eşleşen ürün bulunamadı.
        </p>
      </EmptyState>
    )
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {/* Toplam biliniyorsa "48 / 220" göster — kaç sonucun daha olduğunu
              görmeden "daha fazla" butonu bağlamsız kalıyor. */}
          “{result.query}” için{" "}
          {result.total !== null && result.total > result.hits.length
            ? `${result.total} sonuçtan ${result.hits.length} tanesi`
            : `${result.hits.length} sonuç`}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {result.hits.map((hit) => (
          <ProductCard
            key={hit.productId}
            hit={hit}
            onSelect={() => onSelect(hit.productId)}
          />
        ))}
      </div>

      {result.hasMore && (
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={result.loadingMore}
            className="h-9 px-4"
          >
            {result.loadingMore && <Spinner className="size-3.5" />}
            {result.loadingMore ? "Yükleniyor..." : "Daha fazla göster"}
          </Button>
        </div>
      )}
    </>
  )
}

function ProductCard({
  hit,
  onSelect,
}: {
  hit: ProductHit
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-2.5 text-left",
        "transition-colors hover:border-border hover:bg-muted/20",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
        {hit.imageUrl ? (
          <Image
            src={hit.imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <RiImageLine className="size-8" />
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-0.5">
        <div className="line-clamp-2 text-sm font-medium leading-tight text-foreground">
          {hit.name}
        </div>
        <div className="truncate text-[0.6875rem] text-muted-foreground">
          {[hit.brand, hit.category].filter(Boolean).join(" · ") ||
            hit.productId}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {hit.marketCount > 0 ? (
          <span className="text-[0.625rem] text-muted-foreground/70">
            {hit.marketCount} market
          </span>
        ) : (
          <span />
        )}
        <Badge
          variant="default"
          className="h-5 px-2 font-mono text-[0.6875rem] font-normal tabular-nums"
        >
          {formatTLOrDash(hit.averagePrice)}
        </Badge>
      </div>
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-2.5">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-2.5 w-2/3" />
      </div>
      <div className="mt-auto flex items-center justify-between pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-12 text-center">
      {children}
    </div>
  )
}
