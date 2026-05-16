"use client"

import * as React from "react"

type State = { title: string | null; loading: boolean }
type Listener = (state: State) => void

let state: State = { title: null, loading: false }
const listeners = new Set<Listener>()

function notify() {
  for (const l of listeners) l(state)
}

export const assistantTitle = {
  setLoading(loading: boolean) {
    if (state.loading === loading) return
    state = { ...state, loading }
    notify()
  },
  setTitle(title: string | null) {
    if (state.title === title && state.loading === false) return
    state = { title, loading: false }
    notify()
  },
  reset() {
    if (state.title === null && state.loading === false) return
    state = { title: null, loading: false }
    notify()
  },
  subscribe(l: Listener) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  get current() {
    return state
  },
}

export function useAssistantTitle(): State {
  const [s, set] = React.useState<State>(() => assistantTitle.current)
  React.useEffect(() => assistantTitle.subscribe(set), [])
  return s
}
