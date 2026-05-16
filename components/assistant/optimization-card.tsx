"use client"

import {
  TrendingDownIcon,
  AlertTriangleIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { MarketLogo, MarketLogoGroup } from "@/components/market-logo"
import type { OptimizationSummary } from "@/lib/ai/schemas"

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
      {singleIsFull ? (
        <MarketLogo name={singleMarket.market} size="default" />
      ) : (
        <AlertTriangleIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      )}
      <div className="min-w-0 flex-1">
        <div
          className={
            singleIsFull
              ? "text-[11px] font-medium text-muted-foreground"
              : "text-[11px] font-medium text-amber-700 dark:text-amber-300"
          }
        >
          {singleIsFull
            ? "Tek market en ucuz"
            : "Tek markette sepet eksik kalıyor"}
        </div>
        <div className="truncate text-base font-semibold">
          {singleMarket.market}
        </div>
        <div
          className={
            singleIsFull
              ? "text-[11px] text-muted-foreground"
              : "text-[11px] text-amber-700 dark:text-amber-400"
          }
        >
          {singleMarket.itemCount}/{totalItems} kalem
          {singleMarket.missingItemCount > 0 &&
            ` · ${singleMarket.missingItemCount} kalem stokta yok`}
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
    <div
      className={
        "overflow-hidden rounded-xl border bg-card " +
        (singleIsFull ? "" : "border-amber-500/40")
      }
    >
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
