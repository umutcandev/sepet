"use client"

import * as React from "react"

// pendingToken: Google'ın TOTP'li hesaba ilk bağlanışında modal doğrudan 2FA
// aşamasında açılır (bkz. LoginDialogHost). Modal kapanınca temizlenir ki bir
// sonraki açılış normal giriş ekranıyla başlasın.
type Snapshot = { open: boolean; pendingToken: string | null }
type Listener = (snapshot: Snapshot) => void

let state: Snapshot = { open: false, pendingToken: null }
const listeners = new Set<Listener>()

function update(next: Snapshot) {
  if (next.open === state.open && next.pendingToken === state.pendingToken) {
    return
  }
  state = next
  for (const l of listeners) l(state)
}

export const loginDialog = {
  open() {
    update({ ...state, open: true })
  },
  close() {
    update({ open: false, pendingToken: null })
  },
  set(open: boolean) {
    update(open ? { ...state, open } : { open, pendingToken: null })
  },
  /** Modalı 2FA aşamasında, bu pending token'la aç. */
  openTwoFactor(pendingToken: string) {
    update({ open: true, pendingToken })
  },
  subscribe(l: Listener) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  get isOpen() {
    return state.open
  },
}

export function useLoginDialog() {
  const [snapshot, setSnapshot] = React.useState<Snapshot>(() => state)
  React.useEffect(() => loginDialog.subscribe(setSnapshot), [])
  return {
    open: snapshot.open,
    pendingToken: snapshot.pendingToken,
    openDialog: loginDialog.open,
    closeDialog: loginDialog.close,
    setOpen: loginDialog.set,
    openTwoFactor: loginDialog.openTwoFactor,
  }
}
