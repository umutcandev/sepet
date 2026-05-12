"use client"

import * as React from "react"

import type { CurrentUser } from "@/lib/auth/session"

type SessionContextValue = {
  user: CurrentUser | null
  isAuthenticated: boolean
}

const SessionContext = React.createContext<SessionContextValue | null>(null)

export function SessionProvider({
  user,
  children,
}: {
  user: CurrentUser | null
  children: React.ReactNode
}) {
  const value = React.useMemo<SessionContextValue>(
    () => ({ user, isAuthenticated: user !== null }),
    [user],
  )
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useCurrentUser(): SessionContextValue {
  const ctx = React.useContext(SessionContext)
  if (!ctx) {
    throw new Error("useCurrentUser must be used within SessionProvider")
  }
  return ctx
}
