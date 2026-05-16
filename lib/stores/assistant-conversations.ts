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
      const rest = current.filter((c) => c.id !== item.id)
      return [item, ...rest]
    })
  },
  setTitle(id: string, title: string) {
    emit((current) =>
      current.map((c) =>
        c.id === id && c.title !== title ? { ...c, title } : c,
      ),
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
