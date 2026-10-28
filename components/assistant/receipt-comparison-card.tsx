"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  RiArrowDownSLine,
  RiErrorWarningLine,
  RiInformationLine,
} from "@remixicon/react"
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MarqueeText } from "@/components/ui/marquee-text"
import { saveReceipt } from "@/lib/actions/receipts"
import { SaveRecordRow } from "@/components/assistant/save-record-row"
import {
  AllocationThumb,
  COMPACT_BADGE,
  EXPAND,
} from "@/components/assistant/optimization-card"
import { MarketLogo } from "@/components/market-logo"
import { cn } from "@/lib/utils"
import { formatTL, formatTLOrDash } from "@/lib/format"
import type {
  MarketOption,
  MatchResult,
  OptimizationSummary,
  ReceiptComparison,
  ReceiptComparisonItem,
  ReceiptOCRItem,
} from "@/lib/ai/schemas"

export type ReceiptComparisonPayload = {
  comparison: ReceiptComparison
  receiptContext: {
    imageUrl: string
    imageR2Key: string | null
    marketName: string | null
    purchaseDate: string | null
    totalAmount: number | null
    items: Array<
      ReceiptOCRItem & { unitPrice: number | null; totalPrice: number | null }
    >
  }
  summary: OptimizationSummary
  matches: MatchResult[]
}

export function ReceiptComparisonCard({
  data,
  conversationId = null,
  toolCallId = null,
  initialSavedId = null,
  readOnly = false,
}: {
  data: ReceiptComparisonPayload
  conversationId?: string | null
  toolCallId?: string | null
  initialSavedId?: string | null
  /** Kaydet şeridi yok (paylaşılan sayfa). */
  readOnly?: boolean
}) {
  const { comparison, receiptContext, summary, matches } = data

  const canSave = !!receiptContext.imageR2Key
  const isStale = !!comparison.staleness?.isStale

  const namePlaceholder = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
    return `${receiptContext.marketName ?? "Fiş"} · ${fmt.format(new Date())}`
  }, [receiptContext.marketName])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fiş Karşılaştırması</CardTitle>
        {isStale ? (
          <Badge variant="secondary" className="ml-auto">
            <RiInformationLine data-icon="inline-start" />
            Fiş eski
          </Badge>
        ) : (
          comparison.totalSavingsTL > 0 && (
            <Badge variant="success" className="ml-auto tabular-nums">
              {formatTL(comparison.totalSavingsTL)} tasarruf
            </Badge>
          )
        )}
      </CardHeader>

      {/* Satır listesi, tablo değil: beş kolonlu tablo telefonda yalnızca ürün
          kolonunu gösteriyor, fiyatlar ve fark ipucu olmayan yatay kaydırmanın
          arkasında kalıyordu. Sepet Özeti'nin satırlarıyla aynı kalıp: görsel,
          ad, sağda tutar; ayrıntı satırın kendisiyle açılır. */}
      <ul className="divide-y">
        {comparison.items.map((it, idx) => (
          <ComparisonRow
            key={idx}
            item={it}
            // Kalemler `matches` ile aynı sırada.
            match={matches[idx]}
            isStale={isStale}
          />
        ))}
      </ul>

      <CardFooter className="flex-col items-stretch gap-3">
        <div className="grid gap-1.5">
          <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Fişteki fiyatlar</dt>
            <dd className="text-end font-medium tabular-nums">
              {formatTLOrDash(comparison.totalReceiptAmount)}
            </dd>
            <dt className="text-muted-foreground">
              {isStale ? "Bugünkü en iyi fiyatlar" : "En iyi fiyatlar"}
            </dt>
            <dd className="text-end font-medium tabular-nums">
              {formatTLOrDash(comparison.totalBestAmount)}
            </dd>
          </dl>
          {/* Toplamlar fişin basılı genel toplamı DEĞİL. Etiketi söylemeyip
              kullanıcıyı fişle karşılaştırmaya bırakmak, tutmayan iki sayı
              gösterip sebebini saklamak olurdu. */}
          <p className="text-[0.6875rem] text-muted-foreground">
            Karşılaştırma paket başına yapılır; aldığın adet fiyatı çarpmaz.
          </p>
        </div>
        {readOnly ? null : (
          <SaveRecordRow
            size="sm"
            namePlaceholder={namePlaceholder}
            nameLabel="Fiş adı"
            saveLabel="Fişi Kaydet"
            viewHref={(id) => `/fis-gecmisi/${id}`}
            initialSavedId={initialSavedId}
            disabled={!canSave}
            save={(name) =>
              saveReceipt({
                name,
                imageUrl: receiptContext.imageUrl,
                imageR2Key: receiptContext.imageR2Key!,
                marketName: receiptContext.marketName,
                purchaseDate: receiptContext.purchaseDate,
                totalAmount: receiptContext.totalAmount,
                items: receiptContext.items,
                summary,
                matches,
                comparison,
                conversationId,
                sourceToolCallId: toolCallId,
              })
            }
            limitMessage="Fiş kaydetme limitin doldu. Eski bir fişi sil ya da Pro'ya geç."
            successMessage="Fişlerime kaydedildi."
            errorMessage="Fiş kaydedilemedi. Lütfen tekrar dene."
          />
        )}
      </CardFooter>
    </Card>
  )
}

