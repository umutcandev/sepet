import { Skeleton } from "@/components/ui/skeleton"

/**
 * Detay rotalarının iskeleti. Sohbette "Görüntüle"ye basan kullanıcı, anlık akan
 * bir arayüzden hiçbir geri bildirim vermeyen bir bekleyişe düşüyordu; kopukluk
 * yalnızca içerikte değil ritimdeydi.
 *
 * İskelet gerçek düzeni taklit etmezse kendi başına bir tutarsızlık kaynağı
 * olur — yüklenince sayfa "zıplar". Bu yüzden tek bir ortak iskelet yok; iki
 * sayfanın kart yerleşimi farklı olduğu için iki varyant var ve her biri kendi
 * sayfasının ızgarasını birebir izler.
 */

function CardSkeleton({
  rows = 4,
  headerWidth = "w-28",
}: {
  rows?: number
  headerWidth?: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <CardHeaderSkeleton width={headerWidth} />
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex min-h-10 items-center justify-between px-4 py-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Kart başlığı — gerçek kartlarla aynı ritim (`min-h-12`, `py-2`). İskeletin
 * `py-3` kullandığı yerlerde yüklenince başlık 4px kayıyordu.
 */
function CardHeaderSkeleton({
  width = "w-28",
  extra,
}: {
  width?: string
  extra?: React.ReactNode
}) {
  return (
    <div className="flex min-h-12 items-center gap-2 border-b px-4 py-2">
      <Skeleton className={`h-4 ${width}`} />
      {extra}
    </div>
  )
}

function ItemsCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <CardHeaderSkeleton
        width="w-36"
        extra={<Skeleton className="h-5 w-10 rounded-md" />}
      />
      <ul className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-3">
            <Skeleton className="size-10 shrink-0 rounded-md" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <div className="space-y-1.5 text-right">
              <Skeleton className="ml-auto h-3 w-14" />
              <Skeleton className="ml-auto h-4 w-20" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SummaryCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <CardHeaderSkeleton width="w-24" />
      <div className="divide-y">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Halka solda, döküm sağda — bkz. MarketSplitDonut'taki aynı yerleşim. */
function DonutCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <CardHeaderSkeleton width="w-40" />
      <div className="flex items-center gap-3 p-4 sm:gap-4">
        <Skeleton className="size-[140px] shrink-0 rounded-full sm:size-[168px]" />
        <div className="grid min-w-0 flex-1 gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex min-h-8 items-center gap-2">
              <Skeleton className="size-2 shrink-0 rounded-full" />
              <Skeleton className="size-6 shrink-0 rounded-full" />
              <Skeleton className="h-3.5 min-w-0 flex-1" />
              <Skeleton className="hidden h-3.5 w-16 shrink-0 sm:block" />
              <Skeleton className="h-3.5 w-9 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Başlık + tek "İşlem Yapın" menüsü. Geri bağlantısı ve dağınık aksiyon
 * butonları kalktığı için iskelet de tek satır — aksi halde yüklenince sayfa
 * bir satır boyu zıplardı (bkz. dosya başındaki not).
 */
function HeaderSkeleton() {
  return (
    <div className="mb-5 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-8 w-28 shrink-0" />
      </div>
      <Skeleton className="h-3.5 w-52" />
    </div>
  )
}

/** /sepetlerim/[id] — solda bilgi + dağılım, sağda özet, altta kalemler. */
export function BasketDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <HeaderSkeleton />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="order-3 min-w-0 space-y-5 md:order-1">
          <CardSkeleton rows={4} />
          <DonutCardSkeleton />
        </div>
        <div className="order-1 min-w-0 md:order-2">
          <SummaryCardSkeleton />
        </div>
        <div className="order-2 min-w-0 md:order-3 md:col-span-2">
          <ItemsCardSkeleton />
        </div>
      </div>
    </div>
  )
}

/** /fis-gecmisi/[id] — solda görsel + özet, sağda bilgi + dağılım. */
export function ReceiptDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <HeaderSkeleton />
      <div className="grid gap-5 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="order-2 min-w-0 space-y-5 md:order-1">
          <div className="overflow-hidden rounded-xl border bg-card">
            <CardHeaderSkeleton width="w-24" />
            <div className="p-3">
              <Skeleton className="h-40 w-full rounded-lg md:h-56" />
            </div>
          </div>
          <SummaryCardSkeleton />
        </div>
        <div className="order-3 min-w-0 space-y-5 md:order-2">
          <CardSkeleton rows={6} />
          <DonutCardSkeleton />
        </div>
        <div className="order-1 min-w-0 md:order-3 md:col-span-2">
          <ItemsCardSkeleton />
        </div>
      </div>
    </div>
  )
}
