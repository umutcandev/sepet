"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Giriş animasyonu sarmalayıcısı — yüksel + netleş (translateY + blur).
 *
 * Animasyonun kendisi CSS'te (`enter-fx` / `reveal-fx`, app/globals.css); bu
 * bileşen yalnızca ZAMANLAMAYI yönetir. Sebebi: JS ile kurulan klasik
 * `initial={{ opacity: 0 }}` reveal'lerinde main thread tıkanırsa animasyon
 * hiç başlamaz ve içerik sonsuza kadar görünmez kalır. CSS animasyonu
 * compositor'da koştuğu için aç kalamaz; ayrıca sunucudan gelen dinlenme hâli
 * zaten görünürdür, yani JS hiç çalışmasa da sayfa eksiksiz görünür.
 *
 * İki mod var:
 *
 * - `isWhileInView={false}` — sayfa açılışı girişi. Katıksız CSS animasyonu;
 *   ilk ekranda duran içerik (hero) için budur.
 * - `isWhileInView` (varsayılan) — scroll reveal. Eleman ÖNCE ölçülür: fold'un
 *   altında başlamıyorsa hiç gizlenmez. Altında başlıyorsa ilk boyamadan önce
 *   (useLayoutEffect) gizlenir ve görünür alana girince açılır.
 *
 * Tasarım sözü: bir eleman HİÇBİR koşulda "gizli kalmış" duruma düşemez.
 * Bunu iki bağımsız yol garantiler — bkz. aşağıdaki iki bölüm.
 */

// useLayoutEffect sunucuda çalışmaz ve React uyarı basar. Next.js istemci
// bileşenlerini de SSR ettiği için izomorfik sarmalayıcı gerekiyor.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

// Fold eşiği: ekranın alt kenarından bu kadar yukarısı "görünür" sayılır.
// IntersectionObserver'ın rootMargin'i ile aynı değerde olmalı, yoksa eşiğin
// tam üstündeki eleman gizlenip bir daha açılmaz.
const FOLD_MARGIN_PX = 80

/* ───────────────────────────────────────────────────────────────────────────
   Güvenlik ağı: paylaşımlı kaydırma taraması

   IntersectionObserver tek başına YETMİYOR. İki sebep üst üste biniyor:

   1. IO geri çağrısı yalnızca kesişim DURUMU değişince tetiklenir. Sayfa tek
      hamlede dibe atlarsa (Ctrl+End, kaydırma çubuğunu sürükleme, çapa linki)
      aradaki eleman "altta, kesişmiyor" → "üstte, kesişmiyor" geçişi yapar;
      isIntersecting iki durumda da false olduğu için observer hiç tetiklenmez.
   2. Bunu "kökü yukarı doğru genişletme" numarasıyla çözemiyoruz: bu uygulama
      window'da değil, app-shell içindeki `overflow-y-auto` kabında kayıyor.
      IO, kesişimi ara kaydırma kaplarının kırpma dikdörtgenleriyle de kesiştirir
      ve `rootMargin` YALNIZCA köke (viewport) uygulanır — ara kap elemanı zaten
      kırptığı için genişletilmiş kök hiçbir şey değiştirmez.

   Bu yüzden bekleyen elemanlar ortak bir kümede tutulur; document üzerinde
   YAKALAMA fazında (scroll olayı baloncuklanmaz, ama capture'da document'e
   uğrar) tek bir dinleyici, rAF ile kısılmış şekilde hepsini tarar. Küme
   boşalınca dinleyiciler sökülür — yani sayfa bir kez gezildikten sonra geriye
   hiçbir maliyet kalmaz.
─────────────────────────────────────────────────────────────────────────── */

type PendingItem = { el: Element; reveal: () => void }

const pending = new Set<PendingItem>()
let frame = 0
let attached = false

function sweep() {
  frame = 0
  const vh = window.innerHeight
  for (const item of [...pending]) {
    const r = item.el.getBoundingClientRect()
    const entered = r.top < vh - FOLD_MARGIN_PX && r.bottom > 0
    // Tamamen yukarıda kaldıysa da açılmalı: atlanmış demektir.
    const passed = r.bottom <= FOLD_MARGIN_PX
    if (entered || passed) item.reveal()
  }
  if (pending.size === 0) detach()
}

function schedule() {
  if (frame) return
  frame = requestAnimationFrame(sweep)
}

function attach() {
  if (attached) return
  attached = true
  document.addEventListener("scroll", schedule, { capture: true, passive: true })
  window.addEventListener("resize", schedule, { passive: true })
}

function detach() {
  if (!attached) return
  attached = false
  document.removeEventListener("scroll", schedule, { capture: true })
  window.removeEventListener("resize", schedule)
  if (frame) {
    cancelAnimationFrame(frame)
    frame = 0
  }
}

export type AnimateEnterProps = {
  children: React.ReactNode
  className?: string
  /** Kademe gecikmesi (saniye). */
  delay?: number
  /** Geçiş süresi (saniye). */
  duration?: number
  /** false ise scroll beklenmez, sayfa açılışında oynar. */
  isWhileInView?: boolean
  /** Sarmalayıcı etiketi — grid/flex düzenini bozmamak için değiştirilebilir. */
  as?: "div" | "span" | "li"
}

export function AnimateEnter({
  children,
  className,
  delay = 0,
  duration = 0.6,
  isWhileInView = true,
  as: Tag = "div",
}: AnimateEnterProps) {
  const ref = React.useRef<HTMLElement>(null)
  const [phase, setPhase] = React.useState<"idle" | "pending" | "shown">("idle")

  useIsomorphicLayoutEffect(() => {
    if (!isWhileInView) return
    const el = ref.current
    if (!el) return

    // Yalnızca fold'un altında başlayanlar gizlenir. Henüz boyanmadıkları için
    // görsel bir sıçrama olmaz; ekranda olan her şey olduğu gibi kalır.
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight - FOLD_MARGIN_PX && rect.bottom > 0) return

    setPhase("pending")

    let done = false
    const item: PendingItem = {
      el,
      reveal: () => {
        if (done) return
        done = true
        pending.delete(item)
        io?.disconnect()
        setPhase("shown")
      },
    }

    // Yol 1 — kaydırma taraması (atlanan elemanları da yakalar).
    pending.add(item)
    attach()

    // Yol 2 — IntersectionObserver. Kaydırma OLMADAN görünür alana giren
    // durumları yakalar (üstteki içerik kısalır, görsel yüklenir, layout
    // oturur). Kurulduğu anda bir kez mutlaka tetiklenir, bu yüzden zaten
    // kaydırılmış bir konumda mount edilme durumu da kapsanır.
    const io =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              if (entry.isIntersecting) item.reveal()
            },
            { rootMargin: `0px 0px -${FOLD_MARGIN_PX}px 0px` }
          )
    io?.observe(el)

    return () => {
      pending.delete(item)
      io?.disconnect()
      if (pending.size === 0) detach()
    }
  }, [isWhileInView])

  if (!isWhileInView) {
    return (
      <Tag
        ref={ref as React.Ref<never>}
        className={cn("enter-fx", className)}
        style={{
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
        }}
      >
        {children}
      </Tag>
    )
  }

  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-reveal={phase}
      className={cn("reveal-fx", className)}
      // Gecikme/süre yalnızca açılırken anlamlı; "pending" hâlinde transition
      // zaten kapalı (bkz. globals.css).
      style={
        phase === "shown"
          ? { transitionDelay: `${delay}s`, transitionDuration: `${duration}s` }
          : undefined
      }
    >
      {children}
    </Tag>
  )
}
