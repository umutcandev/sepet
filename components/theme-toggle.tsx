"use client"

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { useMounted } from "@/hooks/use-mounted"
import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "light", icon: SunIcon, label: "Açık" },
  { value: "dark", icon: MoonIcon, label: "Koyu" },
  { value: "system", icon: MonitorIcon, label: "Sistem" },
] as const

const NEXT_THEME: Record<string, string> = {
  light: "dark",
  dark: "system",
  system: "light",
}

export function ThemeMenuItems() {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()

  const current = mounted ? (theme ?? "system") : "light"

  return (
    <>
      <span className="px-1.5 py-1 text-xs font-normal text-muted-foreground">
        Tema
      </span>
      <div className="px-1 pb-1">
        <div
          role="radiogroup"
          aria-label="Tema seçimi"
          className="flex w-full items-center gap-0.5 rounded-md bg-muted p-0.5"
        >
          {OPTIONS.map(({ value, icon: Icon, label }) => {
            const selected = current === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded-sm px-1.5 py-1 text-xs transition-colors",
                  selected
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

export function ThemeToggleButton({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()

  const current = mounted ? (theme ?? "system") : "light"
  const meta =
    current === "dark"
      ? { Icon: MoonIcon, label: "Koyu tema" }
      : current === "system"
        ? { Icon: MonitorIcon, label: "Sistem teması" }
        : { Icon: SunIcon, label: "Açık tema" }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={() => setTheme(NEXT_THEME[current])}
      aria-label={`${meta.label}. Temayı değiştir.`}
      title={meta.label}
      className={className}
    >
      <meta.Icon className="size-4" />
    </Button>
  )
}
