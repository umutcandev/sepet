"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react"
import {
  RiArrowDownLine,
  RiArrowDownSLine,
  RiBox3Line,
  RiErrorWarningLine,
} from "@remixicon/react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MarketLogo, MarketLogoGroup } from "@/components/market-logo"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { formatPercent, formatTL } from "@/lib/format"
import { DepotInfo } from "@/components/assistant/depot-info"
import { EASE_OUT_EXPO } from "@/lib/motion"
import type { MarketAllocation, OptimizationSummary } from "@/lib/ai/schemas"

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1)
}

function formatMissingItemsText(names: string[], market: string): string {
  if (names.length === 0) return ""
  const capitalized = names.map(capitalize)
  const joined =
    capitalized.length === 1
      ? capitalized[0]
      : capitalized.length === 2
        ? capitalized.join(" ve ")
        : `${capitalized.slice(0, -1).join(", ")} ve ${capitalized[capitalized.length - 1]}`
  return `${joined} ${market} stoğunda yok`
}

/**
 * productId → görsel. Döküm satırının görseli `allocation`da taşınır; o alan
 * eklenmeden önce kaydedilmiş özetlerde çağıranın verdiği bu eşlemeye düşülür
 * (sohbette aynı turun eşleşmeleri, kayıt sayfasında kalemler).
 */
export type ProductImageFallback = Record<string, string>

function AllocationThumb({ url }: { url: string | null }) {
  // Market CDN'i görsele 404 dönebiliyor (bkz. record-item-list Thumb); kırık
  // resim ikonu yerine kutu yer-tutucuya düşer.
  const [failed, setFailed] = useState(false)
  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
      {url && !failed ? (
        <Image
          src={url}
          // Ürün adı hemen yanında yazıyor; görsel dekoratif.
          alt=""
          width={40}
          height={40}
          className="size-10 object-contain"
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <RiBox3Line aria-hidden="true" className="size-4 text-muted-foreground" />
      )}
    </div>
  )
}

