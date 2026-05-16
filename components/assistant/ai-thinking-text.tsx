"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type ThinkingTextProps = {
  children: React.ReactNode
  className?: string
}

export function ThinkingText({ children, className }: ThinkingTextProps) {
  return (
    <span
      className={cn("ai-thinking-text text-sm font-medium", className)}
      aria-live="polite"
    >
      {children}
    </span>
  )
}
