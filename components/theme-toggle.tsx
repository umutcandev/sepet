"use client"

import { RiComputerLine, RiMoonLine, RiSunLine } from "@remixicon/react"
import { useTheme } from "next-themes"

import { DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control"
import { useMounted } from "@/hooks/use-mounted"
import { cn } from "@/lib/utils"

export const THEME_OPTIONS = [
  { value: "light", icon: RiSunLine, label: "Açık" },
  { value: "dark", icon: RiMoonLine, label: "Koyu" },
  { value: "system", icon: RiComputerLine, label: "Sistem" },
] as const

export type ThemeValue = (typeof THEME_OPTIONS)[number]["value"]

// Hidrasyondan önce seçili tema bilinmez; sunucu çıktısıyla aynı kalsın diye
// ilk boyamada "light" gösterilir.
export function useThemeChoice() {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()
  const current = (mounted ? (theme ?? "system") : "light") as ThemeValue
  return { current, setTheme: (next: ThemeValue) => setTheme(next) }
}

/**
 * Tek tema seçici. `text` (varsayılan): Ayarlar ve profil menüsü. `icon`:
 * footer şeridi; ad her segmentin aria-label'ında. Footer'da şerit yarı saydam
 * mürekkep, çünkü koyulaşan bandın üstünde düz `--muted` kayboluyordu.
 */
export function ThemeSwitcher({
  variant = "text",
  className,
}: {
  variant?: "text" | "icon"
  className?: string
}) {
  const { current, setTheme } = useThemeChoice()
  const iconOnly = variant === "icon"

  return (
    <SegmentedControl
      aria-label="Tema seçimi"
      size={iconOnly ? "xs" : "sm"}
      value={current}
      onValueChange={setTheme}
      className={cn(iconOnly && "bg-foreground/6", className)}
    >
      {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
        <SegmentedControlItem
          key={value}
          value={value}
          aria-label={iconOnly ? label : undefined}
          className={iconOnly ? "aspect-square px-0" : undefined}
        >
          {iconOnly ? <Icon /> : label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}

export function ThemeMenuItems() {
  return (
    <>
      <DropdownMenuLabel>Tema</DropdownMenuLabel>
      {/* `pb` yok: alttaki ayırıcının `my-1`i boşluğu zaten veriyor. */}
      <div className="px-1">
        <ThemeSwitcher className="w-full" />
      </div>
    </>
  )
}
