"use client"

import * as React from "react"

import { useCurrentUser } from "@/components/providers/session-provider"
import { loginDialog } from "@/lib/stores/login-dialog"

export function useRequireAuth() {
  const { isAuthenticated } = useCurrentUser()
  return React.useCallback(
    <A extends unknown[]>(handler: (...args: A) => void) => {
      return (...args: A) => {
        if (!isAuthenticated) {
          const first = args[0] as { preventDefault?: () => void } | undefined
          first?.preventDefault?.()
          loginDialog.open()
          return
        }
        handler(...args)
      }
    },
    [isAuthenticated],
  )
}
