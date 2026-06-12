"use client"

import * as React from "react"

type Listener = (open: boolean) => void

let openState = false
// Konum kaydedildikten sonra çalıştırılacak bekleyen aksiyon (tembel kapı:
// kullanıcı arama/gönderme yapmaya çalıştı, konumu yoktu → modal açıldı; kaydedince
// orijinal aksiyon kaldığı yerden devam eder).
let pending: (() => void) | null = null
const listeners = new Set<Listener>()

function notify() {
  for (const l of listeners) l(openState)
}

export const locationDialog = {
  /** Modalı aç. onResolved verilirse kaydetme başarılı olunca çağrılır. */
  open(onResolved?: () => void) {
    pending = onResolved ?? null
    openState = true
    notify()
  },
  /** Vazgeç — bekleyen aksiyon ÇALIŞTIRILMAZ. */
  close() {
    if (!openState) return
    openState = false
    pending = null
    notify()
  },
  /** Kaydetme başarılı — modalı kapat ve bekleyen aksiyonu çalıştır. */
  resolve() {
    const cb = pending
    pending = null
    openState = false
    notify()
    cb?.()
  },
  set(open: boolean) {
    if (open) {
      if (openState) return
      openState = true
    } else {
      if (!openState) return
      openState = false
      pending = null
    }
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

export function useLocationDialog() {
  const [open, setOpen] = React.useState<boolean>(() => locationDialog.isOpen)
  React.useEffect(() => locationDialog.subscribe(setOpen), [])
  return {
    open,
    openDialog: locationDialog.open,
    closeDialog: locationDialog.close,
    resolveDialog: locationDialog.resolve,
    setOpen: locationDialog.set,
  }
}
