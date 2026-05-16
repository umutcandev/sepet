"use client"

import * as React from "react"
import {
  CheckIcon,
  DownloadIcon,
  InfoIcon,
  Loader2Icon,
  SaveIcon,
} from "lucide-react"
import { toast } from "sonner"
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
}: {
  data: ReceiptComparisonPayload
}) {
  const [savedId, setSavedId] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  const { comparison, receiptContext, summary, matches } = data

  const linkItems = comparison.items.filter((it) => !!it.bestUrl)

  function handleDownloadLinks() {
    if (linkItems.length === 0) {
      toast.error("İndirilebilecek ürün bağlantısı bulunamadı.")
      return
    }
    const body = linkItems
      .map((it) => {
        const name = it.matchedName ?? it.rawName
        const market = it.bestMarket ? ` (${it.bestMarket})` : ""
        return `${name}${market}\n${it.bestUrl}`
      })
      .join("\n\n")
    const blob = new Blob([`${body}\n`], {
      type: "text/plain;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "fis-urun-linkleri.txt"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const canSave = !!receiptContext.imageR2Key
  const isStale = !!comparison.staleness?.isStale
  const staleLabel = (() => {
    const s = comparison.staleness
    if (!s?.isStale) return null
    if (s.reason === "date" && s.ageLabel) {
      return `${s.ageLabel} öncesi • bilgi amaçlı`
    }
    return "Farklı dönem • bilgi amaçlı"
  })()

  async function handleSave() {
    if (!canSave || saving || savedId) return
    setSaving(true)
    try {
      const res = await saveReceipt({
        imageUrl: receiptContext.imageUrl,
        imageR2Key: receiptContext.imageR2Key!,
        marketName: receiptContext.marketName,
        purchaseDate: receiptContext.purchaseDate,
        totalAmount: receiptContext.totalAmount,
        items: receiptContext.items,
        summary,
        matches,
        comparison,
      })
      setSavedId(res.id)
      toast.success("Fiş geçmişine kaydedildi.")
    } catch (err) {
      console.error("[ReceiptComparisonCard] save failed", err)
      toast.error("Fiş kaydedilemedi. Lütfen tekrar dene.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <span className="text-sm font-medium">Fiş Karşılaştırması</span>
        {isStale ? (
          <Badge variant="outline" className="ml-auto text-muted-foreground">
            {staleLabel}
          </Badge>
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
            <TableRow className="text-[11px] uppercase tracking-wide text-muted-foreground">
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
              return (
                <TableRow key={idx}>
                  <TableCell className="align-top">
                    <div className="text-sm font-medium">{it.rawName}</div>
                    {it.matchedName && it.matchedName !== it.rawName && (
                      <div className="text-[11px] text-muted-foreground">
                        ↪ {it.matchedName}
                      </div>
                    )}
                    {it.sizeMismatch && (
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                        <InfoIcon className="size-3" />
                        Farklı boyut — fiyat kıyaslanamaz
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatTL(it.receiptTotalPrice)}
                  </TableCell>
                  <TableCell>
                    {it.bestMarket ? (
                      it.bestUrl ? (
                        <a
                          href={it.bestUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary underline"
                        >
                          {it.bestMarket}
                        </a>
                      ) : (
                        <span className="text-sm">{it.bestMarket}</span>
                      )
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
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t bg-muted/30 px-4 py-3 text-sm">
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
              <span className="ml-1 text-[11px] text-muted-foreground">
                (bugünkü piyasaya göre)
              </span>
            )}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {linkItems.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDownloadLinks}
            >
              <DownloadIcon className="mr-1 size-3.5" />
              Ürün Linklerini İndir
            </Button>
          )}
          {savedId ? (
            <Button type="button" size="sm" variant="secondary" disabled>
              <CheckIcon className="mr-1 size-3.5" />
              Kaydedildi
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!canSave || saving}
            >
              {saving ? (
                <Loader2Icon className="mr-1 size-3.5 animate-spin" />
              ) : (
                <SaveIcon className="mr-1 size-3.5" />
              )}
              Fiş Geçmişine Kaydet
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTL(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—"
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(n)
}
