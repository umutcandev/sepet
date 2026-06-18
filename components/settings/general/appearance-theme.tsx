"use client"

import { useTheme } from "next-themes"

import { useMounted } from "@/hooks/use-mounted"
import { cn } from "@/lib/utils"

// İkonsuz segmentli tema seçici (Ayarlar no-icon kuralı). theme-toggle.tsx'teki
// radiogroup düzenini kullanır ama yalnızca metin gösterir.
const OPTIONS = [
  { value: "light", label: "Açık" },
  { value: "dark", label: "Koyu" },
  { value: "system", label: "Sistem" },
] as const

export function AppearanceTheme() {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()
  const current = mounted ? (theme ?? "system") : "light"

  return (
    <div
      role="radiogroup"
      aria-label="Tema seçimi"
      className="flex items-center gap-0.5 rounded-md bg-muted p-0.5"
    >
      {OPTIONS.map(({ value, label }) => {
        const selected = current === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(value)}
            className={cn(
              "rounded-sm px-2.5 py-1 text-xs transition-colors",
              selected
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
