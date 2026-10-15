"use client"

import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control"
import { THEME_OPTIONS, useThemeChoice } from "@/components/theme-toggle"

// İkonsuz segmentli tema seçici (Ayarlar no-icon kuralı). Menüdeki ve
// footer'daki anahtarlarla aynı kontrol, yalnız metin gösterir.
export function AppearanceTheme() {
  const { current, setTheme } = useThemeChoice()

  return (
    <SegmentedControl
      aria-label="Tema seçimi"
      size="sm"
      value={current}
      onValueChange={setTheme}
    >
      {THEME_OPTIONS.map(({ value, label }) => (
        <SegmentedControlItem key={value} value={value}>
          {label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}
