"use client"

import Image from "next/image"
import {
  PackageIcon,
  AlertCircleIcon,
  CreditCardIcon,
  ChevronDownIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { MatchResult } from "@/lib/ai/schemas"

export function ProductMatchList({ matches }: { matches: MatchResult[] }) {
  if (!matches?.length) return null
  const tlFormatter = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  })

  return (
    <div className="grid gap-2">
      {matches.map((m, i) => {
        const cheapest = m.marketPrices[0]
        const otherPrices = m.marketPrices.slice(1)
        const hasMore = otherPrices.length > 0

        return (
          <div
            key={`${m.searchQuery}-${i}`}
            className="overflow-hidden rounded-xl border bg-card"
          >
            <div className="flex items-center gap-3 p-3">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {m.bestMatch?.imageUrl ? (
                  <Image
                    src={m.bestMatch.imageUrl}
                    alt={m.bestMatch.name}
                    width={48}
                    height={48}
                    className="size-12 object-contain"
                    unoptimized
                  />
                ) : (
                  <PackageIcon className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                {m.bestMatch ? (
                  <>
                    <span className="truncate text-sm font-medium">
                      {m.bestMatch.name}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {m.bestMatch.brand && <span>{m.bestMatch.brand}</span>}
                      {m.bestMatch.marketCount > 0 && (
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                          {m.bestMatch.marketCount} market
                        </Badge>
                      )}
                    </div>
                  </>
                ) : m.lookupStatus === "api_quota" ? (
                  <div className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
                    <CreditCardIcon className="size-3.5" />
                    API kotası tükendi
                  </div>
                ) : m.lookupStatus === "api_error" ? (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircleIcon className="size-3.5" />
                    API hatası
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <AlertCircleIcon className="size-3.5" />
                    Eşleşme bulunamadı
                  </div>
                )}
              </div>
              {cheapest && (
                <div className="flex shrink-0 flex-col items-end text-right">
                  <span className="text-xs text-muted-foreground">
                    {cheapest.market}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {tlFormatter.format(cheapest.price)}
                  </span>
                </div>
              )}
            </div>

            {hasMore && (
              <Collapsible>
                <CollapsibleTrigger
                  className="group flex w-full items-center justify-center gap-1.5 border-t bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60"
                >
                  <span>
                    Diğer marketlerdeki fiyatları gör
                  </span>
                  <ChevronDownIcon className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="grid divide-y border-t bg-muted/20">
                    {otherPrices.map((mp, idx) => (
                      <li
                        key={`${mp.market}-${idx}`}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <span className="text-muted-foreground">{mp.market}</span>
                        <span className="font-medium tabular-nums">
                          {tlFormatter.format(mp.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )
      })}
    </div>
  )
}
