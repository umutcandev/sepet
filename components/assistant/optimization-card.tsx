"use client"

import { Fragment, useEffect, useId, useRef, useState } from "react"
import Image from "next/image"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react"
import {
  RiArrowDownSLine,
  RiArrowLeftRightLine,
  RiBox3Line,
  RiErrorWarningLine,
} from "@remixicon/react"
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MarqueeText } from "@/components/ui/marquee-text"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { MarketLogo, MarketLogoGroup } from "@/components/market-logo"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { formatTL } from "@/lib/format"
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

/**
 * Döküm satırındaki "Değiştir": kullanıcı o kalemin hangi ürünlerle
 * karşılanacağını kendisi seçer. Verilmezse (kayıt sayfası, fiş turu, sohbetin
 * eski kartları) buton görünmez.
 */
export type EditAllocation = (entry: MarketAllocation) => void

export function AllocationThumb({ url }: { url: string | null }) {
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
  onEdit,
}: {
  allocation: MarketAllocation[]
  markets: string[]
  imageFallback?: ProductImageFallback
  onEdit?: EditAllocation
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
                  <TableCell className="pb-1 pt-2">
                    {/* Şube bilgisi market başına bir kez, adın sağında: her
                        kalemde aynı balon tekrar ediyordu. */}
                    <div className="flex items-center gap-1.5">
                      <MarketLogo name={g.market} size="sm" />
                      <span className="text-sm font-medium">{g.market}</span>
                      <DepotInfo
                        depotName={g.entries.map((e) => e.depotName)}
                        market={g.market}
                      />
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
                        {/* Izgara: ad ve ürün adı solda, "Farklı boyut" ikisinin
                            ortasında ve sağında (tutarın hemen solunda, satırlar
                            arasında aynı kolonda), tutar ile Değiştir en sağda.
                            Tutar ad satırında, Değiştir ürün adı satırında
                            kalır; ayrı kolonlarken satırlar kendi
                            yüksekliklerine göre diziliyor, hizalar kayıyordu. */}
                        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2">
                          <div className="col-start-1 row-start-1 flex h-5 min-w-0 items-center gap-1.5">
                            <MarqueeText className="text-xs font-medium">
                              {capitalize(e.rawName) || e.productName}
                            </MarqueeText>
                            {multiPack && (
                              <Badge
                                variant="secondary"
                                className={cn(COMPACT_BADGE, "tabular-nums")}
                              >
                                {e.quantity}×
                              </Badge>
                            )}
                          </div>
                          {/* Tek satır: yanındaki "Farklı boyut" yüzünden alt
                              satıra kırılıyordu; sığmayan ad kayarak okunur. */}
                          <MarqueeText className="col-start-1 row-start-2 text-[0.6875rem] leading-4 text-muted-foreground">
                            {e.productName}
                            {multiPack && ` · ${formatTL(e.unitPrice)}/paket`}
                          </MarqueeText>
                          {e.sizeMismatch && (
                            <Badge
                              variant="warning"
                              className={cn(
                                COMPACT_BADGE,
                                "col-start-2 row-span-2 row-start-1 self-center",
                              )}
                            >
                              <RiErrorWarningLine data-icon="inline-start" />
                              Farklı boyut
                            </Badge>
                          )}
                          <span className="col-start-3 row-start-1 justify-self-end text-xs font-medium tabular-nums">
                            {formatTL(e.lineTotal)}
                          </span>
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(e)}
                              aria-label={`${capitalize(e.rawName) || e.productName} için ürünü değiştir`}
                              className="relative col-start-3 row-start-2 inline-flex shrink-0 items-center gap-1 justify-self-end text-[0.6875rem] font-medium leading-4 text-muted-foreground transition-colors after:absolute after:-inset-x-1.5 after:-inset-y-2 hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            >
                              <RiArrowLeftRightLine aria-hidden="true" className="size-3" />
                              Değiştir
                            </button>
                          )}
                        </div>
                      </div>
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
 * Kart içi küçük rozet ("Farklı boyut", indirim yüzdesi): 16px yükseklik, 10px
 * yazı. Varsayılan rozet (20px) satırda üçüncü bir satır kadar yer tutuyordu.
 */