// Bir seçeneğin (tek market / iki market) hangi kalemlerden oluştuğunu, market
// bazında gruplayarak bir tabloda gösterir. Tek market için tek grup → market
// başlığı gizlenir; kombinasyonda her market kendi başlık satırı altında listelenir.
// Gösterilen tutarlar GERÇEK paket fiyatlarıdır (oran-orantı yok); birden çok
// paket gerekiyorsa "× N" ve birim fiyat ayrıca belirtilir.
function AllocationBreakdown({
  allocation,
  markets,
  imageFallback,
}: {
  allocation: MarketAllocation[]
  markets: string[]
  imageFallback?: ProductImageFallback
}) {
  const multiMarket = markets.length > 1
  const grouped = markets
    .map((m) => ({
      market: m,
      entries: allocation.filter((a) => a.market === m),
    }))
    .filter((g) => g.entries.length > 0)

  return (
    <div className="border-t bg-muted/30 px-2 py-1">
      <Table className="[&_td]:px-2">
        <TableBody>
          {grouped.map((g) => (
            <Fragment key={g.market}>
              {multiMarket && (
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell colSpan={2} className="pb-1 pt-2">
                    <div className="flex items-center gap-1.5">
                      <MarketLogo name={g.market} size="sm" />
                      <span className="text-[0.6875rem] font-semibold">{g.market}</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {g.entries.map((e, i) => {
                const multiPack = e.quantity > 1
                return (
                  <TableRow
                    key={`${e.productId}-${i}`}
                    className="border-0 hover:bg-transparent"
                  >
                    <TableCell className="py-1.5 whitespace-normal">
                      <div className="flex items-center gap-2.5">
                        <AllocationThumb
                          url={e.imageUrl ?? imageFallback?.[e.productId] ?? null}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium">
                              {capitalize(e.rawName) || e.productName}
                            </span>
                            {multiPack && (
                              <Badge variant="secondary" className="tabular-nums">
                                {e.quantity}×
                              </Badge>
                            )}
                            <DepotInfo depotName={e.depotName} market={e.market} />
                          </div>
                          <div className="text-[0.6875rem] text-muted-foreground">
                            {e.productName}
                            {multiPack && ` · ${formatTL(e.unitPrice)}/paket`}
                          </div>
                          {e.sizeMismatch && (
                            <Badge variant="warning" className="mt-0.5">
                              <RiErrorWarningLine data-icon="inline-start" />
                              Farklı boyut
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 text-right text-xs tabular-nums">
                      {formatTL(e.lineTotal)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * Kullanıcı bir Sepet Özeti satırını en az bir kez açtı mı. Açtıysa satırların
 * açılabildiğini öğrenmiştir; ipucu animasyonu bir daha oynamaz. Kişisel bir
 * kolaylık, kaybolursa yalnızca ipucu tekrar oynar.
 */
const HINT_KEY = "sepet:summary-accordion-opened"

function hintLearned(): boolean {
  try {
    return window.localStorage.getItem(HINT_KEY) === "1"
  } catch {
    return false
  }
}

function markHintLearned() {
  try {
    window.localStorage.setItem(HINT_KEY, "1")
  } catch {
    // depolama kapalı → ipucu bir sonraki kartta yine oynar
  }
}

/** Kart göründükten sonra ipucunun başlamasına kadar geçen süre. */
const PEEK_DELAY_MS = 700
/** İpucunda dökümün aralandığı yükseklik: ilk satırın yaklaşık yarısı. */
const PEEK_HEIGHT = 44

const EXPAND: Transition = { duration: 0.32, ease: EASE_OUT_EXPO }
const PEEK: Transition = {
  duration: 1.6,
  times: [0, 0.3, 0.65, 1],
  ease: "easeInOut",
}

/**
 * Sepet Özeti'nin satırları akordiyon; ama kapalı bir satır yalnızca küçük
 * bir okla bunu söylüyor ve ilk kez gören kullanıcı dökümün varlığını fark
 * etmiyordu. İpucu: satır ekrana ilk girdiğinde döküm kendiliğinden biraz
 * aralanıp geri kapanır. Kullanıcı bir satırı açtığında öğrenilmiş sayılır ve
 * bir daha oynamaz. Hareket azaltma tercihinde hiç oynamaz.
 */
function usePeekHint(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const [peeking, setPeeking] = useState(false)
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    const el = ref.current
    if (!enabled || reduceMotion || !el || hintLearned()) return
    if (typeof IntersectionObserver === "undefined") return
    let timer: number | undefined
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        io.disconnect()
        timer = window.setTimeout(() => {
          if (!hintLearned()) setPeeking(true)
        }, PEEK_DELAY_MS)
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      if (timer) window.clearTimeout(timer)
    }
  }, [enabled, reduceMotion, ref])
  return [peeking, setPeeking] as const
}

function OptionRow({
  logo,
  label,
  badge,
  title,
  subtitle,
  subtitleClassName,
  total,
  totalNote,
  allocation,
  markets,
  imageFallback,
  hint = false,
}: {
  logo: React.ReactNode
  label: string
  badge?: React.ReactNode
  title: string
  subtitle: React.ReactNode
  subtitleClassName: string
  total: number
  /** Tutarın ALTINA giren açıklama (ör. "₺1,65 tasarruf"). */
  totalNote?: React.ReactNode
  allocation: MarketAllocation[]
  markets: string[]
  imageFallback?: ProductImageFallback
  /** Kartın önerdiği ilk satır: açılabildiğini ipucuyla gösterir. */
  hint?: boolean
}) {
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  // Döküm eklenmeden önce kaydedilmiş özetlerde `allocation` boş dizi olur
  // (bkz. şemadaki `.default([])`) — kart toplamı ve marketi gösterir, yalnızca
  // açılır döküm kapalı kalır.
  const canExpand = allocation.length > 0
  const rowRef = useRef<HTMLButtonElement>(null)
  const [peeking, setPeeking] = usePeekHint(rowRef, hint && canExpand)

  function toggle() {
    if (!canExpand) return
    // İpucu sürerken dokunulursa döküm o yükseklikten açılmaya devam eder.
    setPeeking(false)
    markHintLearned()
    setOpen((v) => !v)
  }

  return (
    <div>
      <button
        ref={rowRef}
        type="button"
        onClick={toggle}
        disabled={!canExpand}
        aria-expanded={canExpand ? open : undefined}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors duration-300 focus-visible:inset-ring-3 focus-visible:inset-ring-ring/50",
          canExpand && "cursor-pointer hover:bg-muted/40",
          peeking && "bg-muted/40",
        )}
      >
        {logo}
        <div className="min-w-0 flex-1">
          <div className="text-[0.6875rem] font-medium text-muted-foreground">
            {label}
          </div>
          {/* Rozet market adlarının SAĞINDA. Etiket satırındayken neyi nitelediği
              belirsizdi ("İki market kombinasyonu"nun sıfatı gibi okunuyordu);
              indirim bu kombinasyona ait, o yüzden adların yanında duruyor.
              `min-w-0` şart, yoksa uzun adlarda `truncate` iş görmez. */}
          <div className="flex items-center gap-1.5">
            <span className="min-w-0 truncate text-base font-semibold">
              {title}
            </span>
            {badge}
          </div>
          <div className={subtitleClassName}>{subtitle}</div>
        </div>
        {/* Tutar + indirim tek kolonda: indirim toplamın açıklaması, satırın
            sol ucundayken aralarındaki bağ kopuyordu. */}
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-xl font-bold tabular-nums">
            {formatTL(total)}
          </span>
          {totalNote}
        </div>
        {canExpand && (
          <motion.span
            aria-hidden="true"
            className="shrink-0"
            animate={peeking ? { y: [0, 3, 0, 3, 0] } : { y: 0 }}
            transition={peeking ? { duration: 1.2, ease: "easeInOut" } : EXPAND}
          >
            <RiArrowDownSLine
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </motion.span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {canExpand && (open || peeking) && (
          <motion.div
            key="breakdown"
            className="overflow-hidden"
            initial={{ height: 0 }}
            animate={
              open
                ? { height: "auto", transition: reduceMotion ? { duration: 0 } : EXPAND }
                : { height: [0, PEEK_HEIGHT, PEEK_HEIGHT, 0], transition: PEEK }
            }
            exit={{ height: 0, transition: reduceMotion ? { duration: 0 } : EXPAND }}
            onAnimationComplete={() => {
              if (!open) setPeeking(false)
            }}
            // İpucu sırasında döküm yalnızca görsel; odak ve ekran okuyucu
            // yalnızca kullanıcının açtığı dökümü görür.
            inert={!open}
          >
            <AllocationBreakdown
              allocation={allocation}
              markets={markets}
              imageFallback={imageFallback}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function OptimizationCard({
  summary,
  imageFallback,
}: {
  summary: OptimizationSummary
  imageFallback?: ProductImageFallback
}) {
  // Hiçbir kalem eşleşmediyse gösterilecek bir plan yok; "— ₺0,00" satırı
  // asistanın "Sepet Özeti çıkaramadım" cümlesiyle çelişirdi.
  if (!summary || summary.totalItems === 0) return null

  const { singleMarket, twoMarketCombo, totalItems } = summary
  const hasCombo = twoMarketCombo.markets.length === 2
  const singleIsFull = singleMarket.isFullCoverage

  // When single is partial AND a full-coverage combo exists, combo is the real
  // recommendation — render it first.
  const comboFirst = !singleIsFull && hasCombo

  const singleRow = (
    <OptionRow
      key="single"
      hint={!comboFirst}
      logo={<MarketLogo name={singleMarket.market} size="default" />}
      label={
        singleIsFull
          ? "Tek market en ucuz"
          : "Tek markette sepet eksik kalıyor"
      }
      title={singleMarket.market}
      subtitle={
        singleIsFull
          ? `${singleMarket.itemCount}/${totalItems} kalem`
          : singleMarket.missingItemNames &&
              singleMarket.missingItemNames.length > 0
            ? formatMissingItemsText(
                singleMarket.missingItemNames,
                singleMarket.market,
              )
            : `${singleMarket.itemCount}/${totalItems} kalem`
      }
      subtitleClassName="truncate text-[0.6875rem] text-muted-foreground"
      total={singleMarket.total}
      allocation={singleMarket.allocation}
      markets={[singleMarket.market]}
      imageFallback={imageFallback}
    />
  )

  const comboRow = hasCombo ? (
    <OptionRow
      key="combo"
      hint={comboFirst}
      logo={<MarketLogoGroup names={twoMarketCombo.markets} size="default" />}
      label={
        comboFirst ? "Tüm sepeti karşılayan kombinasyon" : "İki market kombinasyonu"
      }
      badge={
        twoMarketCombo.savingsTL > 0 ? (
          <Badge variant="success">
            <RiArrowDownLine data-icon="inline-start" />
            {formatPercent(twoMarketCombo.savingsPct)}
          </Badge>
        ) : undefined
      }
      title={twoMarketCombo.markets.join(" + ")}
      // Kalem sayısı artık her iki satırda da altyazı: tasarruf tutarı sağa,
      // tutarın altına taşındı ve burası boş kalıyordu.
      subtitle={`${totalItems}/${totalItems} kalem`}
      subtitleClassName="text-[0.6875rem] text-muted-foreground"
      totalNote={
        twoMarketCombo.savingsTL > 0 ? (
          <span className="text-[0.6875rem] font-medium text-emerald-700 dark:text-emerald-300">
            {formatTL(twoMarketCombo.savingsTL)} tasarruf
          </span>
        ) : undefined
      }
      total={twoMarketCombo.total}
      allocation={twoMarketCombo.allocation}
      markets={twoMarketCombo.markets}
      imageFallback={imageFallback}
    />
  ) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sepet Özeti</CardTitle>
      </CardHeader>
      <div className="divide-y">
        {comboFirst ? (
          <>
            {comboRow}
            {singleRow}
          </>
        ) : (
          <>
            {singleRow}
            {comboRow}
          </>
        )}
      </div>
    </Card>
  )
}
