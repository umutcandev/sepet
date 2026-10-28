import * as React from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Panel başlığı: bölümün adı + kısa açıklama. `target`, arama kaydının
// data-search-target'ı ile eşleşir.
export function PanelHeader({
  title,
  description,
  target,
}: {
  title: string
  description?: React.ReactNode
  target?: string
}) {
  return (
    <header data-search-target={target} className="flex flex-col gap-1.5">
      <h2 className="cn-font-heading text-lg font-medium sm:text-xl">
        {title}
      </h2>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </header>
  )
}

// Bir panel içindeki adlandırılmış satır grubu (ör. "Profil", "Görünüm").
export function SettingGroup({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      {title ? (
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      ) : null}
      {/* Satır ayraçları, her satırın ince alt
          kenarıyla yapılır (bağımsız <Separator/> yerine divide-y) → tüm
          ayraçlar birbiriyle aynı incelikte; son satırda kenar olmaz. */}
      <div className="flex flex-col divide-y divide-border">{children}</div>
    </section>
  )
}

// Tek ayar satırı: solda ikonsuz başlık + açıklama, sağda kontrol (buton,
// input, switch…). Kart yok; satırlar arası <Separator /> ile ayrılır.
export function SettingRow({
  title,
  titleAccessory,
  description,
  target,
  children,
}: {
  title: string
  // Başlığın hemen sağında görünen küçük öğe (ör. durum rozeti).
  titleAccessory?: React.ReactNode
  description?: React.ReactNode
  target?: string
  children: React.ReactNode
}) {
  return (
    <div
      data-search-target={target}
      className="flex items-center justify-between gap-3 py-3 sm:gap-7"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-sm font-normal">
          {title}
          {titleAccessory}
        </span>
        {description ? (
          <span className="truncate text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// Veri yüklenirken satırın değişecek parçalarının yerini tutan iskeletler.
// Ölçüleri son hâlle aynı (açıklama satırı text-xs → 16px satır, rozet h-5,
// küçük buton h-7): veri gelince satırlar yer değiştirmez, kaymaz.
export function SettingDescriptionSkeleton({
  className,
}: {
  className?: string
}) {
  return (
    <Skeleton className={cn("inline-block h-3 w-44 align-middle", className)} />
  )
}

export function SettingBadgeSkeleton() {
  return <Skeleton className="h-5 w-12 rounded-md" />
}

export function SettingActionSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-7 w-20", className)} />
}
