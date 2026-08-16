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
      <div className="border-b px-4 py-3">
        <Skeleton className={`h-4 ${headerWidth}`} />
      </div>
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

function ItemsCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-5 w-10 rounded-md" />
      </div>
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
      <div className="border-b px-4 py-3">
        <Skeleton className="h-4 w-24" />
      </div>
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

function DonutCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="space-y-3 p-4">
        <Skeleton className="mx-auto size-36 rounded-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-8" />
          </div>
        ))}
      </div>
    </div>
  )
}

function HeaderSkeleton({ actions }: { actions: number }) {
  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="ml-auto h-8 w-20" />
      </div>
      <div className="mb-5 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <Skeleton className="h-7 w-56" />
          <div className="flex shrink-0 gap-2">
            {Array.from({ length: actions }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-32" />
            ))}
          </div>
        </div>
        <Skeleton className="h-3.5 w-52" />
      </div>
    </>
  )
}

/** /sepetlerim/[id] — solda bilgi + dağılım, sağda özet, altta kalemler. */
export function BasketDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <HeaderSkeleton actions={2} />
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
      <HeaderSkeleton actions={1} />
      <div className="grid gap-5 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="order-2 min-w-0 space-y-5 md:order-1">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <Skeleton className="h-4 w-24" />
            </div>
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
