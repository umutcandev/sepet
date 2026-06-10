import Image from "next/image"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { findMarket, getMarketInitial } from "@/lib/markets/registry"

type Size = "sm" | "default" | "lg"

const SIZE_PX: Record<Size, number> = {
  sm: 24,
  default: 32,
  lg: 40,
}

type MarketLogoProps = {
  name: string | null | undefined
  size?: Size
  className?: string
}

export function MarketLogo({ name, size = "default", className }: MarketLogoProps) {
  const entry = findMarket(name)
  const px = SIZE_PX[size]

  return (
    <Avatar size={size} className={cn("bg-background", className)}>
      {entry?.icon ? (
        <Image
          src={entry.icon}
          alt={entry.name}
          width={px}
          height={px}
          className="aspect-square size-full rounded-full object-contain"
          unoptimized
        />
      ) : (
        <AvatarFallback>{getMarketInitial(entry?.name ?? name)}</AvatarFallback>
      )}
    </Avatar>
  )
}

type MarketLogoGroupProps = {
  names: ReadonlyArray<string | null | undefined>
  size?: Size
  max?: number
  className?: string
}

export function MarketLogoGroup({
  names,
  size = "default",
  max = 3,
  className,
}: MarketLogoGroupProps) {
  const visible = names.slice(0, max)
  const overflow = names.length - visible.length

  return (
    <AvatarGroup className={className}>
      {visible.map((n, i) => (
        <MarketLogo key={`${n ?? "unknown"}-${i}`} name={n} size={size} />
      ))}
      {overflow > 0 && <AvatarGroupCount>+{overflow}</AvatarGroupCount>}
    </AvatarGroup>
  )
}
