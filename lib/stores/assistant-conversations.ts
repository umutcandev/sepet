"use client"

import type { ConversationListItem } from "@/components/assistant/assistant-conversations-group"

type Mutator = (current: ConversationListItem[]) => ConversationListItem[]
type Listener = (mutator: Mutator) => void

const listeners = new Set<Listener>()

function emit(mutator: Mutator) {
  for (const l of listeners) l(mutator)
}

export const assistantConversations = {
  upsert(item: ConversationListItem) {
    emit((current) => {
      const existing = current.find((c) => c.id === item.id)
      const rest = current.filter((c) => c.id !== item.id)
      // Var olan kaydın pending durumunu koru: yeni stream başında upsert
      // pending=true ile çağrılır; AI title sonradan setTitle ile gelir ve
      // pending'i kapatır. Var olan title'ı placeholder ile ezmiyoruz.
      const merged: ConversationListItem = existing
        ? { ...existing, ...item, pending: item.pending ?? existing.pending }
        : item
      return [merged, ...rest]
    })
  },
  setTitle(id: string, title: string) {
    emit((current) =>
      current.map((c) => {
        if (c.id !== id) return c
        if (c.title === title && !c.pending) return c
        return { ...c, title, pending: false }
      }),
    )
  },
  clearPending(id: string) {
    emit((current) =>
      current.map((c) => (c.id === id && c.pending ? { ...c, pending: false } : c)),
    )
  },
  touch(id: string) {
    const now = new Date()
    emit((current) => {
      const found = current.find((c) => c.id === id)
      if (!found) return current
      const rest = current.filter((c) => c.id !== id)
      return [{ ...found, updatedAt: now }, ...rest]
    })
  },
  remove(id: string) {
    emit((current) => current.filter((c) => c.id !== id))
  },
  subscribe(l: Listener) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}
