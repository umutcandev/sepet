"use client"

import * as React from "react"

import type { CurrentUser } from "@/lib/auth/session"
import type { ConversationListItem } from "@/components/assistant/assistant-conversations-group"
import { assistantConversations } from "@/lib/stores/assistant-conversations"

type SessionContextValue = {
  user: CurrentUser | null
  isAuthenticated: boolean
  /** Sunucudan gelen başlangıç değeri. Anlık (kaydetme sonrası) durum için
   *  `useHasLocation()` kullan — bu, locationStore overlay'ini de hesaba katar. */
  hasLocation: boolean
  /** Oturum verisi (`/api/me`) henüz çözülmedi. Kök layout artık `auth()`
   *  okumadığından ilk boyamada bilinmez; header gibi yerler bu bayrakla
   *  yanlış durumu (ör. "Hemen Başla" ↔ avatar) çakmadan bekleyebilir. */
  loading: boolean
  /** Oturum kullanıcısını `/api/me`'den yeniden çeker. Oturum içi profil
   *  mutasyonları (ad/avatar) sonrası çağrılır: eskiden `router.refresh()`
   *  RSC layout'unu yeniden çalıştırıp nav menüsünü güncellerdi; oturum artık
   *  istemcide tutulduğundan güncelleme bu yolla yapılır. */
  refresh: () => Promise<void>
}

const SessionContext = React.createContext<SessionContextValue | null>(null)

type MeResponse = {
  user: CurrentUser | null
  conversations: ConversationListItem[]
}

/**
 * Oturum, kök layout'ta değil bu istemci sağlayıcısında yüklenir: paylaşımlı
 * rotalar (ana sayfa/blog) sunucuda `auth()` okumadan statik/ISR cache'lenebilir
 * kalır; kullanıcıya özel durum mount sonrası `/api/me`'den çekilir.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<CurrentUser | null>(null)
  const [loading, setLoading] = React.useState(true)

  const fetchMe = React.useCallback(async (): Promise<MeResponse> => {
    const res = await fetch("/api/me", {
      headers: { accept: "application/json" },
    })
    if (!res.ok) throw new Error(`me ${res.status}`)
    return (await res.json()) as MeResponse
  }, [])

  // Oturum içi profil mutasyonları (ad/avatar) sonrası kullanıcıyı tazeler.
  // Sadece `user`'ı günceller: `loading` bayrağını değiştirmez (header
  // skeleton'ı çakmasın) ve konuşma listesini yeniden hidrate etmez (store
  // kendi mutasyonlarını yönetir; hydrate zaten idempotent'tir).
  const refresh = React.useCallback(async () => {
    try {
      const data = await fetchMe()
      setUser(data.user)
    } catch {
      // Tazeleme başarısızsa mevcut durumu koru.
    }
  }, [fetchMe])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchMe()
        if (cancelled) return
        setUser(data.user)
        // Sidebar listesinin tek kaynağı bu store; mount sonrası bir kez
        // hidrate edilir (eski AppShell prop'u yerine).
        assistantConversations.hydrate(data.conversations ?? [])
      } catch {
        if (!cancelled) {
          setUser(null)
          assistantConversations.hydrate([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fetchMe])

  const value = React.useMemo<SessionContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      hasLocation: user?.location != null,
      loading,
      refresh,
    }),
    [user, loading, refresh],
  )
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useCurrentUser(): SessionContextValue {
  const ctx = React.useContext(SessionContext)
  if (!ctx) {
    throw new Error("useCurrentUser must be used within SessionProvider")
  }
  return ctx
}
