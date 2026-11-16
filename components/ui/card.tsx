import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Tepsi: başlık ve alt şerit bunun zemininde, içerik 4px içeride CardContent'te.
 * `border` verme, kenar `smooth-shadow-ring-sm` halkasında. Köşeler eş merkezli:
 * 10px = iç 6px + 4px. Her katman kendi kenarından ~16px: başlık kart
 * kenarından (4 + 12), satırlar iç yüzeyin kenarından (1 + 16).
 */
function Card({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="card"
      className={cn(
        "flex flex-col overflow-hidden rounded-lg bg-card-tray p-1 text-card-foreground smooth-shadow-ring-sm smooth-ring-card-edge",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="card-header"
      className={cn(
        // Üst: 4px tepsi + pt 6px = alt: pb 11px − iç yüzey halkasının 1px'i.
        "flex min-h-9.25 flex-wrap items-center gap-x-2 gap-y-1 px-3 pt-1.5 pb-2.75",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-[0.8125rem] leading-5 font-semibold", className)}
      {...props}
    />
  )
}

/**
 * İç yüzey. Kenarı dış kartla aynı teknik (halka, -xs) ve içindeki ayraçlarla
 * aynı renk: ayraçlar kenara bağlanır. Halka yer tutmaz, hizayı kaydırmaz.
 */
function CardContent({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="card-content"
      className={cn(
        "min-w-0 overflow-hidden rounded-sm bg-card smooth-shadow-ring-xs smooth-ring-card-divider [--border:var(--card-divider)]",
        className
      )}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        // Üst: pt 7px − iç yüzey halkasının 1px'i = alt: pb 2px + 4px tepsi.
        "flex flex-wrap items-center gap-2 px-3 pt-1.75 pb-0.5",
        className
      )}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardContent, CardFooter }
