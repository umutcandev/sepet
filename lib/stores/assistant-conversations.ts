"use client"

import * as React from "react"

import type { ConversationListItem } from "@/components/assistant/assistant-conversations-group"

type Listener = () => void

let state: ConversationListItem[] = []
let hydrated = false
const listeners = new Set<Listener>()

function setState(next: ConversationListItem[]) {
  if (next === state) return
  state = next
  for (const l of listeners) l()
}

export const assistantConversations = {
  getSnapshot(): ConversationListItem[] {
    return state
  },
  isHydrated(): boolean {
    return hydrated
  },
  // Server'dan gelen listeyle store'u senkronize et. Mobilde sidebar
  // kapalıyken AppShell hâlâ mount olduğundan stream sırasında gelen
  // mutasyonlar (upsert / setTitle) bu store içinde tutulur ve sidebar
  // açıldığında olduğu gibi okunur. Hidrasyondan sonra prop referansı
  // değişse de (parent re-render) state'i ezmiyoruz — server zaten son
  // navigasyondaki snapshot'ı yansıtıyor, stream'le eklenen yeni sohbetleri
  // içermez; ezmek o sohbetleri kaybettirir.
  hydrate(items: ConversationListItem[]) {
    if (hydrated) return
    hydrated = true
    setState(items)
  },
  upsert(item: ConversationListItem) {
    const existing = state.find((c) => c.id === item.id)
    const rest = state.filter((c) => c.id !== item.id)
    // Var olan kaydın pending durumunu koru: yeni stream başında upsert
    // pending=true ile çağrılır; AI title sonradan setTitle ile gelir ve
    // pending'i kapatır. Var olan title'ı placeholder ile ezmiyoruz.
    const merged: ConversationListItem = existing
      ? { ...existing, ...item, pending: item.pending ?? existing.pending }
      : item
    setState([merged, ...rest])
  },
  setTitle(id: string, title: string) {
    const next = state.map((c) => {
      if (c.id !== id) return c
      if (c.title === title && !c.pending) return c
      return { ...c, title, pending: false }
    })
    setState(next)
  },
  clearPending(id: string) {
    const next = state.map((c) =>
      c.id === id && c.pending ? { ...c, pending: false } : c,
    )
    setState(next)
  },
  touch(id: string) {
    const found = state.find((c) => c.id === id)
    if (!found) return
    const rest = state.filter((c) => c.id !== id)
    setState([{ ...found, updatedAt: new Date() }, ...rest])
  },
  remove(id: string) {
    setState(state.filter((c) => c.id !== id))
  },
  subscribe(l: Listener) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}

export function useAssistantConversations(
  fallback: ConversationListItem[],
): ConversationListItem[] {
  // Store hidrasyondan önce server-rendered fallback'i göster — ilk render'da
  // boş liste yanıp sönmesin. Hidrasyondan sonra (AppShell useEffect'i bir kez
  // çalıştırınca) store snapshot'ı authoritative olur; kullanıcı tüm sohbetleri
  // silse bile fallback geri gelmez.
  const subscribe = React.useCallback(
    (l: () => void) => assistantConversations.subscribe(l),
    [],
  )
  const getSnapshot = React.useCallback(() => {
    return assistantConversations.isHydrated()
      ? assistantConversations.getSnapshot()
      : fallback
  }, [fallback])
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
