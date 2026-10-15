"use client"

import * as React from "react"
import { RiArrowDownSLine, RiInformationLine } from "@remixicon/react"
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
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
import { formatTLOrDash } from "@/lib/format"
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
    <Card>
      <CardHeader>
        <CardTitle>Fiş Karşılaştırması</CardTitle>
        {isStale ? (
          <Badge variant="secondary" className="ml-auto">
            <RiInformationLine data-icon="inline-start" />
            Fişiniz Eski
          </Badge>
        ) : (
          comparison.totalSavingsTL > 0 && (
            <Badge variant="success" className="ml-auto">
              {formatTLOrDash(comparison.totalSavingsTL)} tasarruf mümkündü
            </Badge>
          )
        )}
      </CardHeader>

      <div className="overflow-x-auto">
        <Table className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
          <TableHeader>
            <TableRow className="text-[0.6875rem] uppercase tracking-wide text-muted-foreground">
              <TableHead className="min-w-[140px]">Ürün</TableHead>
              {/* Üç sayı kolonu da PAKET başına: "Fişteki" satır toplamıyken
                  yanındaki "En iyi fiyat" tek paketti, yani tablo iki farklı
                  tabanı yan yana koyup farkını alıyordu. */}
              <TableHead className="w-28 text-right">Fişteki paket</TableHead>
              <TableHead className="min-w-[140px]">En iyi market</TableHead>
              <TableHead className="w-24 text-right">En iyi paket</TableHead>
              <TableHead className="w-24 text-right">Fark</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparison.items.map((it, idx) => {
              const hasSavings = (it.savingsTL ?? 0) > 0
              // Diğer marketler de "en iyi" ile AYNI kümeden: her markette
              // kabul edilen ürünlerin en ucuzu, Sepet Özeti'nin o marketteki
              // satırıyla aynı ürün. Ürün marketten markete değişebildiği
              // için adı da yazılır. Kalemler `matches` ile aynı sırada.
              const otherPrices = [...(matches[idx]?.marketOptions ?? [])]
                .filter((opt) => opt.market !== it.bestMarket)
                .sort((a, b) => a.packagePrice - b.packagePrice)
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
                            <RiArrowDownSLine
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
                              <RiInformationLine className="size-3" />
                              Farklı boyut. Karşılaştırma tam olarak doğru olmayabilir.
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatTLOrDash(it.receiptUnitPrice)}
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
                      {formatTLOrDash(it.bestPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {it.savingsTL == null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : hasSavings && !isStale ? (
                        <span className="font-medium text-emerald-700 dark:text-emerald-300">
                          −{formatTLOrDash(it.savingsTL)}
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
                          {/* Kakma yüzey: gölge yok, kenar `border-hairline`.
                              İçerideki `divide-y` `--border`da kalıyor —
                              ayraç, dış kenardan zayıf olmalı. */}
                          <ul className="grid divide-y rounded-md border border-hairline bg-background">
                            {otherPrices.map((opt, i) => (
                              <li
                                key={`${opt.market}-${i}`}
                                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <MarketLogo name={opt.market} size="sm" />
                                  <div className="min-w-0">
                                    <div className="text-muted-foreground">
                                      {opt.market}
                                    </div>
                                    <div className="truncate text-[0.6875rem] text-muted-foreground">
                                      {opt.productName}
                                    </div>
                                  </div>
                                </div>
                                <span className="shrink-0 font-medium tabular-nums">
                                  {formatTLOrDash(opt.packagePrice)}
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

      <CardFooter className="flex-col items-stretch gap-3 text-sm">
        <div className="flex flex-wrap items-baseline gap-3 text-xs text-muted-foreground">
          <span>
            Fişteki paket fiyatları:{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatTLOrDash(comparison.totalReceiptAmount)}
            </span>
          </span>
          <span>
            En iyi:{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatTLOrDash(comparison.totalBestAmount)}
            </span>
            {isStale && (
              <span className="ml-1 text-[0.6875rem] text-muted-foreground">
                (bugünkü piyasaya göre)
              </span>
            )}
          </span>
        </div>
        {/* Toplamlar fişin basılı genel toplamı DEĞİL. Etiketi söylemeyip
            kullanıcıyı fişle karşılaştırmaya bırakmak, tutmayan iki sayı
            gösterip sebebini saklamak olurdu. */}
        <p className="text-[0.6875rem] text-muted-foreground">
          Karşılaştırma paket başına yapılır; aldığın adet fiyatı çarpmaz.
        </p>
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
      </CardFooter>
    </Card>
  )
}
