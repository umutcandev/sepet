"use client"

import { Fragment, useState } from "react"
import Image from "next/image"
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
}) {
  const [open, setOpen] = useState(false)
  // Döküm eklenmeden önce kaydedilmiş özetlerde `allocation` boş dizi olur
  // (bkz. şemadaki `.default([])`) — kart toplamı ve marketi gösterir, yalnızca
  // açılır döküm kapalı kalır.
  const canExpand = allocation.length > 0

  return (
    <div>
      <button
        type="button"
        onClick={() => canExpand && setOpen((v) => !v)}
        disabled={!canExpand}
        aria-expanded={canExpand ? open : undefined}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors focus-visible:inset-ring-3 focus-visible:inset-ring-ring/50",
          canExpand && "cursor-pointer hover:bg-muted/40",
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
          <RiArrowDownSLine
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>
      {open && canExpand && (
        <AllocationBreakdown
          allocation={allocation}
          markets={markets}
          imageFallback={imageFallback}
        />
      )}
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
