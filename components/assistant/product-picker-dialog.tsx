"use client"

import * as React from "react"
import Image from "next/image"
import {
  RiArrowRightLine,
  RiBox3Line,
  RiErrorWarningLine,
  RiLoader4Line,
  RiRefreshLine,
  RiSearchLine,
} from "@remixicon/react"

import { toast } from "@/components/ui/sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckboxVisual } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { MarketLogo, MarketLogoGroup } from "@/components/market-logo"
import { formatTL } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Candidate } from "@/lib/ai/match-result"
import type { MatchResult, OptimizationSummary } from "@/lib/ai/schemas"
import {
  aiAcceptedIds,
  cheapestPrice,
  initialSelection,
  pickerPoolQuery,
  planProductsFor,
  previewSelection,
  sameIds,
} from "@/lib/assistant/product-picker"

/** Havuz dışından (aramayla) seçilebilecek en fazla ürün; sunucudaki tavanla aynı. */
const MAX_EXTRA_SELECTED = 20

function capitalize(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1) : s
}

const norm = (s: string | null | undefined) =>
  (s ?? "").toLocaleLowerCase("tr-TR")

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; products: Candidate[] }

async function fetchCandidates(
  q: string,
  signal?: AbortSignal
): Promise<Candidate[]> {
  const res = await fetch(
    `/api/products/candidates?q=${encodeURIComponent(q)}`,
    { signal }
  )
  if (!res.ok) throw new Error(`candidates ${res.status}`)
  const data = (await res.json()) as { products?: Candidate[] }
  return data.products ?? []
}

async function fetchProduct(
  id: string,
  signal?: AbortSignal
): Promise<Candidate | null> {
  const res = await fetch(`/api/products/${encodeURIComponent(id)}`, { signal })
  if (!res.ok) return null
  const data = (await res.json()) as { detail?: Candidate }
  return data.detail && data.detail.markets.length > 0 ? data.detail : null
}

export type ProductPickerTarget = { itemIndex: number }

/**
 * Sepet Özeti'nde bir kalemin hangi ürünlerle karşılanacağını kullanıcının
 * seçtiği ekran.
 *
 * Neden küme seçimi, tek ürün değil: optimizasyon her markette kabul edilen
 * ürünlerin en ucuzunu alıyor. Kullanıcı yanlış ürünü (ör. adında "konserve"
 * yazmayan konserve fasulye) işaretten çıkarınca kalan doğru ürünler her
 * markette yarışmaya devam eder; tek ürün sabitlemek ise kalemi tek markete
 * bağlayıp iki market planını gereksizce bozardı. İsteyen yalnız bir ürünü
 * işaretli bırakarak yine sabitleyebilir.
 *
 * Asistan ürünleri yalnızca adlarından tanıyor; görseller burada büyük, çünkü
 * hatayı çoğu zaman görsel ele veriyor.
 */
