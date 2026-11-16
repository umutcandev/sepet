import * as React from "react"

import { Badge } from "@/components/ui/badge"

// Yeni durum aynı kalıba eklenir (ör. rejected → variant "destructive").
const STATUS = {
  approved: { label: "Onaylandı", variant: "default" },
} as const

/** Kart başlığındaki durum: ikonsuz, yazılı rozet. */
export function StatusChip({
  status,
  className,
}: {
  status: keyof typeof STATUS
  className?: string
}) {
  const { label, variant } = STATUS[status]
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}
