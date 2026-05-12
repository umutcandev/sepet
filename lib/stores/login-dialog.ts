"use client"

import * as React from "react"

type Listener = (open: boolean) => void

let openState = false
const listeners = new Set<Listener>()

function notify() {
  for (const l of listeners) l(openState)
}

export const loginDialog = {
  open() {
    if (openState) return
    openState = true
    notify()
  },
  close() {
    if (!openState) return
    openState = false
    notify()
  },
  set(open: boolean) {
    if (openState === open) return
    openState = open
    notify()
  },
  subscribe(l: Listener) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  get isOpen() {
    return openState
  },
}

export function useLoginDialog() {
  const [open, setOpen] = React.useState<boolean>(() => loginDialog.isOpen)
  React.useEffect(() => loginDialog.subscribe(setOpen), [])
  return {
    open,
    openDialog: loginDialog.open,
    closeDialog: loginDialog.close,
    setOpen: loginDialog.set,
  }
}