/**
 * Fişin bir kalemi: solda eşleşen ürünün görseli, fişteki ad ve eşleşen ürün;
 * sağda fişteki paket fiyatı; altında en iyi market ve fark. Diğer marketler
 * ya da boyut farkının açıklaması varsa satırın tamamı onları açar.
 */
function ComparisonRow({
  item,
  match,
  isStale,
}: {
  item: ReceiptComparisonItem
  match: MatchResult | undefined
  isStale: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const reduceMotion = useReducedMotion()
  const nameId = React.useId()

  // Diğer marketler de "en iyi" ile AYNI kümeden: her markette kabul edilen
  // ürünlerin en ucuzu, Sepet Özeti'nin o marketteki satırıyla aynı ürün.
  // Ürün marketten markete değişebildiği için adı da yazılır.
  const options = match?.marketOptions ?? []
  const otherPrices = options
    .filter((opt) => opt.market !== item.bestMarket)
    .sort((a, b) => a.packagePrice - b.packagePrice)
  const bestImage =
    options.find((opt) => opt.market === item.bestMarket)?.imageUrl ??
    match?.bestMatch?.imageUrl ??
    null
  // Boyut farkının açıklaması rozete sığmıyor; diğer market yoksa da açılır.
  const canExpand = otherPrices.length > 0 || item.sizeMismatch
  const showMatchedName = !!item.matchedName && item.matchedName !== item.rawName

  return (
    <li>
      {/* OptionRow ile aynı kalıp: açma butonu satırı saydam bir katman olarak
          kaplar (buton içinde blok öğe olamaz), içerik tıklamaları ona geçirir.
          Butonun adı görünen ürün adından gelir. */}
      <div className="relative">
        {canExpand && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-labelledby={nameId}
            className="absolute inset-0 cursor-pointer outline-none transition-colors hover:bg-muted/40 focus-visible:inset-ring-3 focus-visible:inset-ring-ring/50"
          />
        )}
        <div className="pointer-events-none relative flex items-start gap-3 px-4 py-3">
          <AllocationThumb url={bestImage} />
          <div className="min-w-0 flex-1">
            <MarqueeText className="text-sm font-medium">
              <span id={nameId}>{item.rawName}</span>
            </MarqueeText>
            {showMatchedName && (
              <MarqueeText className="text-[0.6875rem] leading-4 text-muted-foreground">
                {item.matchedName}
              </MarqueeText>
            )}
            <BestOffer item={item} isStale={isStale} />
          </div>
          {/* Etiket fiyatın üstünde: sağdaki tutarın fişteki fiyat olduğu,
              en iyi market satırındaki tutardan önce okunur. */}
          <div className="flex shrink-0 flex-col items-end">
            <span className="text-[0.6875rem] leading-4 text-muted-foreground">
              Fişte
            </span>
            <span className="text-sm font-medium tabular-nums">
              {formatTLOrDash(item.receiptUnitPrice)}
            </span>
          </div>
          {/* Ok yeri açılmayan satırda da ayrılır: fiyatlar her satırda aynı
              sağ kenarda kalsın. */}
          {canExpand ? (
            <RiArrowDownSLine
              aria-hidden="true"
              className={cn(
                "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          ) : (
            <span aria-hidden="true" className="size-4 shrink-0" />
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {canExpand && open && (
          <motion.div
            key="details"
            className="overflow-hidden"
            initial={{ height: 0 }}
            animate={{
              height: "auto",
              transition: reduceMotion ? { duration: 0 } : EXPAND,
            }}
            exit={{
              height: 0,
              transition: reduceMotion ? { duration: 0 } : EXPAND,
            }}
          >
            <RowDetails sizeMismatch={item.sizeMismatch} others={otherPrices} />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

/** En iyi market, paket fiyatı ve fişe göre durumu (tek satır, gerekirse kırılır). */
function BestOffer({
  item,
  isStale,
}: {
  item: ReceiptComparisonItem
  isStale: boolean
}) {
  if (!item.bestMarket) {
    return (
      <p className="mt-0.5 text-xs text-muted-foreground">
        Marketlerde bulunamadı
      </p>
    )
  }
  const savings = item.savingsTL ?? 0
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
      <MarketLogo name={item.bestMarket} size="xs" />
      <span className="text-muted-foreground">{item.bestMarket}</span>
      <span className="font-medium tabular-nums">
        {formatTLOrDash(item.bestPrice)}
      </span>
      {/* Boyut farkında tasarruf hesaplanmaz (savingsTL boş); eski fişte
          bugünkü fiyatla fark tasarruf sayılmaz. */}
      {item.sizeMismatch ? (
        <Badge variant="warning" className={COMPACT_BADGE}>
          <RiErrorWarningLine data-icon="inline-start" />
          Farklı boyut
        </Badge>
      ) : isStale || item.savingsTL == null ? null : savings > 0 ? (
        <Badge variant="success" className={cn(COMPACT_BADGE, "tabular-nums")}>
          {formatTL(savings)} ucuz
        </Badge>
      ) : (
        <Badge variant="secondary" className={COMPACT_BADGE}>
          Daha ucuzu yok
        </Badge>
      )}
    </div>
  )
}

/** Açılan ayrıntı: boyut farkının açıklaması ve diğer marketlerin fiyatları. */
function RowDetails({
  sizeMismatch,
  others,
}: {
  sizeMismatch: boolean
  others: MarketOption[]
}) {
  return (
    <div className="grid gap-2 border-t bg-muted/30 px-4 py-3">
      {sizeMismatch && (
        <p className="flex gap-1.5 text-xs text-muted-foreground">
          <RiErrorWarningLine
            aria-hidden="true"
            className="mt-px size-3.5 shrink-0 text-amber-700 dark:text-amber-300"
          />
          Bulunan paket fişteki boyutta değil, fark hesaplanmadı.
        </p>
      )}
      {others.length > 0 && (
        <div className="grid gap-1">
          <p className="text-[0.6875rem] font-medium text-muted-foreground">
            Diğer marketler
          </p>
          <ul className="grid">
            {others.map((opt, i) => (
              <li
                key={`${opt.market}-${i}`}
                className="flex items-center gap-2.5 py-1.5"
              >
                <MarketLogo name={opt.market} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium">{opt.market}</div>
                  <MarqueeText className="text-[0.6875rem] leading-4 text-muted-foreground">
                    {opt.productName}
                  </MarqueeText>
                </div>
                <span className="shrink-0 text-xs font-medium tabular-nums">
                  {formatTL(opt.packagePrice)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
