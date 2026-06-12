"use client"

import * as React from "react"

import { useUserLocation } from "@/lib/stores/location"
import { locationDialog } from "@/lib/stores/location-dialog"

/**
 * `useRequireAuth` ile aynı kalıp: bir handler'ı sarar; kullanıcının konumu
 * yoksa konum modalını açar ve handler'ı bekleyen aksiyon olarak saklar
 * (kaydedince kaldığı yerden devam eder), aksi halde handler'ı doğrudan çağırır.
 *
 * Kullanım (önce login, sonra konum): requireAuth(requireLocation(handler)).
 */
export function useRequireLocation() {
  const { hasLocation } = useUserLocation()
  return React.useCallback(
    <A extends unknown[], R>(handler: (...args: A) => R) => {
      return (...args: A): R | undefined => {
        if (!hasLocation) {
          const first = args[0] as { preventDefault?: () => void } | undefined
          first?.preventDefault?.()
          locationDialog.open(() => handler(...args))
          return undefined
        }
        return handler(...args)
      }
    },
    [hasLocation],
  )
}
