"use client"

import { Fragment, useState } from "react"
import {
  RiArrowDownLine,
  RiArrowDownSLine,
  RiErrorWarningLine,
} from "@remixicon/react"
import { Badge } from "@/components/ui/badge"
import { MarketLogo, MarketLogoGroup } from "@/components/market-logo"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { formatTL } from "@/lib/format"
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

// Bir seçeneğin (tek market / iki market) hangi kalemlerden oluştuğunu, market
// bazında gruplayarak bir tabloda gösterir. Tek market için tek grup → market
// başlığı gizlenir; kombinasyonda her market kendi başlık satırı altında listelenir.
// Gösterilen tutarlar GERÇEK paket fiyatlarıdır (oran-orantı yok); birden çok
// paket gerekiyorsa "× N" ve birim fiyat ayrıca belirtilir.
function AllocationBreakdown({
  allocation,
  markets,
}: {
  allocation: MarketAllocation[]
  markets: string[]
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
                    <TableCell className="py-1 align-top whitespace-normal">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">
                          {capitalize(e.rawName) || e.productName}
                        </span>
                        {multiPack && (
                          <span className="shrink-0 rounded bg-muted px-1 text-[0.625rem] font-medium tabular-nums text-muted-foreground">
                            {e.quantity}×
                          </span>
                        )}
                        <DepotInfo depotName={e.depotName} market={e.market} />
                      </div>
                      <div className="text-[0.6875rem] text-muted-foreground">
                        {e.productName}
                        {multiPack && ` · ${formatTL(e.unitPrice)}/paket`}
                      </div>
                      {e.sizeMismatch && (
                        <div className="flex items-center gap-1 text-[0.625rem] text-amber-600 dark:text-amber-400">
                          <RiErrorWarningLine className="size-2.5" />
                          Farklı Boyut
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-1 text-right align-top text-xs tabular-nums">
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
  allocation,
  markets,
}: {
  logo: React.ReactNode
  label: string
  badge?: React.ReactNode
  title: string
  subtitle: React.ReactNode
  subtitleClassName: string
  total: number
  allocation: MarketAllocation[]
  markets: string[]
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
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          canExpand && "cursor-pointer hover:bg-muted/40",
        )}
      >
        {logo}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[0.6875rem] font-medium text-muted-foreground">
            {label}
            {badge}
          </div>
          <div className="truncate text-base font-semibold">{title}</div>
          <div className={subtitleClassName}>{subtitle}</div>
        </div>
        <span className="shrink-0 text-xl font-bold tabular-nums">
          {formatTL(total)}
        </span>
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
        <AllocationBreakdown allocation={allocation} markets={markets} />
      )}
    </div>
  )
}

export function OptimizationCard({ summary }: { summary: OptimizationSummary }) {
  if (!summary) return null

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
          <Badge
            variant="outline"
            className="border-emerald-500/40 px-1.5 py-0 text-[0.625rem] text-emerald-700 dark:text-emerald-300"
          >
            <RiArrowDownLine className="mr-0.5 size-2.5" />%
            {twoMarketCombo.savingsPct.toFixed(1)}
          </Badge>
        ) : undefined
      }
      title={twoMarketCombo.markets.join(" + ")}
      subtitle={
        twoMarketCombo.savingsTL > 0
          ? `${formatTL(twoMarketCombo.savingsTL)} tasarruf`
          : `${totalItems}/${totalItems} kalem`
      }
      subtitleClassName={
        twoMarketCombo.savingsTL > 0
          ? "text-[0.6875rem] font-medium text-emerald-700 dark:text-emerald-300"
          : "text-[0.6875rem] text-muted-foreground"
      }
      total={twoMarketCombo.total}
      allocation={twoMarketCombo.allocation}
      markets={twoMarketCombo.markets}
    />
  ) : null

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex min-h-12 flex-wrap items-center gap-2 border-b px-4 py-2">
        <span className="text-sm font-medium">Sepet Özeti</span>
      </div>
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
    </div>
  )
}
