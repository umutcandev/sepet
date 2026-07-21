"use client"

import * as React from "react"

import { useCurrentUser } from "@/components/providers/session-provider"
import { loginDialog } from "@/lib/stores/login-dialog"

export function useRequireAuth() {
  const { isAuthenticated, loading, displayUser } = useCurrentUser()
  // /api/me henüz çözülmediyse snapshot'taki son bilinen duruma güven:
  // oturumlu kullanıcı sayfa açılır açılmaz tıkladığında login modalıyla
  // karşılaşmasın. Snapshot yanılıyorsa (oturum bu arada düşmüş) sunucu
  // action'ları zaten kendi auth kontrolünü yapar.
  const effectivelyAuthed = isAuthenticated || (loading && displayUser !== null)
  return React.useCallback(
    <A extends unknown[], R>(handler: (...args: A) => R) => {
      return (...args: A): R | undefined => {
        if (!effectivelyAuthed) {
          const first = args[0] as { preventDefault?: () => void } | undefined
          first?.preventDefault?.()
          loginDialog.open()
          return undefined
        }
        return handler(...args)
      }
    },
    [effectivelyAuthed],
  )
}