export const COMPACT_BADGE =
  "h-4 gap-0.5 rounded-[5px] px-1 text-[0.625rem] leading-none has-data-[icon=inline-start]:pl-0.5 [&>svg]:size-2.5!"

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

export const EXPAND: Transition = { duration: 0.32, ease: EASE_OUT_EXPO }
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

/**
 * Market adının sağındaki yuvarlak "!": tek markette eksik kalan kalemleri
 * tıklanınca açılan balonda söyler (hover yok, mobil ve masaüstü aynı;
 * bkz. DepotInfo). Eskiden satırın altyazısıydı ve satırı uzatıyordu.
 */
function MissingItemsInfo({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-2xs"
          hitArea
          aria-label="Eksik kalemler"
          className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
        >
          <RiErrorWarningLine />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-56 gap-1 p-3">
        <PopoverTitle className="text-xs">Eksik kalemler</PopoverTitle>
        <PopoverDescription className="text-xs text-muted-foreground">
          {text}
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  )
}

function OptionRow({
  logo,
  label,
  title,
  titleInfo,
  notice,
  total,
  totalNote,
  allocation,
  markets,
  imageFallback,
  onEdit,
  hint = false,
  defaultOpen = false,
}: {
  logo: React.ReactNode
  label: string
  title: string
  /** Market adının sağındaki bilgi balonu (tek market satırında şube). */
  titleInfo?: React.ReactNode
  /** Tek markette eksik kalan kalemler: market adının sağındaki "!" açar. */
  notice?: string
  total: number
  /** Tutarın ALTINA giren açıklama (ör. "₺1,65 tasarruf"). */
  totalNote?: React.ReactNode
  allocation: MarketAllocation[]
  markets: string[]
  imageFallback?: ProductImageFallback
  onEdit?: EditAllocation
  /** Kartın önerdiği ilk satır: açılabildiğini ipucuyla gösterir. */
  hint?: boolean
  /** Döküm açık başlar (kayıtlı sepet sayfası); ipucu gerekmez. */
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const reduceMotion = useReducedMotion()
  // Döküm eklenmeden önce kaydedilmiş özetlerde `allocation` boş dizi olur
  // (bkz. şemadaki `.default([])`) — kart toplamı ve marketi gösterir, yalnızca
  // açılır döküm kapalı kalır.
  const canExpand = allocation.length > 0
  const rowRef = useRef<HTMLButtonElement>(null)
  const labelId = useId()
  const titleId = useId()
  const totalId = useId()
  const [peeking, setPeeking] = usePeekHint(
    rowRef,
    hint && canExpand && !defaultOpen,
  )

  function toggle() {
    if (!canExpand) return
    // İpucu sürerken dokunulursa döküm o yükseklikten açılmaya devam eder.
    setPeeking(false)
    markHintLearned()
    setOpen((v) => !v)
  }

  return (
    <div>
      {/* Satırın tamamı akordiyonu açar, ama market adının yanındaki "!" ayrı
          bir buton: buton içinde buton olamayacağı için açma butonu satırı
          saydam bir katman olarak kaplıyor, içerik onun üstünde tıklamaları
          geçiriyor (pointer-events-none), yalnız "!" kendi tıklamasını alıyor.
          Butonun adı görünen metinden gelir (aria-labelledby). */}
      <div className="relative">
        <button
          ref={rowRef}
          type="button"
          onClick={toggle}
          disabled={!canExpand}
          aria-expanded={canExpand ? open : undefined}
          aria-labelledby={`${labelId} ${titleId} ${totalId}`}
          className={cn(
            "absolute inset-0 outline-none transition-colors duration-300 focus-visible:inset-ring-3 focus-visible:inset-ring-ring/50",
            canExpand && "cursor-pointer hover:bg-muted/40",
            peeking && "bg-muted/40",
          )}
        />
        <div className="pointer-events-none relative flex items-center gap-3 px-4 py-3">
          {logo}
          <div className="min-w-0 flex-1">
            <MarqueeText className="text-[0.6875rem] font-medium text-muted-foreground">
              <span id={labelId}>{label}</span>
            </MarqueeText>
            <div className="flex min-w-0 items-center gap-1.5">
              <MarqueeText className="text-base font-medium">
                <span id={titleId}>{title}</span>
              </MarqueeText>
              {titleInfo || notice ? (
                <span className="pointer-events-auto flex shrink-0 items-center gap-1">
                  {titleInfo}
                  {notice ? <MissingItemsInfo text={notice} /> : null}
                </span>
              ) : null}
            </div>
          </div>
          {/* Tutar ve tasarruf tek kolonda: tasarruf toplamın açıklaması. */}
          <div className="flex shrink-0 flex-col items-end">
            <span id={totalId} className="text-xl font-medium tabular-nums">
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
        </div>
      </div>
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
              onEdit={onEdit}
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
  onEditItem,
  footer,
  defaultOpen = false,
}: {
  summary: OptimizationSummary
  imageFallback?: ProductImageFallback
  onEditItem?: EditAllocation
  /** Kartın altındaki eylem şeridi (sohbette: Kaydet). */
  footer?: React.ReactNode
  /**
   * Satırların dökümü açık başlar. Kayıtlı sepet sayfasında döküm sayfanın
   * asıl içeriği; sohbette kart kısa kalsın diye kapalı.
   */
  defaultOpen?: boolean
}) {
  // Hiçbir kalem eşleşmediyse gösterilecek bir plan yok; "— ₺0,00" satırı
  // asistanın "Sepet Özeti çıkaramadım" cümlesiyle çelişirdi.
  if (!summary || summary.totalItems === 0) return null

  const { singleMarket, twoMarketCombo } = summary
  const hasCombo = twoMarketCombo.markets.length === 2
  const singleIsFull = singleMarket.isFullCoverage

  // When single is partial AND a full-coverage combo exists, combo is the real
  // recommendation — render it first.
  const comboFirst = !singleIsFull && hasCombo

  const singleRow = (
    <OptionRow
      key="single"
      hint={!comboFirst}
      defaultOpen={defaultOpen}
      logo={<MarketLogo name={singleMarket.market} size="default" />}
      // Etiketler kısa ad öbeği, her kelime büyük: "En Ucuz Tek Market",
      // "İki Market Kombinasyonu". Kalem sayısı ("3/3 kalem") yazılmıyor;
      // eksik kalemler market adının sağındaki "!" içinde.
      label={singleIsFull ? "En Ucuz Tek Market" : "Eksik Kalemli Tek Market"}
      title={singleMarket.market}
      // Tek market dökümünde market başlığı yok; şube balonu market adının
      // sağında, dökümün kalemlerinde tekrar etmiyor.
      titleInfo={
        <DepotInfo
          depotName={singleMarket.allocation.map((a) => a.depotName)}
          market={singleMarket.market}
        />
      }
      notice={
        singleIsFull
          ? undefined
          : singleMarket.missingItemNames.length > 0
            ? formatMissingItemsText(
                singleMarket.missingItemNames,
                singleMarket.market,
              )
            : `${singleMarket.missingItemCount} kalem ${singleMarket.market} stoğunda yok`
      }
      total={singleMarket.total}
      allocation={singleMarket.allocation}
      markets={[singleMarket.market]}
      imageFallback={imageFallback}
      onEdit={onEditItem}
    />
  )

  const comboRow = hasCombo ? (
    <OptionRow
      key="combo"
      hint={comboFirst}
      defaultOpen={defaultOpen}
      logo={<MarketLogoGroup names={twoMarketCombo.markets} size="default" />}
      // Tek market eksik kaldığında bu satır öne geçer: "Eksiksiz" farkı
      // söyler, uzun "Tüm sepeti karşılayan kombinasyon" dar ekranda kesiliyordu.
      label={comboFirst ? "Eksiksiz İki Market" : "İki Market Kombinasyonu"}
      title={twoMarketCombo.markets.join(" + ")}
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
      onEdit={onEditItem}
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
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  )
}
