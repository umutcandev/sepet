"use client"

import * as React from "react"

/* Tema <html>.dark sınıfından okunuyor, next-themes'in `resolvedTheme`inden
   değil: bloke edici script sınıfı ilk boyamadan önce yazıyor, resolvedTheme ise
   "Sistem"de bir effect turu geç kalıyor. SSR'da null.

   Tek MutationObserver bütün aboneleri besliyor — hook düzine bileşende
   çağrılıyor, her biri kendi observer'ını açmasın. */

export type DocumentTheme = "dark" | "light"

const listeners = new Set<() => void>()
let observer: MutationObserver | null = null

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange)
  if (!observer) {
    observer = new MutationObserver(() => {
      for (const listener of listeners) listener()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
  }
  return () => {
    listeners.delete(onStoreChange)
    if (listeners.size === 0) {
      observer?.disconnect()
      observer = null
    }
  }
}

const getSnapshot = (): DocumentTheme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light"

export function useDocumentTheme(): DocumentTheme | null {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => null)
}
