"use client"

import * as React from "react"

type State = {
  title: string | null
  loading: boolean
  conversationId: string | null
}
type Listener = (state: State) => void

let state: State = { title: null, loading: false, conversationId: null }
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
    state = { ...state, title, loading: false }
    notify()
  },
  setConversationId(conversationId: string | null) {
    if (state.conversationId === conversationId) return
    state = { ...state, conversationId }
    notify()
  },
  reset() {
    if (
      state.title === null &&
      state.loading === false &&
      state.conversationId === null
    ) {
      return
    }
    state = { title: null, loading: false, conversationId: null }
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

const SERVER_STATE: State = { title: null, loading: false, conversationId: null }

export function useAssistantTitle(): State {
  return React.useSyncExternalStore(
    assistantTitle.subscribe,
    () => assistantTitle.current,
    () => SERVER_STATE,
  )
}
