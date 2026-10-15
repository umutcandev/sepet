"use client"

import { RiComputerLine, RiMoonLine, RiSunLine } from "@remixicon/react"
import { useTheme } from "next-themes"

import { DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control"
import { useMounted } from "@/hooks/use-mounted"

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

export function ThemeMenuItems() {
  const { current, setTheme } = useThemeChoice()

  return (
    <>
      <DropdownMenuLabel>Tema</DropdownMenuLabel>
      {/* `pb` YOK: altındaki ayırıcı `my-1` ile zaten 4px taşıyor, dolgu
          eklenince o bant üstteki ayırıcının iki katı kalınlıkta okunuyordu. */}
      <div className="px-1">
        <SegmentedControl
          aria-label="Tema seçimi"
          size="sm"
          value={current}
          onValueChange={setTheme}
          className="w-full"
        >
          {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
            <SegmentedControlItem key={value} value={value}>
              <Icon />
              {label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>
    </>
  )
}

// Footer alt şeridi için yatay, yalnızca simgeli tema anahtarı. Menü içindeki
// hâlin aynısı, sadece etiketsiz; adı her segmentin aria-label'ı söyler.
export function ThemeToggleInline({ className }: { className?: string }) {
  const { current, setTheme } = useThemeChoice()

  return (
    <SegmentedControl
      aria-label="Tema seçimi"
      size="xs"
      value={current}
      onValueChange={setTheme}
      className={className}
    >
      {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
        <SegmentedControlItem
          key={value}
          value={value}
          aria-label={label}
          className="aspect-square px-0"
        >
          <Icon />
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}
