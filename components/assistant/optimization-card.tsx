"use client"

import {
  TrendingDownIcon,
  StoreIcon,
  SparklesIcon,
  AlertTriangleIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
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

  const singleCard = (
    <div
      key="single"
      className={
        singleIsFull
          ? "rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-4"
          : "rounded-xl border border-amber-500/40 bg-amber-500/5 p-4"
      }
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {singleIsFull ? (
          <>
            <StoreIcon className="size-4" />
            Tek market en ucuz
          </>
        ) : (
          <>
            <AlertTriangleIcon className="size-4 text-amber-600 dark:text-amber-400" />
            <span className="text-amber-700 dark:text-amber-300">
              Tek markette sepetin eksik kalıyor
            </span>
          </>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-lg font-semibold">{singleMarket.market}</span>
        <span className="text-2xl font-bold tabular-nums">
          {tl.format(singleMarket.total)}
        </span>
      </div>
      <div
        className={
          singleIsFull
            ? "mt-1 text-xs text-muted-foreground"
            : "mt-1 text-xs text-amber-700 dark:text-amber-400"
        }
      >
        {singleMarket.itemCount}/{totalItems} kalem
        {singleMarket.missingItemCount > 0 &&
          ` · ${singleMarket.missingItemCount} kalem stokta yok`}
      </div>
    </div>
  )

  const comboCard = hasCombo ? (
    <div
      key="combo"
      className="rounded-xl border bg-gradient-to-br from-emerald-500/10 to-transparent p-4"
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <SparklesIcon className="size-4" />
        {comboFirst ? "Tüm sepetini karşılayan kombinasyon" : "İki market kombinasyonu"}
        {twoMarketCombo.savingsTL > 0 && (
          <Badge
            variant="outline"
            className="ml-auto border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
          >
            <TrendingDownIcon className="mr-1 size-3" />%
            {twoMarketCombo.savingsPct.toFixed(1)}
          </Badge>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-lg font-semibold">
          {twoMarketCombo.markets.join(" + ")}
        </span>
        <span className="text-2xl font-bold tabular-nums">
          {tl.format(twoMarketCombo.total)}
        </span>
      </div>
      <div className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        {twoMarketCombo.savingsTL > 0
          ? `${tl.format(twoMarketCombo.savingsTL)} tasarruf`
          : `${totalItems}/${totalItems} kalem`}
      </div>
    </div>
  ) : null

  return (
    <div className="grid gap-3">
      {comboFirst ? (
        <>
          {comboCard}
          {singleCard}
        </>
      ) : (
        <>
          {singleCard}
          {comboCard}
        </>
      )}
    </div>
  )
}
