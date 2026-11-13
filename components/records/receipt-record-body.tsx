import { formatDate, formatTL } from "@/lib/format"
import { isReceiptStaleByDate } from "@/lib/receipt-staleness"
import type { ReceiptRecordData } from "@/lib/records/record-data"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { MarketCell } from "@/components/market-cell"
import { OptimizationCard } from "@/components/assistant/optimization-card"
import {
  MarketSplitDonut,
  type MarketDatum,
} from "@/components/charts/market-split-donut"
import {
  RecordInfoList,
  RecordInfoNote,
  RecordInfoRow,
} from "@/components/records/record-info-list"
import {
  RecordItemList,
  type RecordItemView,
} from "@/components/records/record-item-list"
import {
  ReceiptImage,
  ReceiptImageOmitted,
} from "@/components/records/receipt-image"

/** Fiş detayının gövdesi: kayıt sayfası ve paylaşılan sayfa ortak. */
export function ReceiptRecordBody({
  data,
  imageUrl,
  readOnly = false,
}: {
  data: ReceiptRecordData
  /** null: görsel paylaşılmadı. */
  imageUrl: string | null
  /** Paylaşılan sayfa: kalemler canlı ürün panelini açmaz. */
  readOnly?: boolean
}) {
  const { items, summary } = data
  const isStale = isReceiptStaleByDate(data.purchaseDate)
  const totalSavings = !isStale && data.potentialSavings ? data.potentialSavings : 0

  const itemViews: RecordItemView[] = items.map((it, i) => ({
    id: String(i),
    rawName: it.rawName,
    quantity: it.quantity,
    unit: it.unit,
    matchedName:
      it.matchedName && it.matchedName !== it.rawName ? it.matchedName : null,
    matchedBrand: it.matchedBrand,
    matchedImageUrl: it.matchedImageUrl,
    matchedProductId: it.matchedProductId,
    searchQuery: it.searchQuery,
    matched: it.matched,
    // Fiş kalemi TEK PAKET fiyatıyla kıyaslanır; packs bu yüzden daima 1.
    plan: it.bestMarket
      ? {
          market: it.bestMarket,
          unitPrice: it.bestPrice ?? 0,
          packs: 1,
          lineTotal: it.bestPrice ?? 0,
          depotName: null,
          sizeMismatch: false,
        }
      : null,
    receiptUnitPrice: it.receiptUnitPrice,
    savings: !isStale && it.savings != null ? it.savings : null,
  }))

  const matchedCount = itemViews.filter((it) => it.matched).length
  const allMatched = matchedCount === itemViews.length

  // Dağılım da satırlarla aynı tabanda: tek paket fiyatı.
  const marketSplitMap = new Map<string, number>()
  for (const it of items) {
    if (!it.bestMarket || !it.bestPrice) continue
    if (!Number.isFinite(it.bestPrice) || it.bestPrice <= 0) continue
    marketSplitMap.set(
      it.bestMarket,
      (marketSplitMap.get(it.bestMarket) ?? 0) + it.bestPrice,
    )
  }
  const marketSplit: MarketDatum[] = Array.from(marketSplitMap.entries()).map(
    ([market, value]) => ({ market, value }),
  )
  const showSplit = marketSplit.length >= 2

  return (
    // Bento: dar sol kolon görsel + özet, geniş sağ kolon bilgi + dağılım,
    // altta tam genişlik kalemler. Mobilde kalemler önce.
    <div className="grid gap-5 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <div className="order-2 min-w-0 space-y-5 md:order-1">
        {imageUrl !== null ? (
          <ReceiptImage url={imageUrl} />
        ) : (
          <ReceiptImageOmitted />
        )}

        {summary && (
          <OptimizationCard summary={summary} imageFallback={data.itemImages} />
        )}
      </div>

      <div className="order-3 min-w-0 space-y-5 md:order-2">
        <RecordInfoList
          title="Fiş Bilgisi"
          headerRight={
            !isStale && totalSavings > 0 ? (
              <Badge variant="success" className="tabular-nums">
                {formatTL(totalSavings)}
                <span className="sr-only"> tasarruf edebilirdin</span>
              </Badge>
            ) : null
          }
        >
          <RecordInfoRow label="Market">
            <div className="flex justify-end">
              <MarketCell name={data.marketName} size="sm" />
            </div>
          </RecordInfoRow>
          <RecordInfoRow label="Tarih">
            <span className="tabular-nums">
              {formatDate(data.purchaseDate ?? data.createdAt)}
            </span>
          </RecordInfoRow>
          <RecordInfoRow label="Kalem">
            <span className="tabular-nums">
              {allMatched
                ? items.length
                : `${matchedCount}/${items.length} eşleşti`}
            </span>
          </RecordInfoRow>
          <RecordInfoRow label="Fiş Tutarı">
            <span className="tabular-nums">
              {data.totalAmount != null ? formatTL(data.totalAmount) : "—"}
            </span>
          </RecordInfoRow>
          {data.bestSingleMarket && (
            <RecordInfoRow label="En İyi Market">
              <div className="flex flex-wrap items-center justify-end gap-x-2">
                <MarketCell name={data.bestSingleMarket} size="sm" />
                {data.bestSingleTotal != null && (
                  <span className="tabular-nums text-muted-foreground">
                    {formatTL(data.bestSingleTotal)}
                  </span>
                )}
              </div>
            </RecordInfoRow>
          )}
          {isStale && (
            <RecordInfoNote className="bg-muted/40">
              Bu fiş 6 aydan eski olduğundan bugünkü piyasayla kıyaslanmıyor.
            </RecordInfoNote>
          )}
        </RecordInfoList>

        {showSplit && (
          <Card>
            <CardHeader>
              <CardTitle>Marketlere Göre Dağılım</CardTitle>
            </CardHeader>
            <div className="p-4">
              <MarketSplitDonut
                data={marketSplit}
                totalLabel="En iyi alternatif"
                emptyHint="Dağılım için yeterli market yok."
              />
            </div>
          </Card>
        )}
      </div>

      <div className="order-1 min-w-0 md:order-3 md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Fişteki Kalemler</CardTitle>
            <Badge variant="secondary">
              {allMatched
                ? items.length
                : `${matchedCount}/${items.length} eşleşti`}
            </Badge>
          </CardHeader>
          <RecordItemList
            items={itemViews}
            emptyHint="Bu fişte kalem yok."
            readOnly={readOnly}
          />
        </Card>
      </div>
    </div>
  )
}
