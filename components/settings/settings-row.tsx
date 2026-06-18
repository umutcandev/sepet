import * as React from "react"

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
      <h2 className="cn-font-heading text-lg font-semibold sm:text-xl">
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
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
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
  description,
  target,
  children,
}: {
  title: string
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
        <span className="text-sm font-normal">{title}</span>
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