export function ProductPickerDialog({
  target,
  onClose,
  matches,
  summary,
  onApply,
}: {
  target: ProductPickerTarget | null
  onClose: () => void
  matches: MatchResult[]
  summary: OptimizationSummary
  /** Başarılıysa true; dialog kapanır. */
  onApply: (itemIndex: number, productIds: string[]) => Promise<boolean>
}) {
  const match = target ? matches[target.itemIndex] : undefined
  const [applying, setApplying] = React.useState(false)
  return (
    <ResponsiveDialog
      open={!!target && !!match}
      onOpenChange={(open) => {
        if (!open && !applying) onClose()
      }}
    >
      <ResponsiveDialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-xl">
        {target && match && (
          <PickerBody
            // Başka bir kalem açılınca seçim ve arama sıfırdan başlar.
            key={target.itemIndex}
            itemIndex={target.itemIndex}
            match={match}
            matches={matches}
            summary={summary}
            applying={applying}
            onCancel={onClose}
            onApply={async (ids) => {
              setApplying(true)
              try {
                if (await onApply(target.itemIndex, ids)) onClose()
              } finally {
                setApplying(false)
              }
            }}
          />
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

function PickerBody({
  itemIndex,
  match,
  matches,
  summary,
  applying,
  onCancel,
  onApply,
}: {
  itemIndex: number
  match: MatchResult
  matches: MatchResult[]
  summary: OptimizationSummary
  applying: boolean
  onCancel: () => void
  onApply: (productIds: string[]) => void
}) {
  const poolQuery = pickerPoolQuery(match)
  const aiIds = React.useMemo(() => aiAcceptedIds(match), [match])
  const initial = React.useMemo(() => initialSelection(match), [match])
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(
    () => new Set(initial)
  )
  const [pool, setPool] = React.useState<LoadState>({ status: "loading" })
  // Havuzda olmayan ama daha önce seçilmiş (aramayla eklenmiş) ürünler ve bu
  // ekrandaki aramanın sonuçları.
  const [extras, setExtras] = React.useState<Candidate[]>([])
  const [searchResults, setSearchResults] = React.useState<{
    query: string
    products: Candidate[]
  } | null>(null)
  const [filter, setFilter] = React.useState("")
  const [searching, setSearching] = React.useState(false)
  const [reloadKey, setReloadKey] = React.useState(0)

  React.useEffect(() => {
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const products = await fetchCandidates(poolQuery, ctrl.signal)
        // Önceki düzenlemede aramayla eklenen ürünler havuzda yok; işaretli
        // gelip listede görünmeseler kaldırılamazlardı.
        const inPool = new Set(products.map((p) => p.productId))
        const missing = initial
          .filter((id) => !inPool.has(id))
          .slice(0, MAX_EXTRA_SELECTED)
        const fetched = await Promise.all(
          missing.map((id) => fetchProduct(id, ctrl.signal).catch(() => null))
        )
        if (ctrl.signal.aborted) return
        setExtras(fetched.filter((p): p is Candidate => p !== null))
        setPool({ status: "ready", products })
      } catch {
        if (!ctrl.signal.aborted) setPool({ status: "error" })
      }
    })()
    return () => ctrl.abort()
  }, [poolQuery, initial, reloadKey])

  const poolProducts = React.useMemo(
    () => (pool.status === "ready" ? pool.products : []),
    [pool]
  )
  const poolIds = React.useMemo(
    () => new Set(poolProducts.map((p) => p.productId)),
    [poolProducts]
  )

  /** Ekranda bilinen tüm adaylar, tekil. Önizleme ve uygulama bunlarla. */
  const known = React.useMemo(() => {
    const byId = new Map<string, Candidate>()
    for (const p of [
      ...poolProducts,
      ...extras,
      ...(searchResults?.products ?? []),
    ]) {
      if (!byId.has(p.productId)) byId.set(p.productId, p)
    }
    return byId
  }, [poolProducts, extras, searchResults])

  const plan = React.useMemo(
    () => planProductsFor(summary, itemIndex, match.rawName),
    [summary, itemIndex, match.rawName]
  )

  // Yalnızca ekranda bilinen ve işaretli ürünler gönderilir.
  const selectedIds = React.useMemo(
    () => [...selected].filter((id) => known.has(id)),
    [selected, known]
  )
  const preview = React.useMemo(
    () =>
      pool.status === "ready"
        ? previewSelection({
            match,
            matches,
            itemIndex,
            products: [...known.values()],
            selectedIds,
          })
        : null,
    [pool.status, match, matches, itemIndex, known, selectedIds]
  )

  const changed = !sameIds(selectedIds, initial)
  const canApply =
    pool.status === "ready" && preview !== null && changed && !applying
  const atAiSelection = aiIds.length > 0 && sameIds(selectedIds, aiIds)
  // Kalem daha önce bu ekrandan düzenlendiyse kart kullanıcının seçimini
  // gösteriyor; asistanın seçtiklerine dönmenin anlamı yalnızca o zaman var.
  // Bu ekrandaki değişiklikleri geri almak zaten Vazgeç'in işi.
  const canRestoreAi =
    match.selection?.userAcceptedProductIds != null &&
    aiIds.length > 0 &&
    !atAiSelection

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        return next
      }
      if (!poolIds.has(id)) {
        const outside = [...next].filter((x) => !poolIds.has(x)).length
        if (outside >= MAX_EXTRA_SELECTED) {
          toast.error(
            `Aramayla en fazla ${MAX_EXTRA_SELECTED} ürün ekleyebilirsin.`
          )
          return prev
        }
      }
      next.add(id)
      return next
    })
  }

  async function runSearch(e?: { preventDefault: () => void }) {
    e?.preventDefault()
    const q = filter.trim()
    if (q.length < 2 || searching) return
    setSearching(true)
    try {
      const products = await fetchCandidates(q)
      setSearchResults({ query: q, products })
      // Arama yeni bir liste getirdi; yerel süzgeç onu gizlemesin.
      setFilter("")
    } catch {
      toast.error("Arama yapılamadı. Lütfen tekrar dene.")
    } finally {
      setSearching(false)
    }
  }

  const f = norm(filter.trim())
  const visible = (p: Candidate) =>
    !f || norm(p.name).includes(f) || norm(p.brand).includes(f)
  const byPrice = (a: Candidate, b: Candidate) =>
    cheapestPrice(a) - cheapestPrice(b)

  const aiSet = new Set(aiIds)
  const aiPicks = [...known.values()]
    .filter((p) => aiSet.has(p.productId) && poolIds.has(p.productId))
    .filter(visible)
    .sort(byPrice)
  const others = poolProducts
    .filter((p) => !aiSet.has(p.productId))
    .filter(visible)
    .sort(byPrice)
  const added = extras
    .filter((p) => !poolIds.has(p.productId))
    .filter(visible)
    .sort(byPrice)
  const searched = (searchResults?.products ?? [])
    .filter((p) => !poolIds.has(p.productId))
    .filter((p) => !added.some((a) => a.productId === p.productId))
    .filter(visible)
    .sort(byPrice)

  const sections: Array<{ key: string; title: string; items: Candidate[] }> = [
    { key: "ai", title: "Asistanın seçtikleri", items: aiPicks },
    { key: "added", title: "Eklediğin ürünler", items: added },
    {
      key: "search",
      title: searchResults ? `"${searchResults.query}" araması` : "",
      items: searched,
    },
    { key: "others", title: "Diğer sonuçlar", items: others },
  ].filter((s) => s.items.length > 0)

  const nothingVisible = pool.status === "ready" && sections.length === 0

  return (
    <>
      <ResponsiveDialogHeader className="p-4 pb-3 md:pr-10">
        <ResponsiveDialogTitle>Ürünü değiştir</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          {capitalize(match.rawName)} için uymayan ürünlerin işaretini kaldır.
          Sepet, işaretli kalanlarla yeniden hesaplanır.
        </ResponsiveDialogDescription>
        {match.note && (
          <p className="text-xs text-muted-foreground">
            Notun:{" "}
            <span className="font-medium text-foreground">{match.note}</span>
          </p>
        )}
      </ResponsiveDialogHeader>

      <form onSubmit={runSearch} className="px-4 pb-3">
        <InputGroup>
          <InputGroupAddon>
            <RiSearchLine aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Arama yapın"
            aria-label="Ürün ara"
            enterKeyHint="search"
            disabled={pool.status !== "ready"}
          />
        </InputGroup>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto border-t px-2 py-2">
        {pool.status === "loading" && <PickerSkeleton />}
        {pool.status === "error" && (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
            <RiErrorWarningLine className="size-5" aria-hidden="true" />
            Ürünler yüklenemedi.
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setPool({ status: "loading" })
                setReloadKey((k) => k + 1)
              }}
            >
              <RiRefreshLine data-icon="inline-start" />
              Tekrar dene
            </Button>
          </div>
        )}
        {pool.status === "ready" &&
          sections.map((s) => (
            <section key={s.key} className="pb-2">
              <h3 className="px-2 pt-2 pb-1 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                {s.title}{" "}
                <span className="font-normal tabular-nums">
                  ({s.items.length})
                </span>
              </h3>
              <ul>
                {s.items.map((p) => (
                  <li key={p.productId}>
                    <CandidateRow
                      product={p}
                      checked={selected.has(p.productId)}
                      planMarkets={plan.get(p.productId) ?? null}
                      onToggle={() => toggle(p.productId)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        {nothingVisible && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            {filter.trim()
              ? "Listede eşleşen ürün yok."
              : "Bu kalem için markette fiyatı olan ürün bulunamadı."}
          </p>
        )}
        {pool.status === "ready" && filter.trim().length >= 2 && (
          <div className="flex justify-center px-4 py-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => runSearch()}
              disabled={searching}
            >
              {searching ? (
                <RiLoader4Line
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <RiSearchLine data-icon="inline-start" />
              )}
              &quot;{filter.trim()}&quot; için markette ara
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t bg-muted/30 px-4 py-3">
        <PreviewLine
          current={summary}
          next={preview?.summary ?? null}
          ready={pool.status === "ready"}
        />
        <div className="flex flex-wrap items-center gap-2">
          {canRestoreAi && pool.status === "ready" && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set(aiIds))}
              disabled={applying}
            >
              Asistanın seçtiklerine dön
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={applying}
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => onApply(selectedIds)}
              disabled={!canApply}
            >
              {applying ? "Uygulanıyor…" : "Uygula"}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

function CandidateRow({
  product: p,
  checked,
  planMarkets,
  onToggle,
}: {
  product: Candidate
  checked: boolean
  planMarkets: string[] | null
  onToggle: () => void
}) {
  const markets = [...p.markets].sort((a, b) => a.price - b.price)
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50",
        !checked && "opacity-70 hover:opacity-100"
      )}
    >
      <CheckboxVisual checked={checked} className="mt-0.5" />
      <Thumb url={p.imageUrl} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="line-clamp-2 text-sm leading-snug font-medium">
          {p.name}
        </span>
        {planMarkets && (
          <Badge variant="secondary" className="self-start">
            Sepette · {planMarkets.join(", ")}
          </Badge>
        )}
        <div className="flex flex-wrap gap-1">
          {markets.map((m, i) => (
            <span
              key={m.market}
              className={cn(
                // İç içe yarıçap: logo 20px'lik daire, çevresinde 2px dolgu →
                // dış yarıçap 10 + 2 = 12px, yani 24px yükseklikte tam hap.
                "inline-flex items-center gap-1 rounded-full bg-muted/70 p-0.5 pr-2 text-[0.6875rem] tabular-nums",
                i === 0 && "font-semibold"
              )}
            >
              <MarketLogo name={m.market} size="xs" />
              <span className="sr-only">{m.market}</span>
              {formatTL(m.price)}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}

function Thumb({ url }: { url: string | null }) {
  // Market CDN'i görsele 404 dönebiliyor; kırık resim yerine kutu.
  const [failed, setFailed] = React.useState(false)
  return (
    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
      {url && !failed ? (
        <Image
          src={url}
          alt=""
          width={56}
          height={56}
          className="size-14 object-contain"
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <RiBox3Line
          aria-hidden="true"
          className="size-5 text-muted-foreground"
        />
      )}
    </div>
  )
}

function PickerSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-2 py-2" aria-busy="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="mt-0.5 size-4" />
          <Skeleton className="size-14" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

type PreviewPlan = {
  key: "single" | "combo"
  markets: string[]
  total: number
  /** Şimdiki karttaki aynı türden planın toplamı; plan yeni çıktıysa null. */
  before: number | null
  partial: boolean
}

/**
 * Seçim uygulanırsa Sepet Özeti'nin iki satırı ne olur: tek market ve iki
 * market planı, kartla aynı sırada (tek market sepeti karşılamıyorsa
 * kombinasyon önce). Her satır kartın diliyle: logo, market adları, yeni
 * toplam ve değiştiyse altında şimdiki toplam. Bağlamsız "+₺38,00" rozeti
 * neyin farkı olduğunu söylemiyordu.
 */
function PreviewLine({
  current,
  next,
  ready,
}: {
  current: OptimizationSummary
  next: OptimizationSummary | null
  ready: boolean
}) {
  if (!ready) {
    return (
      <span className="text-xs text-muted-foreground">Ürünler yükleniyor…</span>
    )
  }
  if (!next || next.totalItems === 0) {
    return (
      <span className="text-xs text-amber-700 dark:text-amber-400">
        En az bir ürün seç.
      </span>
    )
  }

  const hasCombo = (s: OptimizationSummary) =>
    s.twoMarketCombo.markets.length === 2
  const single: PreviewPlan | null =
    next.singleMarket.itemCount > 0
      ? {
          key: "single",
          markets: [next.singleMarket.market],
          total: next.singleMarket.total,
          before:
            current.singleMarket.itemCount > 0
              ? current.singleMarket.total
              : null,
          partial: !next.singleMarket.isFullCoverage,
        }
      : null
  const combo: PreviewPlan | null = hasCombo(next)
    ? {
        key: "combo",
        markets: next.twoMarketCombo.markets,
        total: next.twoMarketCombo.total,
        before: hasCombo(current) ? current.twoMarketCombo.total : null,
        partial: false,
      }
    : null
  const comboFirst = !next.singleMarket.isFullCoverage && combo !== null
  const plans = (comboFirst ? [combo, single] : [single, combo]).filter(
    (p): p is PreviewPlan => p !== null
  )
  const sameAsNow = (p: PreviewPlan) =>
    p.before != null && Math.round(p.before * 100) === Math.round(p.total * 100)

  // Satırlar logo boyunda (24px) tek satır: eski toplam yeni toplamın soluna
  // gelir. İki satırlı tutar sütunu her satıra 10px boşluk ekliyordu.
  return (
    <div className="flex flex-col gap-1.5" aria-live="polite">
      <span className="mb-0.5 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
        Sepet önizlemesi
      </span>
      {plans.map((p) => (
        <div key={p.key} className="flex h-6 items-center gap-2.5">
          {p.markets.length > 1 ? (
            <MarketLogoGroup names={p.markets} size="sm" />
          ) : (
            <MarketLogo name={p.markets[0]} size="sm" />
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            <span className="sr-only">
              {p.key === "single" ? "Tek market: " : "İki market: "}
            </span>
            {p.markets.join(" + ")}
            {p.partial && (
              <span className="font-normal text-amber-700 dark:text-amber-400">
                {" "}
                · eksik kalem var
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1 tabular-nums">
            {!sameAsNow(p) && p.before != null && (
              <>
                <span className="text-xs text-muted-foreground">
                  <span className="sr-only">şu an </span>
                  {formatTL(p.before)}
                </span>
                <RiArrowRightLine
                  aria-hidden="true"
                  className="size-3 text-muted-foreground"
                />
                <span className="sr-only">yeni </span>
              </>
            )}
            <span className="text-sm font-semibold">{formatTL(p.total)}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
