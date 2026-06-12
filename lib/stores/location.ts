"use client"

import * as React from "react"

import { useCurrentUser } from "@/components/providers/session-provider"
import type { UserLocation } from "@/lib/auth/session"

// Sunucudan gelen session değeri başlangıç doğrusudur. Kaydetme sonrası RSC
// refresh beklemeden anlık güncellemek için bu overlay store'u tutarız: bir kez
// `set()` çağrılınca (kaydetme) store yetkili kaynak olur; o ana kadar
// `useUserLocation` session değerine düşer.
type State = { location: UserLocation | null; hydrated: boolean }

let state: State = { location: null, hydrated: false }
const SERVER_STATE: State = { location: null, hydrated: false }
const listeners = new Set<() => void>()

function notify() {
  for (const l of listeners) l()
}

export const locationStore = {
  set(location: UserLocation | null) {
    state = { location, hydrated: true }
    notify()
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  getSnapshot() {
    return state
  },
}

/**
 * Geçerli konum + `hasLocation`. Overlay store hydrate edildiyse (kaydetme
 * sonrası) onu, edilmediyse sunucu session değerini kullanır.
 */
export function useUserLocation(): {
  location: UserLocation | null
  hasLocation: boolean
} {
  const { user } = useCurrentUser()
  const snap = React.useSyncExternalStore(
    locationStore.subscribe,
    locationStore.getSnapshot,
    () => SERVER_STATE,
  )
  const location = snap.hydrated ? snap.location : (user?.location ?? null)
  return { location, hasLocation: location != null }
}
