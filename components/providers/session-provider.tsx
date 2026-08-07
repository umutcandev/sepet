"use client"

import * as React from "react"
import { toast } from "sonner"

import type { CurrentUser } from "@/lib/auth/session"
import type { ConversationListItem } from "@/components/assistant/assistant-conversations-group"
import {
  SESSION_SNAPSHOT_KEY,
  sessionSnapshot,
  type SessionDisplayUser,
} from "@/lib/auth/session-snapshot"
import { signOutAction } from "@/lib/actions/auth"
import { assistantConversations } from "@/lib/stores/assistant-conversations"

type SessionContextValue = {
  /** Otoriter oturum: /api/me çözümlenene kadar null. Davranış kapıları
   *  (onboarding/konum modalı, profil mutasyonları) BUNU kullanmalı —
   *  `displayUser` ipucunu değil. */
  user: CurrentUser | null
  isAuthenticated: boolean
  /** Sunucudan gelen başlangıç değeri. Anlık (kaydetme sonrası) durum için
   *  `useHasLocation()` kullan — bu, locationStore overlay'ini de hesaba katar. */
  hasLocation: boolean
  /** Oturum verisi (`/api/me`) henüz çözülmedi. */
  loading: boolean
  /** İyimser "authed" beklentisi: kullanıcı yeni giriş yaptı / OAuth'tan
   *  dönüyor (snapshot `pending`) ve `/api/me` henüz çözülmedi, gösterecek
   *  ad/avatar da yok. SALT bu durumda profil yer tutucusu (skeleton) gösterilir
   *  — genel `loading` DEĞİL. Aksi halde misafirde de (ilk yüklemede loading
   *  herkes için true) veya bayat/pending ipucunda gereksiz iskelet flash'ı
   *  olur. Snapshot'lı dönen kullanıcı zaten `displayUser` ile NavUser görür. */
  pendingAuth: boolean
  /** Header/sidebar/hero gibi SALT GÖRÜNTÜ yerleri için kullanıcı: /api/me
   *  çözülmüşse gerçek kullanıcı, henüz yükleniyorsa localStorage'daki son
   *  bilinen snapshot. Böylece dönen ziyaretlerde avatar/ad hidrasyonla
   *  birlikte anında görünür, /api/me yalnızca sessizce doğrular. */
  displayUser: SessionDisplayUser | null
  /** Oturum kullanıcısını `/api/me`'den yeniden çeker. Oturum içi profil
   *  mutasyonları (ad/avatar) sonrası çağrılır: eskiden `router.refresh()`
   *  RSC layout'unu yeniden çalıştırıp nav menüsünü güncellerdi; oturum artık
   *  istemcide tutulduğundan güncelleme bu yolla yapılır. */
  refresh: () => Promise<void>
  /** Menülerden çıkış: önce istemci oturumunu iyimser temizler (avatar/nav
   *  anında misafir durumuna döner), sonra signOutAction httpOnly cookie'yi
   *  siler (redirect: false → await'lenir), en son client "/"a tam navigasyon
   *  yapar. Oturum istemcide tutulduğu için client temizliği tek başına
   *  yeterli DEĞİL; cookie silme başarısız olursa (yutulmaz) gerçek durum geri
   *  yüklenir ve kullanıcı uyarılır — aksi halde UI "çıkış" der ama oturum
   *  sunucuda açık kalır. */
  signOut: () => Promise<void>
  /** signOut'un yalnızca istemci temizliği: kendi server action'ını çağıran
   *  akışlar için (tüm cihazlardan çıkış, hesabı silme). Action'dan ÖNCE
   *  çağrılmalı ki redirect geldiğinde UI çoktan misafir durumunda olsun. */
  clearClientSession: () => void
}

const SessionContext = React.createContext<SessionContextValue | null>(null)

type MeResponse = {
  user: CurrentUser | null
  conversations: ConversationListItem[]
}

function toDisplayUser(user: CurrentUser): SessionDisplayUser {
  return { name: user.name, email: user.email, avatar: user.avatar }
}

