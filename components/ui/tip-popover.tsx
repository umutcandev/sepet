"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

// Tıklayınca açılan koyu ipucu balonu (hackathon rozeti, kapalı Pro düğmeleri).
const TipPopover = PopoverPrimitive.Root
const TipPopoverTrigger = PopoverPrimitive.Trigger

function TipPopoverContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        side="top"
        sideOffset={6}
        className={cn(
          "z-50 origin-(--radix-popover-content-transform-origin) rounded-md bg-foreground px-3 py-1.5 text-xs text-background smooth-shadow-sm outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fill-mode-forwards data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        <PopoverPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground" />
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

export { TipPopover, TipPopoverTrigger, TipPopoverContent }
