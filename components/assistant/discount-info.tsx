"use client"

import { RiPriceTag3Line } from "@remixicon/react"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatTL } from "@/lib/format"
import { hasNationalPricing } from "@/lib/markets/registry"
import { cn } from "@/lib/utils"
import { COMPACT_BADGE } from "@/components/assistant/compact-badge"
import type { MarketAllocation } from "@/lib/ai/schemas"

type Discounted = Pick<
  MarketAllocation,
  | "market"
  | "unitPrice"
  | "quantity"
  | "regularPrice"
  | "discountScope"
  | "depotName"
>

export function discountPercent(e: Discounted): number | null {
  if (e.regularPrice == null || !(e.regularPrice > e.unitPrice)) return null
  const pct = Math.round((1 - e.unitPrice / e.regularPrice) * 100)
  return pct >= 1 ? pct : null
}

function scopeText(e: Discounted): string {
  if (e.discountScope === "branch") {
    return e.depotName
      ? `Yalnızca ${e.depotName} şubesinde geçerli; rota bu şubeye uğruyor.`
      : "Yalnızca bu şubede geçerli; rota bu şubeye uğruyor."
  }
  if (e.discountScope === "chain") return `Tüm ${e.market} şubelerinde geçerli.`
  return hasNationalPricing(e.market)
    ? "Kampanya şubeye göre değişebilir."
    : "Bu şubenin kampanyası; diğer şubelerde fiyat farklı olabilir."
}

export function DiscountInfo({ entry }: { entry: Discounted }) {
  const pct = discountPercent(entry)
  if (pct == null || entry.regularPrice == null) return null
  const regularTotal = entry.regularPrice * entry.quantity
  const saved = regularTotal - entry.unitPrice * entry.quantity
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          asChild
          variant="success"
          className={cn(
            COMPACT_BADGE,
            "tabular-nums",
            // Dokunma alanı 28px (WCAG 2.5.8).
            "relative cursor-pointer after:absolute after:-inset-x-1 after:-inset-y-1.5"
          )}
        >
          <button
            type="button"
            aria-label={`%${pct} kampanyalı, ayrıntılar`}
            onClick={(e) => e.stopPropagation()}
          >
            <RiPriceTag3Line data-icon="inline-start" />%{pct}
          </button>
        </Badge>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        onClick={(e) => e.stopPropagation()}
        className="w-56 gap-1 p-3"
      >
        <PopoverTitle className="text-xs">
          {entry.discountScope === "branch"
            ? "Şubeye özel kampanya"
            : "Kampanyalı fiyat"}
        </PopoverTitle>
        <PopoverDescription className="text-[0.625rem] text-muted-foreground/70">
          Normal fiyatı{" "}
          <span className="tabular-nums line-through">
            {formatTL(regularTotal)}
          </span>
          , kampanyayla{" "}
          <span className="font-medium text-emerald-700 tabular-nums dark:text-emerald-300">
            {formatTL(saved)}
          </span>{" "}
          daha ucuz. {scopeText(entry)}
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  )
}
