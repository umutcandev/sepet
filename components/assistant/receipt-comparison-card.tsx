"use client"

import * as React from "react"
import { ChevronDownIcon, InfoIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { saveReceipt } from "@/lib/actions/receipts"
import { SaveRecordRow } from "@/components/assistant/save-record-row"
import { MarketLogo } from "@/components/market-logo"
import { formatTLOrDash as formatTL } from "@/lib/format"
import type {
  MatchResult,
  OptimizationSummary,
  ReceiptComparison,
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
}: {
  data: ReceiptComparisonPayload
  conversationId?: string | null
  toolCallId?: string | null
  initialSavedId?: string | null
}) {
  const { comparison, receiptContext, summary, matches } = data
  const [expanded, setExpanded] = React.useState<Set<number>>(new Set())

  // productId → tüm market fiyatları (best dahil). Satır genişletildiğinde
  // best dışındakileri sırayla göstereceğiz.
  const marketPricesByProductId = React.useMemo(() => {
    const map = new Map<string, MatchResult["marketPrices"]>()
    for (const m of matches) {
      if (m.bestMatch) map.set(m.bestMatch.productId, m.marketPrices)
    }
    return map
  }, [matches])

  function toggleRow(idx: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

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
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <span className="text-sm font-medium">Fiş Karşılaştırması</span>
        {isStale ? (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <InfoIcon className="size-3.5" />
            Fişiniz Eski
          </span>
        ) : (
          comparison.totalSavingsTL > 0 && (
            <Badge
              variant="outline"
              className="ml-auto border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
            >
              {formatTL(comparison.totalSavingsTL)} tasarruf mümkündü
            </Badge>
          )
        )}
      </div>

      <div className="overflow-x-auto">
        <Table className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
          <TableHeader>
            <TableRow className="text-[0.6875rem] uppercase tracking-wide text-muted-foreground">
              <TableHead className="min-w-[140px]">Ürün</TableHead>
              <TableHead className="w-28 text-right">Fişteki</TableHead>
              <TableHead className="min-w-[140px]">En iyi market</TableHead>
              <TableHead className="w-24 text-right">En iyi fiyat</TableHead>
              <TableHead className="w-24 text-right">Fark</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparison.items.map((it, idx) => {
              const hasSavings = (it.savingsTL ?? 0) > 0
              const allPrices = it.matchedProductId
                ? marketPricesByProductId.get(it.matchedProductId) ?? []
                : []
              // best market dışındaki entry'ler. bestMarket eşleşmiyorsa
              // (sentetik fallback durumu) tüm liste gösterilir.
              const otherPrices = it.bestMarket
                ? allPrices.filter((mp) => mp.market !== it.bestMarket)
                : allPrices
              const canExpand = otherPrices.length > 0
              const isOpen = expanded.has(idx)
              return (
                <React.Fragment key={idx}>
                  <TableRow>
                    <TableCell className="align-top">
                      <div className="flex items-start gap-2">
                        {canExpand && (
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => toggleRow(idx)}
                            aria-expanded={isOpen}
                            aria-label={
                              isOpen
                                ? "Diğer market fiyatlarını gizle"
                                : "Diğer market fiyatlarını göster"
                            }
                            className="relative -ml-1 mt-0.5 text-muted-foreground after:absolute after:-inset-2 hover:text-foreground"
                          >
                            <ChevronDownIcon
                              className={`transition-transform ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </Button>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{it.rawName}</div>
                          {it.matchedName && it.matchedName !== it.rawName && (
                            <div className="text-[0.6875rem] text-muted-foreground">
                              ↪ {it.matchedName}
                            </div>
                          )}
                          {it.sizeMismatch && (
                            <div className="mt-0.5 flex items-center gap-1 text-[0.6875rem] text-amber-600 dark:text-amber-400">
                              <InfoIcon className="size-3" />
                              Farklı boyut. Karşılaştırma tam olarak doğru olmayabilir.
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatTL(it.receiptTotalPrice)}
                    </TableCell>
                    <TableCell>
                      {it.bestMarket ? (
                        <div className="flex items-center gap-2">
                          <MarketLogo name={it.bestMarket} size="sm" />
                          <span className="text-sm">{it.bestMarket}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          eşleşme yok
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatTL(it.bestPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {it.savingsTL == null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : hasSavings && !isStale ? (
                        <span className="font-medium text-emerald-700 dark:text-emerald-300">
                          −{formatTL(it.savingsTL)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          +/− 0
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                  {canExpand && isOpen && (
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={5} className="p-0">
                        <div className="px-4 py-2">
                          <div className="mb-1.5 text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
                            Diğer Marketlerdeki Fiyatlar
                          </div>
                          <ul className="grid divide-y rounded-md border bg-background">
                            {otherPrices.map((mp, i) => (
                              <li
                                key={`${mp.market}-${i}`}
                                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <MarketLogo name={mp.market} size="sm" />
                                  <span className="text-muted-foreground">
                                    {mp.market}
                                  </span>
                                </div>
                                <span className="font-medium tabular-nums">
                                  {formatTL(mp.price)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 border-t bg-muted/30 px-4 py-3 text-sm">
        <div className="flex flex-wrap items-baseline gap-3 text-xs text-muted-foreground">
          <span>
            Fiş toplamı:{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatTL(comparison.totalReceiptAmount)}
            </span>
          </span>
          <span>
            En iyi:{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatTL(comparison.totalBestAmount)}
            </span>
            {isStale && (
              <span className="ml-1 text-[0.6875rem] text-muted-foreground">
                (bugünkü piyasaya göre)
              </span>
            )}
          </span>
        </div>
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
      </div>
    </div>
  )
}
