"use client"

import {
  RiBankCardLine,
  RiBox3Line,
  RiErrorWarningLine,
} from "@remixicon/react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import type { MatchResult } from "@/lib/ai/schemas"

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1)
}

function formatQuantity(m: MatchResult): string {
  return `${m.quantity.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${m.unit}`
}

/**
 * Sohbette yalnızca eşleştirilemeyen kalemler listelenir. Eşleşen ürünlerin
 * listesi kaldırıldı: hangi ürünün hangi marketten kaça alınacağı Sepet
 * Özeti'nin dökümünde zaten var. Ama o liste bulunamayan kalemleri gösteren
 * tek yerdi ve bu kalemler Sepet Özeti'ne hiç girmez; kaybolmasınlar diye
 * burada, eski "Eşleşen Ürünler" kartıyla aynı görünümde duruyorlar.
 */
export function UnmatchedProductList({ matches }: { matches: MatchResult[] }) {
  const unmatched = (matches ?? []).filter(
    (m) => m.lookupStatus !== "ok" || !m.bestMatch
  )
  if (unmatched.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eşleştirilemeyen Ürünler</CardTitle>
      </CardHeader>
      <div className="divide-y">
        {unmatched.map((m, i) => (
          <div
            key={`${m.searchQuery}-${i}`}
            className="flex items-center gap-3 p-3"
          >
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
              <RiBox3Line
                aria-hidden="true"
                className="size-5 text-muted-foreground"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium">
                {capitalize(m.rawName)}
              </span>
              {m.lookupStatus === "api_quota" ? (
                <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                  <RiBankCardLine
                    aria-hidden="true"
                    className="size-3 shrink-0"
                  />
                  API kotası tükendi
                </span>
              ) : m.lookupStatus === "api_error" ? (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <RiErrorWarningLine
                    aria-hidden="true"
                    className="size-3 shrink-0"
                  />
                  Fiyat servisine ulaşılamadı
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <RiErrorWarningLine
                    aria-hidden="true"
                    className="size-3 shrink-0"
                  />
                  Marketlerde eşleşme bulunamadı
                </span>
              )}
            </div>
            <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
              {formatQuantity(m)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
