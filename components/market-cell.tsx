import { ExternalLinkIcon } from "lucide-react"

import { MarketLogo } from "@/components/market-logo"
import { findMarket } from "@/lib/markets/registry"
import { cn } from "@/lib/utils"

type Size = "sm" | "default" | "lg"

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
    return <span className="text-muted-foreground">—</span>
  }

  const entry = findMarket(name)
  const url = entry?.url ?? null
  const isKnown = entry !== null

  const inner = (
    <>
      <MarketLogo name={name} size={size} />
      <span
        className={cn(
          "truncate",
          !isKnown && "italic text-muted-foreground",
        )}
      >
        {name}
      </span>
      {clickable && url && showExternalIcon && (
        <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" />
      )}
    </>
  )

  const base = "inline-flex items-center gap-2"

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
