"use client"

import * as React from "react"
import { RiComputerLine, RiMoonLine, RiSunLine } from "@remixicon/react"
import { useTheme } from "next-themes"

import { useMounted } from "@/hooks/use-mounted"
import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "light", icon: RiSunLine, label: "Açık" },
  { value: "dark", icon: RiMoonLine, label: "Koyu" },
  { value: "system", icon: RiComputerLine, label: "Sistem" },
] as const

// Radyo grubunun paylaşılan davranışı: menü içindeki etiketli hâli de,
// footer'daki yalnızca simgeli hâli de aynı seçim ve klavye kurallarını izler.
function useThemeRadioGroup() {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()
  const groupRef = React.useRef<HTMLDivElement>(null)

  const current = mounted ? (theme ?? "system") : "light"

  // APG radiogroup: Tab grubun tamamına bir kez uğrar (yalnızca seçili radio
  // tab sırasında, roving tabindex), grup içinde ok tuşlarıyla gezinilir ve
  // odaklanan seçenek aynı anda seçilir. Home/End uçlara gider.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
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

  return { current, setTheme, groupRef, onKeyDown }
}

export function ThemeMenuItems() {
  const { current, setTheme, groupRef, onKeyDown } = useThemeRadioGroup()

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
          onKeyDown={onKeyDown}
          className="surface-inset flex w-full items-center gap-0.5 rounded-md bg-muted p-0.5"
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
                    ? "surface-raised-tight bg-background text-foreground"
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

// Footer alt şeridi için yatay, yalnızca simgeli tema anahtarı. Ölçü ve çerçeve
// yanındaki durum rozetiyle aynı (h-6, rounded-md, border-border) ki ikisi tek
// bir kontrol kümesi gibi okunsun; renk ise nötr kalıyor, canlı sinyali taşıyan
// primary tonu yalnız rozette dursun.
export function ThemeToggleInline({ className }: { className?: string }) {
  const { current, setTheme, groupRef, onKeyDown } = useThemeRadioGroup()

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Tema seçimi"
      onKeyDown={onKeyDown}
      className={cn(
        "surface-inset flex h-6 w-fit shrink-0 items-center gap-0.5 rounded-md border border-border p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const selected = current === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            tabIndex={selected ? 0 : -1}
            onClick={() => setTheme(value)}
            className={cn(
              // size-5 (20px) kabın içine SIĞMIYORDU: h-6 border-box, kenarlık 1px →
            // içerik kutusu 22px; p-0.5 (4px) düşünce butona 18px kalıyor. 20px
            // buton dikeyde 1px taşıyıp boşluğu 3px yerine 2px gösteriyordu,
            // yatayda ise 3px kalıyordu — gözle fark edilen asimetri buydu.
            // 18px'te 1+2+18+2+1 = 24 tam oturur, dört kenar da 3px.
            "flex size-4.5 items-center justify-center rounded-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              selected
                ? "surface-raised-tight bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        )
      })}
    </div>
  )
}
