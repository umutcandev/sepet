"use client"

import * as React from "react"

import { useCurrentUser } from "@/components/providers/session-provider"
import { loginDialog } from "@/lib/stores/login-dialog"

export function useRequireAuth() {
  const { isAuthenticated } = useCurrentUser()
  return React.useCallback(
    <A extends unknown[], R>(handler: (...args: A) => R) => {
      return (...args: A): R | undefined => {
        if (!isAuthenticated) {
          const first = args[0] as { preventDefault?: () => void } | undefined
          first?.preventDefault?.()
          loginDialog.open()
          return undefined
        }
        return handler(...args)
      }
    },
    [isAuthenticated],
  )
}
