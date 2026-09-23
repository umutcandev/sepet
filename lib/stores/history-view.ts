"use client"

import * as React from "react"

import {
  DEFAULT_HISTORY_VIEW,
  parseHistoryView,
  type HistoryView,
} from "@/lib/assistant/history-view"

const KEY = "sepet:history-view"
const listeners = new Set<() => void>()
let cache: HistoryView | null = null

function read(): HistoryView {
  if (cache) return cache
  try {
    const raw = window.localStorage.getItem(KEY)
    cache = raw ? parseHistoryView(JSON.parse(raw)) : DEFAULT_HISTORY_VIEW
  } catch {
    cache = DEFAULT_HISTORY_VIEW
  }
  return cache
}

function write(next: HistoryView) {
  cache = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {}
  for (const l of listeners) l()
}

export const historyView = {
  set<K extends keyof HistoryView>(key: K, value: HistoryView[K]) {
    write({ ...read(), [key]: value })
  },
  reset() {
    write(DEFAULT_HISTORY_VIEW)
  },
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

// Server snapshot varsayılan: SSR ile ilk istemci render'ı aynı kalır.
export function useHistoryView(): HistoryView {
  return React.useSyncExternalStore(subscribe, read, () => DEFAULT_HISTORY_VIEW)
}
