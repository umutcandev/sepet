"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Kapalı ray shadcn'de `bg-input` gelir; burada `--muted-foreground` alfası
 * kullanılıyor. Sebep: `--input` projede kasıtlı olarak `--border` kadar
 * yumuşak (bkz. globals.css) ve anahtarın rayı bir kenarlık değil, kontrolün
 * KENDİSİ — başparmakla birlikte anahtarı görünür kılan tek yüzey. Yumuşak
 * değerle kapalı anahtar zeminde kayboluyordu: açık temada 1.27:1, koyuda
 * 1.14:1. Alfalar iki temada ayrı ayrı ölçüldü, ikisi de sayfaya karşı 3:1
 * üstünde: açık /65 → 3.26, koyu /45 → 3.34.
 */
function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-[1.15rem] data-[size=default]:w-[32px] data-[size=sm]:h-3.5 data-[size=sm]:w-[24px] dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:bg-primary data-unchecked:bg-muted-foreground/65 dark:data-unchecked:bg-muted-foreground/45 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] dark:data-checked:bg-primary-foreground group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 dark:data-unchecked:bg-foreground"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
