"use client"

import * as React from "react"
import { createPortal } from "react-dom"

const HeaderSlotContext = React.createContext<HTMLElement | null>(null)

export const HeaderSlotProvider = HeaderSlotContext.Provider

// Sayfanın kendi içeriğini AppShell header'ının üstüne yerleştirir.
export function HeaderSlot({ children }: { children: React.ReactNode }) {
  const slot = React.useContext(HeaderSlotContext)
  return slot ? createPortal(children, slot) : null
}