/**
 * Oturum, kök layout'ta değil bu istemci sağlayıcısında yüklenir: paylaşımlı
 * rotalar (ana sayfa/blog) sunucuda `auth()` okumadan statik/ISR cache'lenebilir
 * kalır; kullanıcıya özel durum mount sonrası `/api/me`'den çekilir.
 *
 * Flicker'ı önlemek için /api/me sonucu localStorage snapshot'ına yazılır
 * (lib/auth/session-snapshot.ts): sonraki yüklenişte layout'un inline scripti
 * ilk boyamadan önce doğru varyantı gösterir, bu provider da hidrasyonda
 * snapshot'taki ad/avatar ile görüntüyü doldurur.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<CurrentUser | null>(null)
  const [loading, setLoading] = React.useState(true)
  // /api/me ulaşılamadı (ağ hatası vb.): oturumun gerçekten bittiğine dair
  // kanıt yok → görüntüde son bilinen snapshot'a düşmeye devam et; misafir
  // durumuna zorla geçirmek yanlış "çıkış yapıldı" izlenimi verir.
  const [failed, setFailed] = React.useState(false)

  // Hidrasyon güvenli snapshot okuma: SSR/ilk render'da null (statik HTML ile
  // eşleşir), hidrasyon biter bitmez istemci değeri uygulanır. storage event
  // aboneliği sayesinde diğer sekmelerdeki giriş/çıkışlar da buraya düşer.
  const storedSnapshot = React.useSyncExternalStore(
    sessionSnapshot.subscribe,
    sessionSnapshot.get,
    sessionSnapshot.getServer,
  )

  const fetchMe = React.useCallback(async (): Promise<MeResponse> => {
    const res = await fetch("/api/me", {
      headers: { accept: "application/json" },
    })
    if (!res.ok) throw new Error(`me ${res.status}`)
    return (await res.json()) as MeResponse
  }, [])

  const clearClientSession = React.useCallback(() => {
    setUser(null)
    setLoading(false)
    setFailed(false)
    sessionSnapshot.set(null)
    assistantConversations.reset()
  }, [])

  // Oturum içi profil mutasyonları (ad/avatar) sonrası kullanıcıyı tazeler.
  // Sadece `user`'ı günceller ve snapshot'ı gerçekle senkron tutar; konuşma
  // listesini yeniden hidrate etmez (store kendi mutasyonlarını yönetir).
  const refresh = React.useCallback(async () => {
    try {
      const data = await fetchMe()
      setUser(data.user)
      setFailed(false)
      sessionSnapshot.set(data.user ? toDisplayUser(data.user) : null)
      // Oturum bu arada düşmüşse (ör. başka sekmede çıkış) listeyi de boşalt.
      if (!data.user) assistantConversations.reset()
    } catch {
      // Tazeleme başarısızsa mevcut durumu koru.
    }
  }, [fetchMe])

  const signOut = React.useCallback(async () => {
    // Önce iyimser istemci temizliği: kullanıcı tıklar tıklamaz UI misafir
    // durumuna döner (sadece localStorage/React state — httpOnly cookie'ye
    // dokunamaz).
    clearClientSession()
    try {
      // Cookie'yi GERÇEKTEN silen adım. redirect: false olduğundan bu await
      // cookie silinene kadar bekler; patlarsa aşağıdaki catch'e düşer.
      await signOutAction()
    } catch {
      // Cookie silinemedi → UI "çıkış yapıldı" derken oturum sunucuda hâlâ
      // açık kalır (Google girişinde OAuthAccountNotLinked'e yol açan durum).
      // Sessizce yutma: gerçeği geri yükle ve kullanıcıyı uyar.
      void refresh()
      toast.error("Çıkış yapılamadı, lütfen tekrar dene.")
      return
    }
    // Sunucu cookie'yi sildi; tam sayfa navigasyonuyla oturumsuz "/"a geç
    // (statik sayfa, misafir durumuyla tutarlı; bayat client cache bırakmaz).
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- tam reload kasıtlı; router.push bayat client cache'i taşır.
    window.location.assign("/")
  }, [clearClientSession, refresh])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchMe()
        if (cancelled) return
        setUser(data.user)
        // Bir sonraki ziyaretin ilk boyaması için gerçeği snapshot'a yaz
        // (yanlış/pending ipucu da burada düzelir).
        sessionSnapshot.set(data.user ? toDisplayUser(data.user) : null)
        // Sidebar listesinin tek kaynağı bu store; mount sonrası bir kez
        // hidrate edilir (eski AppShell prop'u yerine).
        assistantConversations.hydrate(data.conversations ?? [])
      } catch {
        if (!cancelled) {
          setUser(null)
          setFailed(true)
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

  // Sekmeler arası senkron: başka sekme giriş/çıkış yapıp snapshot'ı
  // değiştirdiyse bu sekmenin otoriter durumu eskimiştir → /api/me'den yeniden
  // doğrula. Yalnızca `storage` event'i dinlenir (tarayıcı bunu sadece değer
  // GERÇEKTEN değişince ve sadece DİĞER sekmelerde tetikler); refresh()'in
  // kendi set() yazımı aynı sekmede event üretmediğinden döngü oluşmaz.
  // `pending` işareti (OAuth'a gidildi) veri taşımadığından yok sayılır.
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== SESSION_SNAPSHOT_KEY) return
      const snap = sessionSnapshot.get()
      if (snap && "pending" in snap) return
      void refresh()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [refresh])

  const value = React.useMemo<SessionContextValue>(() => {
    const snapshotUser =
      storedSnapshot && "user" in storedSnapshot ? storedSnapshot.user : null
    const snapshotIsPending =
      storedSnapshot !== null && "pending" in storedSnapshot
    return {
      user,
      isAuthenticated: user !== null,
      hasLocation: user?.location != null,
      loading,
      // Yalnızca gerçek giriş beklentisinde (pending ipucu) ve henüz veri
      // yokken true → skeleton bu duruma bağlanır. Misafir/bayat ipucunda false.
      pendingAuth: user === null && loading && snapshotIsPending,
      displayUser: user
        ? toDisplayUser(user)
        : loading || failed
          ? snapshotUser
          : null,
      refresh,
      signOut,
      clearClientSession,
    }
  }, [user, loading, failed, storedSnapshot, refresh, signOut, clearClientSession])

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
