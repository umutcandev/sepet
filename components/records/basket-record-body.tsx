import { marketTotals, recommendedPlan } from "@/lib/basket-plan"
import { formatDate, formatDateTime, formatTL } from "@/lib/format"
import type { BasketRecordData } from "@/lib/records/record-data"
import { cn } from "@/lib/utils"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { BasketApprovalCard } from "@/components/assistant/basket-approval-card"
import { OptimizationCard } from "@/components/assistant/optimization-card"
import { MarketSplitDonut } from "@/components/charts/market-split-donut"
import {
  RecordInfoList,
  RecordInfoNote,
  RecordInfoRow,
} from "@/components/records/record-info-list"

/** Sepet detayının gövdesi: kayıt sayfası ve paylaşılan sayfa ortak. */
export function BasketRecordBody({
  data,
  readOnly = false,
}: {
  data: BasketRecordData
  /** Paylaşılan sayfa: sahibine özel yönlendirme ve kayıt saati gösterilmez. */
  readOnly?: boolean
}) {
  const { items, summary } = data
  const plan = recommendedPlan(summary)
  // Döküm summaryJson'a sonradan eklendi; eski kayıtta yalnız toplamlar var.
  const hasBreakdown = (plan?.allocation.length ?? 0) > 0
  const matchedCount = items.filter((it) => it.matched).length
  const allMatched = matchedCount === items.length
  const marketSplit = marketTotals(plan?.allocation ?? [])
  const showSplit = plan !== null && marketSplit.length >= 2

  return (
    // Masaüstü: solda kalemler + bilgi/dağılım, sağda iki satırı kaplayan
    // özet. Mobil: önce özet, sonra kalemler, en son bilgi ve dağılım.
    <div className="grid items-start gap-5 md:grid-cols-2 md:grid-rows-[auto_1fr]">
      <div className="order-2 min-w-0 md:col-start-1 md:row-start-1">
        <BasketApprovalCard
          readOnly
          data={{
            items: items.map((it) => ({
              name: it.rawName,
              searchQuery: it.searchQuery,
              quantity: it.quantity,
              unit: it.unit,
            })),
          }}
        />
      </div>

      {/* Özeti olmayan eski kayıtta sağ sütun boş kalmasın. */}
      <div
        className={cn(
          "order-3 min-w-0 space-y-5",
          summary
            ? "md:col-start-1 md:row-start-2"
            : "md:col-start-2 md:row-start-1",
        )}
      >
        <RecordInfoList title="Sepet Bilgisi">
          <RecordInfoRow label="Oluşturma Tarihi">
            <span className="tabular-nums">
              {readOnly
                ? formatDate(data.createdAt)
                : formatDateTime(data.createdAt)}
            </span>
          </RecordInfoRow>
          <RecordInfoRow label="Kalem Sayısı">
            <span className="tabular-nums">
              {allMatched
                ? items.length
                : `${items.length} (${matchedCount} eşleşti)`}
            </span>
          </RecordInfoRow>
          <RecordInfoRow label="Potansiyel Tasarruf Miktarı">
            <span className="tabular-nums">
              {formatTL(data.twoMarketSavings)}
            </span>
          </RecordInfoRow>
          {!hasBreakdown && (
            <RecordInfoNote className="bg-muted/40">
              Bu sepet, kalem bazlı fiyat dökümü eklenmeden önce kaydedilmiş.
              Toplamlar kayıtlı, tek tek kalem fiyatları yok.
              {readOnly
                ? null
                : " Güncel fiyatlar için \"Fiyatları yenile\" ile aynı listeyi yeniden hesaplat."}
            </RecordInfoNote>
          )}
        </RecordInfoList>

        {showSplit && (
          <Card>
            <CardHeader>
              <CardTitle>
                {plan.kind === "combo" ? "2-Market Dağılımı" : "Market Dağılımı"}
              </CardTitle>
            </CardHeader>
            <div className="p-4">
              <MarketSplitDonut
                data={marketSplit}
                totalLabel={`${plan.label} toplamı`}
                emptyHint="Dağılım için yeterli market yok."
              />
            </div>
          </Card>
        )}
      </div>

      {summary && (
        <div className="order-1 min-w-0 md:col-start-2 md:row-span-2 md:row-start-1">
          <OptimizationCard
            summary={summary}
            imageFallback={data.itemImages}
            defaultOpen
          />
        </div>
      )}
    </div>
  )
}
