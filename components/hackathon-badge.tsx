"use client"

import { RiArrowRightUpLine } from "@remixicon/react"

import {
  TipPopover,
  TipPopoverContent,
  TipPopoverTrigger,
} from "@/components/ui/tip-popover"

const POST_URL = "https://www.instagram.com/p/DXGqDRkjXV4/"
// SVG maske olarak kullanılır; renk `currentColor` ile temadan gelir.
const MASK = "url(/badges/hackathon26-v3.svg) center / contain no-repeat"

export function HackathonBadge() {
  return (
    <TipPopover>
      <TipPopoverTrigger
        aria-label="Hackathon 2026"
        className="relative cursor-pointer rounded-sm text-muted-foreground transition-colors outline-none after:absolute after:-inset-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=open]:text-foreground"
      >
        <span
          aria-hidden
          className="block h-6 w-[113px] bg-current"
          style={{ mask: MASK, WebkitMask: MASK }}
        />
      </TipPopoverTrigger>
      <TipPopoverContent>
        <a
          href={POST_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
        >
          Instagram&apos;da gör
          <RiArrowRightUpLine className="size-3.5" />
        </a>
      </TipPopoverContent>
    </TipPopover>
  )
}
