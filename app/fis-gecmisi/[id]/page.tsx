import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { getReceiptDetailCached } from "@/lib/data/records"
import { withResolvedItemImages } from "@/lib/data/item-images"
import { isReceiptStaleByDate } from "@/lib/receipt-staleness"
import { parseSummary } from "@/lib/basket-plan"
import { formatDate, formatTL } from "@/lib/format"
import { priceFreshness } from "@/lib/price-freshness"
import { Badge } from "@/components/ui/badge"
import { MarketCell } from "@/components/market-cell"
import { OptimizationCard } from "@/components/assistant/optimization-card"
import {
  MarketSplitDonut,
  type MarketDatum,
} from "@/components/charts/market-split-donut"
import { RecordHeader } from "@/components/records/record-header"
import {
  RecordInfoList,
  RecordInfoNote,
  RecordInfoRow,
} from "@/components/records/record-info-list"
import {
  RecordItemList,
  type RecordItemView,
} from "@/components/records/record-item-list"
import { ReceiptImage } from "@/components/records/receipt-image"
import { ReceiptActionsMenu } from "./actions-menu"

function receiptTitle(receipt: {
  name: string | null
  marketName: string | null
  purchaseDate: Date | null
  createdAt: Date
}): string {
  if (receipt.name?.trim()) return receipt.name.trim()
  const date = receipt.purchaseDate ?? receipt.createdAt
  return `${receipt.marketName ?? "Fiş"} · ${formatDate(date)}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) return { title: "Fiş Detayı" }
  const { id } = await params
  const detail = await getReceiptDetailCached(id, session.user.id)
  return { title: detail ? receiptTitle(detail.receipt) : "Fiş Detayı" }
}

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/fis-gecmisi")

  const { id } = await params
  const detail = await getReceiptDetailCached(id, session.user.id)
  if (!detail) notFound()
  const { receipt, conversation } = detail
  // Bkz. sepet detayı: görseli boş kalan kalemler eşleşen üründen tamamlanır.
  const items = await withResolvedItemImages(detail.items, "receipt")

  const isStale = isReceiptStaleByDate(receipt.purchaseDate)
  const totalSavings =
    !isStale && receipt.potentialSavingsTL
      ? Number(receipt.potentialSavingsTL)
      : 0

  const summary = parseSummary(receipt.summaryJson)

  // Fişte "yeniden hesaplat" diye bir aksiyon yok (OCR karşılaştırması tekrar
  // kurulamaz), o yüzden fiyat yaşı tarihin yanında sessiz bir not olarak durur.
  const freshness = priceFreshness(receipt.createdAt)

  const itemViews: RecordItemView[] = items.map((it) => ({
    id: it.id,
    rawName: it.rawName,
    quantity: Number(it.quantity),
    unit: it.unit,
    matchedName:
      it.matchedName && it.matchedName !== it.rawName ? it.matchedName : null,
    matchedBrand: it.matchedBrand,
    matchedImageUrl: it.matchedImageUrl,
    matchedProductId: it.matchedProductId,
    searchQuery: it.searchQuery,
    matched:
      it.lookupStatus != null
        ? it.lookupStatus === "ok"
        : it.matchedProductId != null,
    // Fişte kalem satırının fiyatı gerçekten o kaleme ait (fişten okundu) —
    // sepetteki plan belirsizliği burada yok. Tutar TEK PAKET fiyatı: satırın
    // iki tarafı da (fişteki paket fiyatı / en iyi paket fiyatı) aynı tabanda
    // olsun diye, `packs` bu yüzden daima 1 (bkz. ReceiptComparison).
    plan: it.bestMarket
      ? {
          market: it.bestMarket,
          unitPrice: it.bestPrice ? Number(it.bestPrice) : 0,
          packs: 1,
          lineTotal: it.bestPrice ? Number(it.bestPrice) : 0,
          depotName: null,
          sizeMismatch: false,
        }
      : null,
    receiptUnitPrice: it.receiptUnitPrice
      ? Number(it.receiptUnitPrice)
      : null,
    savings: !isStale && it.savingsTL ? Number(it.savingsTL) : null,
  }))

  const matchedCount = itemViews.filter((it) => it.matched).length
  const allMatched = matchedCount === itemViews.length

  // Dağılım da kalem satırlarıyla AYNI tabanda: tek paket fiyatı. Burası
  // `bestPrice × quantity` topluyordu, yani aynı sayfada satırda ₺30 yazan
  // kalem grafikte ₺90 sayılıyordu; satırın kendisi kendiyle çelişiyordu.
  const marketSplitMap = new Map<string, number>()
  for (const it of items) {
    if (!it.bestMarket || !it.bestPrice) continue
    const line = Number(it.bestPrice)
    if (!Number.isFinite(line) || line <= 0) continue
    marketSplitMap.set(
      it.bestMarket,
      (marketSplitMap.get(it.bestMarket) ?? 0) + line,
    )
  }
  const marketSplit: MarketDatum[] = Array.from(marketSplitMap.entries()).map(
    ([market, value]) => ({ market, value }),
  )
  const showSplit = marketSplit.length >= 2

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <RecordHeader
        title={receiptTitle(receipt)}
        createdAt={receipt.createdAt}
        meta={
          freshness ? <span>Fiyatlar {freshness.ageLabel} alındı</span> : null
        }
        actions={
          <ReceiptActionsMenu id={receipt.id} conversation={conversation} />
        }
      />

      {/* Bento: dar sol kolon görsel + sepet özeti, geniş sağ kolon fiş bilgisi
          + dağılım, altta tam genişlik kalem listesi. İki kolon da iki kart
          taşır — tek kartlı bir kolon yanındaki uzun kolonun hizasında koca bir
          boşluk bırakıyordu.
          Mobil: `order` ile kalemler önce (asıl sonuç onlar), sonra görsel
          (katlanmış bir başlığa iner) ve özet, en sonda bilgi + dağılım. */}
      <div className="grid gap-5 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="order-2 min-w-0 space-y-5 md:order-1">
          <ReceiptImage url={receipt.imageUrl} />

          {summary && <OptimizationCard summary={summary} />}
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
                <MarketCell name={receipt.marketName} size="sm" />
              </div>
            </RecordInfoRow>
            <RecordInfoRow label="Tarih">
              <span className="tabular-nums">
                {formatDate(receipt.purchaseDate ?? receipt.createdAt)}
              </span>
            </RecordInfoRow>
            <RecordInfoRow label="Kalem">
              <span className="tabular-nums">
                {allMatched
                  ? items.length
                  : `${matchedCount}/${items.length} eşleşti`}
              </span>
            </RecordInfoRow>
            <RecordInfoRow label="Fiş tutarı">
              <span className="tabular-nums">
                {receipt.totalAmount
                  ? formatTL(Number(receipt.totalAmount))
                  : "—"}
              </span>
            </RecordInfoRow>
            {receipt.bestSingleMarket && (
              <RecordInfoRow label="En iyi market">
                <div className="flex flex-wrap items-center justify-end gap-x-2">
                  <MarketCell name={receipt.bestSingleMarket} size="sm" />
                  {receipt.bestSingleTotal && (
                    <span className="tabular-nums text-muted-foreground">
                      {formatTL(Number(receipt.bestSingleTotal))}
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
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="flex min-h-12 items-center border-b px-4 py-2 text-sm font-medium">
                Marketlere Göre Dağılım
              </div>
              <div className="p-4">
                <MarketSplitDonut
                  data={marketSplit}
                  totalLabel="En iyi alternatif"
                  emptyHint="Dağılım için yeterli market yok."
                />
              </div>
            </div>
          )}
        </div>

        <div className="order-1 min-w-0 md:order-3 md:col-span-2">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex min-h-12 flex-wrap items-center gap-2 border-b px-4 py-2">
              <span className="text-sm font-medium">Fişteki Kalemler</span>
              <Badge variant="secondary">
                {allMatched
                  ? items.length
                  : `${matchedCount}/${items.length} eşleşti`}
              </Badge>
            </div>
            <RecordItemList items={itemViews} emptyHint="Bu fişte kalem yok." />
          </div>
        </div>
      </div>
    </div>
  )
}
