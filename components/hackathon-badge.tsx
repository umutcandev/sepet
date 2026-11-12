"use client"

import { Popover as PopoverPrimitive } from "radix-ui"
import { RiArrowRightUpLine } from "@remixicon/react"

const POST_URL = "https://www.instagram.com/p/DXGqDRkjXV4/"
// SVG maske olarak kullanılır; renk `currentColor` ile temadan gelir.
const MASK = "url(/badges/hackathon26-v3.svg) center / contain no-repeat"

export function HackathonBadge() {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger
        aria-label="Hackathon 2026"
        className="relative cursor-pointer rounded-sm text-muted-foreground transition-colors outline-none after:absolute after:-inset-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=open]:text-foreground"
      >
        <span
          aria-hidden
          className="block h-6 w-[113px] bg-current"
          style={{ mask: MASK, WebkitMask: MASK }}
        />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="top"
          sideOffset={6}
          className="z-50 origin-(--radix-popover-content-transform-origin) rounded-md bg-foreground px-3 py-1.5 text-xs text-background smooth-shadow-sm outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fill-mode-forwards data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <a
            href={POST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
          >
            Instagram&apos;da gör
            <RiArrowRightUpLine className="size-3.5" />
          </a>
          <PopoverPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
