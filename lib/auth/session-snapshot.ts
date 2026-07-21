// Son bilinen oturumun istemci tarafı snapshot'ı (localStorage).
//
// Kök layout statik olduğundan ilk boyamada sunucu oturumu bilemez; /api/me
// yanıtı ise JS + ağ + DB beklediği için geç gelir. Bu store, son bilinen
// oturumu iki katmanda köprüler:
//
// 1. Boyama ÖNCESİ: layout'taki inline script bu anahtarı okuyup <html>'e
//    `data-session="authed" | "guest"` yazar; globals.css'teki kurallar
//    [data-session-guest] / [data-session-authed] sarmalayıcılarından doğru
//    olanı gösterir. Böylece "skeleton → doğru durum" çakması hiç yaşanmaz.
// 2. Hidrasyon SONRASI: SessionProvider snapshot'taki ad/e-posta/avatar ile
//    header ve sidebar'ı /api/me dönmeden doldurur; /api/me yalnızca sessizce
//    doğrular.
//
// Snapshot bir İPUCUDUR, otorite değildir: /api/me her çözümlemede gerçeği
// buraya geri yazar (`set`), çıkışta temizlenir. Yalnızca görüntü alanları
// saklanır (ad/e-posta/avatar) — konum gibi hassas/karar verici alanlar
// localStorage'a yazılmaz ve modal kapıları (onboarding/konum) snapshot'a
// değil çözümlenmiş `user`'a bakar.

export const SESSION_SNAPSHOT_KEY = "sepet:session-snapshot:v1"

/** Header/sidebar/hero'nun ihtiyaç duyduğu minimal görüntü alanları. */
export type SessionDisplayUser = {
  name: string
  email: string
  avatar: string
}

export type SessionSnapshot =
  /** Bilinen oturum: görüntü verisiyle. */
  | { user: SessionDisplayUser }
  /** Login tıklandı, OAuth dönüşü bekleniyor: authed ipucu var ama veri yok.
   *  (Callback sonrası ilk boyamada "Hemen Başla" flash'ı yerine avatar
   *  skeleton'ı gösterilir; OAuth iptal edilirse /api/me null döner ve
   *  snapshot temizlenir.) */
  | { pending: true }

type Listener = () => void

const listeners = new Set<Listener>()

// getSnapshot her render'da çağrılır → aynı ham string için aynı referansı
// döndür ki useSyncExternalStore sonsuz döngüye girmesin.
let cachedRaw: string | null | undefined
let cachedValue: SessionSnapshot | null = null

function readRaw(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(SESSION_SNAPSHOT_KEY)
  } catch {
    return null
  }
}

function parse(raw: string | null): SessionSnapshot | null {
  if (!raw) return null
  if (raw === "pending") return { pending: true }
  try {
    const data = JSON.parse(raw) as Partial<SessionDisplayUser>
    if (typeof data?.name !== "string" || typeof data?.email !== "string") {
      return null
    }
    return {
      user: {
        name: data.name,
        email: data.email,
        avatar: typeof data.avatar === "string" ? data.avatar : "",
      },
    }
  } catch {
    return null
  }
}

function applyHtmlAttr(value: SessionSnapshot | null) {
  if (typeof document === "undefined") return
  document.documentElement.dataset.session = value ? "authed" : "guest"
}

function notify() {
  for (const l of listeners) l()
}

export const sessionSnapshot = {
  /** useSyncExternalStore getSnapshot'ı — istemci değeri (referans stabil). */
  get(): SessionSnapshot | null {
    const raw = readRaw()
    if (raw !== cachedRaw) {
      cachedRaw = raw
      cachedValue = parse(raw)
    }
    return cachedValue
  },

  /** useSyncExternalStore getServerSnapshot'ı — SSR/hidrasyon her zaman
   *  "bilinmiyor" render eder; statik HTML ile birebir eşleşir. */
  getServer(): SessionSnapshot | null {
    return null
  },

  /** Otoriter oturum sonucunu yaz (/api/me çözümlemesi, çıkış). */
  set(user: SessionDisplayUser | null) {
    if (typeof window === "undefined") return
    try {
      if (user) {
        window.localStorage.setItem(
          SESSION_SNAPSHOT_KEY,
          JSON.stringify({
            name: user.name,
            email: user.email,
            avatar: user.avatar,
          }),
        )
      } else {
        window.localStorage.removeItem(SESSION_SNAPSHOT_KEY)
      }
    } catch {
      // localStorage yoksa (gizli mod vb.) ipucu katmanı sessizce devre dışı
      // kalır; oturum yine /api/me ile çalışır.
    }
    applyHtmlAttr(user ? { user } : null)
    notify()
  },

  /** Google ile giriş tıklandığında: OAuth dönüşündeki ilk boyama için
   *  "authed" ipucunu iyimser bırak. */
  markPending() {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(SESSION_SNAPSHOT_KEY, "pending")
    } catch {
      // Yoksay.
    }
    applyHtmlAttr({ pending: true })
    notify()
  },

  subscribe(l: Listener): () => void {
    listeners.add(l)
    // Diğer sekmelerdeki giriş/çıkışları da yakala (storage yalnız diğer
    // sekmelerde tetiklenir; aynı sekme set()/markPending() ile notify eder).
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === SESSION_SNAPSHOT_KEY) l()
    }
    window.addEventListener("storage", onStorage)
    return () => {
      listeners.delete(l)
      window.removeEventListener("storage", onStorage)
    }
  },
}

/** Layout <body> başına konan, ilk boyamadan önce çalışan inline script.
 *  next-themes'in tema scriptiyle aynı kalıp: render bloklayarak <html>'e
 *  data-session yazar, CSS doğru header/sidebar varyantını gösterir. */
export const SESSION_HINT_SCRIPT = `(function(){var d=document.documentElement;try{d.dataset.session=localStorage.getItem(${JSON.stringify(
  SESSION_SNAPSHOT_KEY,
)})?"authed":"guest"}catch(e){d.dataset.session="guest"}})()`
