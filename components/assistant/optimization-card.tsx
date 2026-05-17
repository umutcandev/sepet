"use client"

import { TrendingDownIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { MarketLogo, MarketLogoGroup } from "@/components/market-logo"
import type { OptimizationSummary } from "@/lib/ai/schemas"

function formatMissingItemsText(names: string[], market: string): string {
  if (names.length === 0) return ""
  const capitalized = names.map(
    (n) => n.charAt(0).toLocaleUpperCase("tr-TR") + n.slice(1),
  )
  const joined =
    capitalized.length === 1
      ? capitalized[0]
      : capitalized.length === 2
        ? capitalized.join(" ve ")
        : `${capitalized.slice(0, -1).join(", ")} ve ${capitalized[capitalized.length - 1]}`
  return `${joined} ${market} stoğunda yok`
}

export function OptimizationCard({ summary }: { summary: OptimizationSummary }) {
  if (!summary) return null
  const tl = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  })

  const { singleMarket, twoMarketCombo, totalItems } = summary
  const hasCombo = twoMarketCombo.markets.length === 2
  const singleIsFull = singleMarket.isFullCoverage

  // When single is partial AND a full-coverage combo exists, combo is the real
  // recommendation — render it first.
  const comboFirst = !singleIsFull && hasCombo

  const singleRow = (
    <div key="single" className="flex items-center gap-3 px-4 py-3">
      <MarketLogo name={singleMarket.market} size="default" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium text-muted-foreground">
          {singleIsFull
            ? "Tek market en ucuz"
            : "Tek markette sepet eksik kalıyor"}
        </div>
        <div className="truncate text-base font-semibold">
          {singleMarket.market}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">
          {singleIsFull
            ? `${singleMarket.itemCount}/${totalItems} kalem`
            : singleMarket.missingItemNames && singleMarket.missingItemNames.length > 0
              ? formatMissingItemsText(
                  singleMarket.missingItemNames,
                  singleMarket.market,
                )
              : `${singleMarket.itemCount}/${totalItems} kalem`}
        </div>
      </div>
      <span className="shrink-0 text-xl font-bold tabular-nums">
        {tl.format(singleMarket.total)}
      </span>
    </div>
  )

  const comboRow = hasCombo ? (
    <div key="combo" className="flex items-center gap-3 px-4 py-3">
      <MarketLogoGroup names={twoMarketCombo.markets} size="default" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          {comboFirst
            ? "Tüm sepeti karşılayan kombinasyon"
            : "İki market kombinasyonu"}
          {twoMarketCombo.savingsTL > 0 && (
            <Badge
              variant="outline"
              className="border-emerald-500/40 px-1.5 py-0 text-[10px] text-emerald-700 dark:text-emerald-300"
            >
              <TrendingDownIcon className="mr-0.5 size-2.5" />%
              {twoMarketCombo.savingsPct.toFixed(1)}
            </Badge>
          )}
        </div>
        <div className="truncate text-base font-semibold">
          {twoMarketCombo.markets.join(" + ")}
        </div>
        <div
          className={
            twoMarketCombo.savingsTL > 0
              ? "text-[11px] font-medium text-emerald-700 dark:text-emerald-300"
              : "text-[11px] text-muted-foreground"
          }
        >
          {twoMarketCombo.savingsTL > 0
            ? `${tl.format(twoMarketCombo.savingsTL)} tasarruf`
            : `${totalItems}/${totalItems} kalem`}
        </div>
      </div>
      <span className="shrink-0 text-xl font-bold tabular-nums">
        {tl.format(twoMarketCombo.total)}
      </span>
    </div>
  ) : null

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
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
