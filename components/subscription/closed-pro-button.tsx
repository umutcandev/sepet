"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  TipPopover,
  TipPopoverContent,
  TipPopoverTrigger,
} from "@/components/ui/tip-popover"
import { SUBSCRIPTIONS_CLOSED_MESSAGE } from "@/lib/billing"
import { cn } from "@/lib/utils"

// Abonelikler kapalıyken Pro düğmesi: pasif görünür, tıklanınca nedenini söyler.
// `disabled` yerine aria-disabled, yoksa tıklama balonu açamazdı.
export function ClosedProButton({
  size,
  className,
  children,
}: {
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
  children: React.ReactNode
}) {
  return (
    <TipPopover>
      <TipPopoverTrigger asChild>
        <Button
          variant="default"
          size={size}
          aria-disabled="true"
          className={cn(
            "cursor-not-allowed opacity-50 hover:[--surface-base:var(--primary)]",
            className
          )}
        >
          {children}
        </Button>
      </TipPopoverTrigger>
      <TipPopoverContent>{SUBSCRIPTIONS_CLOSED_MESSAGE}</TipPopoverContent>
    </TipPopover>
  )
}
