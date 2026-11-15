"use client"

import { RiErrorWarningLine } from "@remixicon/react"

import { Badge } from "@/components/ui/badge"
import { useCurrentUser } from "@/components/providers/session-provider"
import { useUserLocation } from "@/lib/stores/location"
import { locationDialog } from "@/lib/stores/location-dialog"
import { cn } from "@/lib/utils"

/** Oturumlu ama konumu olmayan kullanıcıya uyarı; tıklayınca konum modalı açılır. */
export function LocationMissingBadge({ className }: { className?: string }) {
  const { isAuthenticated, loading } = useCurrentUser()
  const { hasLocation } = useUserLocation()
  if (!isAuthenticated || loading || hasLocation) return null

  return (
    <Badge variant="warning" asChild className={cn("h-6 cursor-pointer", className)}>
      <button type="button" onClick={() => locationDialog.open()}>
        <RiErrorWarningLine data-icon="inline-start" aria-hidden />
        Konum ayarlanmadı
      </button>
    </Badge>
  )
}
