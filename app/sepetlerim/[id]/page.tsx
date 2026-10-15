import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { getBasketDetailCached } from "@/lib/data/records"
import { withResolvedItemImages } from "@/lib/data/item-images"
import {
  createAllocationLookup,
  marketTotals,
  parseSummary,
  planItemProduct,
  recommendedPlan,
} from "@/lib/basket-plan"
import { formatDateTime, formatTL } from "@/lib/format"
import { priceFreshness } from "@/lib/price-freshness"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
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

  // Kalem satırları fiyatı taşımaz; fiyat ve market seçili planın dökümünden
  // okunur. Aksi halde kayıt sayfası, kullanıcıya hiç önerilmemiş üçüncü bir
  // sepet gösteriyordu (her kalem ayrı bir marketten, dört ayrı mağaza).
  //
  // Döküm `summaryJson`'a sonradan eklendi: ondan önceki sepetlerde toplamlar ve
  // marketler var ama kalem bazlı fiyat YOK. Sessizce boş bırakmak yerine durumu
  // söyle — kullanıcı bunun bir arıza değil eski kayıt olduğunu bilsin ve
  // "Fiyatları yenile"ye yönelsin.
  const hasBreakdown = (plan?.allocation.length ?? 0) > 0
  const takeAllocation = createAllocationLookup(plan?.allocation ?? [])
  const itemViews: RecordItemView[] = items.map((it) => {
    const alloc = takeAllocation(it.rawName)
    // Ad, görsel ve ürün paneli fiyatı gösterilen ürüne bağlı (bkz.
    // planItemProduct); Sepet Özeti'nin dökümüyle aynı ürün.
    const product = planItemProduct(
      {
        productId: it.matchedProductId,
        name: it.matchedName,
        brand: it.matchedBrand,
        imageUrl: it.matchedImageUrl,
      },
      alloc,
      itemImages,
    )
    return {
      id: it.id,
      rawName: it.rawName,
      quantity: Number(it.quantity),
      unit: it.unit,
      matchedName:
        product.name && product.name !== it.rawName ? product.name : null,
      matchedBrand: product.brand,
      matchedImageUrl: product.imageUrl,
      matchedProductId: product.productId,
      searchQuery: it.searchQuery,
      // Eski kayıtlarda lookupStatus yok → eşleşen ürün id'si karar verir.
      matched:
        it.lookupStatus != null
          ? it.lookupStatus === "ok"
          : it.matchedProductId != null,
      plan: alloc
        ? {
            market: alloc.market,
            unitPrice: alloc.unitPrice,
            packs: alloc.quantity,
            lineTotal: alloc.lineTotal,
            depotName: alloc.depotName,
            sizeMismatch: alloc.sizeMismatch,
          }
        : null,
    }
  })

  const matchedCount = itemViews.filter((it) => it.matched).length
  const allMatched = matchedCount === itemViews.length

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

      {/* Masaüstü: üstte iki kolon — solda sepet bilgisi + dağılım, sağda
          sepet özeti; altta tam genişlik kalem listesi.
          Mobil: `order` ile önce özet (sonuç), sonra kalemler (döküm), en son
          bilgi ve dağılım — sohbetteki okuma sırasının aynısı. */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="order-3 min-w-0 space-y-5 md:order-1">
          <RecordInfoList
            title="Sepet Bilgisi"
            headerRight={
              twoMarketSavings > 0 ? (
                <Badge variant="success" className="tabular-nums">
                  {formatTL(twoMarketSavings)}
                  <span className="sr-only"> iki market tasarrufu</span>
                </Badge>
              ) : null
            }
          >
            <RecordInfoRow label="Oluşturuldu">
              <span className="tabular-nums">
                {formatDateTime(basket.createdAt)}
              </span>
            </RecordInfoRow>
            <RecordInfoRow label="Kalem">
              <span className="tabular-nums">
                {allMatched
                  ? items.length
                  : `${matchedCount}/${items.length} eşleşti`}
              </span>
            </RecordInfoRow>
            {basket.bestSingleMarket && (
              <RecordInfoRow label="Tek market">
                <div className="flex flex-wrap items-center justify-end gap-x-2">
                  <MarketCell name={basket.bestSingleMarket} size="sm" />
                  {basket.bestSingleTotal && (
                    <span className="tabular-nums text-muted-foreground">
                      {formatTL(Number(basket.bestSingleTotal))}
                    </span>
                  )}
                </div>
              </RecordInfoRow>
            )}
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
          <div className="order-1 min-w-0 md:order-2">
            <OptimizationCard
              summary={summary}
              imageFallback={itemImages}
            />
          </div>
        )}

        <div className="order-2 min-w-0 md:order-3 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Sepetteki Kalemler</CardTitle>
              <Badge variant="secondary">
                {allMatched
                  ? items.length
                  : `${matchedCount}/${items.length} eşleşti`}
              </Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {hasBreakdown && plan
                  ? `Fiyatlar: ${plan.label} planı`
                  : "Fiyat dökümü yok"}
              </span>
            </CardHeader>
            <RecordItemList
              items={itemViews}
              emptyHint="Bu sepette kalem yok."
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
