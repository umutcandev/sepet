"use client"

import * as React from "react"
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
  const groupRef = React.useRef<HTMLDivElement>(null)

  const current = mounted ? (theme ?? "system") : "light"

  // APG radiogroup: Tab grubun tamamına bir kez uğrar (yalnızca seçili radio
  // tab sırasında, roving tabindex), grup içinde ok tuşlarıyla gezinilir ve
  // odaklanan seçenek aynı anda seçilir. Home/End uçlara gider.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = OPTIONS.findIndex((option) => option.value === current)
    if (index < 0) return

    let next = index
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (index + 1) % OPTIONS.length
        break
      case "ArrowLeft":
      case "ArrowUp":
        next = (index - 1 + OPTIONS.length) % OPTIONS.length
        break
      case "Home":
        next = 0
        break
      case "End":
        next = OPTIONS.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    // Radix menüsü içindeyken ok tuşları menü öğeleri arasında da gezinir;
    // grup kendi navigasyonunu üstlendiği için olayı yukarı bırakmıyoruz.
    event.stopPropagation()
    setTheme(OPTIONS[next].value)
    groupRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [next]?.focus()
  }

  return (
    <>
      <span className="px-1.5 py-1 text-xs font-normal text-muted-foreground">
        Tema
      </span>
      <div className="px-1 pb-1">
        <div
          ref={groupRef}
          role="radiogroup"
          aria-label="Tema seçimi"
          onKeyDown={handleKeyDown}
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
                tabIndex={selected ? 0 : -1}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded-sm px-1.5 py-1 text-xs transition-colors",
                  selected
                    ? "bg-background text-foreground smooth-shadow-xs"
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
