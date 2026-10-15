"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, useReducedMotion } from "motion/react"

import { SPRING_PILL } from "@/lib/motion"
import { cn } from "@/lib/utils"

// Tek seçimli segment kontrolü (tema, faturalandırma aralığı). Görünüş
// `TabsList`in oyuk şeridi + kabarık aktif segmentiyle aynı; anlamı ise sekme
// değil SEÇİM, o yüzden APG radiogroup: Tab gruba bir kez uğrar (roving
// tabindex), ok tuşları ve Home/End odakla birlikte seçimi de taşır.
//
// Bu bileşen gelmeden önce aynı kontrol dört yerde elle yazılmıştı (menü ve
// footer tema anahtarları, ayarlardaki tema seçimi, faturalandırma aralığı);
// her birinin yüksekliği, aktif rengi ve klavye davranışı farklıydı.

const segmentedControlVariants = cva(
  "inline-flex w-fit items-stretch rounded-lg bg-muted surface-inset",
  {
    variants: {
      size: {
        default: "h-8 gap-0.5 p-[3px] text-sm",
        sm: "h-7 gap-0.5 p-0.5 text-xs",
        xs: "h-6 gap-px p-0.5 text-[0.6875rem]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

type SegmentedControlContextValue = {
  value: string
  select: (value: string) => void
  size: NonNullable<VariantProps<typeof segmentedControlVariants>["size"]>
  pillId: string
}

const SegmentedControlContext =
  React.createContext<SegmentedControlContextValue | null>(null)

function SegmentedControl<T extends string>({
  value,
  onValueChange,
  size = "default",
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> &
  VariantProps<typeof segmentedControlVariants> & {
    value: T
    onValueChange: (value: T) => void
    "aria-label": string
  }) {
  const groupRef = React.useRef<HTMLDivElement>(null)
  // Aktif zemin segmentler arasında `layoutId` ile kayar. layoutId global bir
  // isim uzayı: aynı sayfadaki iki kontrolün zeminleri birbirine uçmasın diye
  // her kopya kendi kimliğini alır.
  const pillId = React.useId()

  const select = React.useCallback(
    (next: string) => onValueChange(next as T),
    [onValueChange]
  )

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      groupRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="radio"]:not(:disabled)'
      ) ?? []
    )
    const index = items.findIndex((item) => item.dataset.value === value)
    if (index < 0) return

    let next = index
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (index + 1) % items.length
        break
      case "ArrowLeft":
      case "ArrowUp":
        next = (index - 1 + items.length) % items.length
        break
      case "Home":
        next = 0
        break
      case "End":
        next = items.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    // Radix menüsü içindeyken ok tuşları menü öğeleri arasında da gezinir;
    // grup kendi navigasyonunu üstlendiği için olayı yukarı bırakmıyoruz.
    event.stopPropagation()
    const target = items[next]
    if (target?.dataset.value) select(target.dataset.value)
    target?.focus()
  }

  return (
    <SegmentedControlContext.Provider
      value={{ value, select, size: size ?? "default", pillId }}
    >
      <div
        ref={groupRef}
        role="radiogroup"
        data-slot="segmented-control"
        data-size={size}
        onKeyDown={onKeyDown}
        className={cn(segmentedControlVariants({ size }), className)}
        {...props}
      >
        {children}
      </div>
    </SegmentedControlContext.Provider>
  )
}

function SegmentedControlItem({
  value,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "value"> & { value: string }) {
  const ctx = React.useContext(SegmentedControlContext)
  if (!ctx) {
    throw new Error("SegmentedControlItem, SegmentedControl içinde olmalı")
  }
  const reduceMotion = useReducedMotion()
  const selected = ctx.value === value

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      data-slot="segmented-control-item"
      data-value={value}
      onClick={() => ctx.select(value)}
      className={cn(
        "group/segment relative flex flex-1 items-center justify-center rounded-md font-medium whitespace-nowrap text-muted-foreground transition-colors duration-150 ease-out-soft outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-checked:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
        ctx.size === "default"
          ? "gap-1 px-2.5 [&_svg:not([class*='size-'])]:size-4"
          : "gap-1 px-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      {...props}
    >
      {selected && (
        <motion.span
          layoutId={ctx.pillId}
          aria-hidden
          className="absolute inset-0 rounded-md bg-background surface-raised-tight"
          transition={reduceMotion ? { duration: 0 } : SPRING_PILL}
        />
      )}
      <span className="relative inline-flex items-center gap-[inherit]">
        {children}
      </span>
    </button>
  )
}

export { SegmentedControl, SegmentedControlItem, segmentedControlVariants }
