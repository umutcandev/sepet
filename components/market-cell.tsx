import { RiExternalLinkLine } from "@remixicon/react"

import { MarketLogo } from "@/components/market-logo"
import { findMarket } from "@/lib/markets/registry"
import { cn } from "@/lib/utils"

type Size = "sm" | "default" | "lg"

// Market adı hiçbir yazı boyutu sınıfı taşımıyor, mirasa bırakıyordu: masaüstü
// tabloda <table class="text-sm"> onu 14px'e çekiyor, ama detay sayfasının mobil
// kart listesinde miras doğrudan body'den geliyor ve 16px oluyordu. Sonuç, aynı
// satırda 11px "1 adet", 14px fiyat ve 16px market adı. Ölçek artık `size`e
// bağlı ve her yerde aynı.
const TEXT_SIZE: Record<Size, string> = {
  sm: "text-xs",
  default: "text-sm",
  lg: "text-base",
}

type MarketCellProps = {
  name: string | null | undefined
  size?: Size
  clickable?: boolean
  showExternalIcon?: boolean
  className?: string
}

/**
 * Logo + market adı (+ varsa dış-link ikonu) — registry'de URL varsa yeni
 * sekmede açılır. Liste sayfaları gibi satırı zaten link olan yerlerde
 * `clickable={false}` ver: iç içe <a> üretmez.
 */
export function MarketCell({
  name,
  size = "default",
  clickable = true,
  showExternalIcon = true,
  className,
}: MarketCellProps) {
  if (!name) {
    return (
      <span className={cn(TEXT_SIZE[size], "text-muted-foreground")}>—</span>
    )
  }

  const entry = findMarket(name)
  const url = entry?.url ?? null
  const isKnown = entry !== null

  const inner = (
    <>
      <MarketLogo name={name} size={size} />
      <span
        className={cn(
          // `min-w-0` olmadan `truncate` bir flex kabında hiç devreye girmez:
          // flex öğesinin varsayılan `min-width: auto`su onu içeriğinin altına
          // inmekten alıkoyar, ad kırpılmak yerine kabı taşırır.
          "min-w-0 truncate",
          !isKnown && "italic text-muted-foreground",
        )}
      >
        {name}
      </span>
      {clickable && url && showExternalIcon && (
        <RiExternalLinkLine className="size-3 shrink-0 text-muted-foreground" />
      )}
    </>
  )

  const base = cn("inline-flex items-center gap-2", TEXT_SIZE[size])

  if (clickable && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener nofollow noreferrer sponsored"
        className={cn(base, "hover:underline", className)}
      >
        {inner}
      </a>
    )
  }

  return <span className={cn(base, className)}>{inner}</span>
}
