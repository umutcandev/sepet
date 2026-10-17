import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { getBasketDetailCached } from "@/lib/data/records"
import { withResolvedItemImages } from "@/lib/data/item-images"
import { marketTotals, parseSummary, recommendedPlan } from "@/lib/basket-plan"
import { formatDateTime, formatTL } from "@/lib/format"
import { priceFreshness } from "@/lib/price-freshness"
import { cn } from "@/lib/utils"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import type { ParsedItem } from "@/lib/ai/schemas"
import { BasketApprovalCard } from "@/components/assistant/basket-approval-card"
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
import { BasketActionsMenu } from "./actions-menu"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) return { title: "Sepet Detayı" }
  const { id } = await params
  const detail = await getBasketDetailCached(id, session.user.id)
  // Statik metadata yüzünden on kayıtlı sepetin sekme başlığı, tarayıcı geçmişi
  // ve paylaşım önizlemesi birbirinin aynıydı.
  return { title: detail ? detail.basket.name : "Sepet Detayı" }
}

export default async function BasketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sepetlerim")

  const { id } = await params
  const detail = await getBasketDetailCached(id, session.user.id)
  if (!detail) notFound()
  const { basket, conversation } = detail
  // Görseli olmayan kalemler eşleşen üründen tamamlanır — `matchedImageUrl`
  // sütunu sonradan eklendiğinden eski kayıtların tamamı boşta kalmıştı.
  const items = await withResolvedItemImages(detail.items, "basket")
  // Görsel alanından önce kaydedilmiş özetlerin dökümü, kalemlerin eşleşen
  // ürün görselleriyle tamamlanır (bkz. ProductImageFallback).
  const itemImages = Object.fromEntries(
    items.flatMap((it) =>
      it.matchedProductId && it.matchedImageUrl
        ? [[it.matchedProductId, it.matchedImageUrl]]
        : [],
    ),
  )

  const twoMarketSavings = basket.twoMarketSavingsTL
    ? Number(basket.twoMarketSavingsTL)
    : 0

  // Eski/bozuk kayıtlar burada `null`a düşer; sayfa özetsiz ama ayakta kalır.
  const summary = parseSummary(basket.summaryJson)
  const plan = recommendedPlan(summary)

  // Döküm `summaryJson`'a sonradan eklendi: ondan önceki sepetlerde toplamlar ve
  // marketler var ama kalem bazlı fiyat YOK. Sessizce boş bırakmak yerine durumu
  // söyle — kullanıcı bunun bir arıza değil eski kayıt olduğunu bilsin ve
  // "Fiyatları yenile"ye yönelsin.
  const hasBreakdown = (plan?.allocation.length ?? 0) > 0

  // Eski kayıtlarda lookupStatus yok → eşleşen ürün id'si karar verir.
  const matchedCount = items.filter((it) =>
    it.lookupStatus != null
      ? it.lookupStatus === "ok"
      : it.matchedProductId != null,
  ).length
  const allMatched = matchedCount === items.length

  const marketSplit: MarketDatum[] = marketTotals(plan?.allocation ?? [])
  const showSplit = plan !== null && marketSplit.length >= 2

  // "Fiyatları yenile": aynı kalemlerle asistanda yeniden hesaplat. Kayıtlı
  // sepeti ölü bir arşivden tekrar kullanılabilir bir listeye çeviren şey bu.
  const refreshQuery = items
    .map((it) => `${Number(it.quantity)} ${it.unit} ${it.rawName}`)
    .join(", ")

  // Fiyatların yaşı ayrı bir rozet değil, yenileme butonunun tooltip'i.
  const freshness = priceFreshness(basket.createdAt)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <RecordHeader
        title={basket.name}
        createdAt={basket.createdAt}
        actions={
          <BasketActionsMenu
            id={basket.id}
            conversation={conversation}
            refreshHref={
              refreshQuery
                ? `/asistan?liste=${encodeURIComponent(refreshQuery)}`
                : null
            }
            freshnessLabel={freshness?.ageLabel ?? null}
            isStale={freshness?.isStale ?? false}
          />
        }
      />

      {/* Masaüstü: solda kalemler, altında sepet bilgisi ve dağılım; sağda
          iki satırı kaplayan sepet özeti. `grid-rows-[auto_1fr]`: özet uzun
          olduğunda fazlası ikinci satıra gider, kalemlerle bilgi kartı
          arasında boşluk açılmaz.
          Mobil: `order` ile önce özet (sonuç), sonra kalemler, en son bilgi ve
          dağılım — sohbetteki okuma sırasının aynısı. */}
      <div className="grid items-start gap-5 md:grid-cols-2 md:grid-rows-[auto_1fr]">
        {/* Sohbetteki kilitli kartın aynısı: ürün, adet, birim. Fiyat ve
            market Sepet Özeti'nde; burada tekrar etmek tek market dökümünün
            kopyasıydı. */}
        <div className="order-2 min-w-0 md:col-start-1 md:row-start-1">
          <BasketApprovalCard
            readOnly
            data={{
              items: items.map((it) => ({
                name: it.rawName,
                searchQuery: it.searchQuery,
                quantity: Number(it.quantity),
                unit: it.unit as ParsedItem["unit"],
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
                {formatDateTime(basket.createdAt)}
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
              <span className="tabular-nums">{formatTL(twoMarketSavings)}</span>
            </RecordInfoRow>
            {!hasBreakdown && (
              <RecordInfoNote className="bg-muted/40">
                Bu sepet, kalem bazlı fiyat dökümü eklenmeden önce kaydedilmiş.
                Toplamlar kayıtlı, tek tek kalem fiyatları yok. Güncel fiyatlar
                için &quot;Fiyatları yenile&quot; ile aynı listeyi yeniden
                hesaplat.
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

        {/* Sohbetteki genişleyen dökümün bütün verisi zaten diskteydi; kayıt
            sayfası bunu yalnızca halka grafik için toplayıp gerisini atıyordu.
            Kart saf bir bileşen — girdisi summary (eski kayıtlarda dökümün
            görselleri kalemlerden tamamlanır). */}
        {summary && (
          <div className="order-1 min-w-0 md:col-start-2 md:row-span-2 md:row-start-1">
            <OptimizationCard
              summary={summary}
              imageFallback={itemImages}
              defaultOpen
            />
          </div>
        )}
      </div>
    </div>
  )
}
