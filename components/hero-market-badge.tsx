"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { RiArrowRightLine } from "@remixicon/react"

import { SPRING_SLIDE } from "@/lib/motion"

// 6 market logosu. Sıra, kayan pencerenin (A B C → B C D → ...) sırasını belirler.
const LOGOS = [
  { src: "/market-logos/a101.webp", alt: "A101" },
  { src: "/market-logos/migros.webp", alt: "Migros" },
  { src: "/market-logos/sok.webp", alt: "ŞOK" },
  { src: "/market-logos/bim.webp", alt: "BİM" },
  { src: "/market-logos/tarim-kredi.webp", alt: "Tarım Kredi" },
  { src: "/market-logos/carrefoursa.webp", alt: "CarrefourSA" },
] as const

// Aynı anda gösterilen logo sayısı ve her adım arasındaki süre.
const WINDOW_SIZE = 3
const STEP_MS = 500

// Kayma geçişi: hızlı ve net bir yay; opacity ayrı tween ile yumuşak fade.
// Aynı yay kapanış CTA'sındaki logo grubunda da kullanılır — tek kaynaktan
// (lib/motion.ts) gelir ki ikisi sessizce ayrışmasın.
const slide = SPRING_SLIDE

// Ok ikonunun yay ayarı: hover'da hafif zıplayan, kısa bir jest.
const ARROW_SPRING = { type: "spring", stiffness: 420, damping: 17 } as const

// Ambient "nefes": fare üzerinde DEĞİLKEN ok arada bir öne doğru kıpırdar.
// Ölçü bilinçli olarak küçük (3px) ve periyot uzun (~4.4s) — fark edilmez ama
// yokluğu fark edilir. Rozetin tıklanabilir olduğunu sessizce hatırlatır.
const ARROW_IDLE = {
  duration: 1.2,
  repeat: Infinity,
  repeatDelay: 3.2,
  ease: "easeInOut",
} as const

export function HeroMarketBadge() {
  const reduceMotion = useReducedMotion()
  const [start, setStart] = React.useState(0)
  const [hovering, setHovering] = React.useState(false)

  // Fare üzerindeyken pencereyi her adımda bir kaydır: A B C → B C D → ...
  // → E F A → F A B → A B C şeklinde sonsuz döngü.
  React.useEffect(() => {
    if (!hovering || reduceMotion) return
    const id = setInterval(() => {
      setStart((s) => (s + 1) % LOGOS.length)
    }, STEP_MS)
    return () => clearInterval(id)
  }, [hovering, reduceMotion])

  // Görünen pencere: start'tan itibaren WINDOW_SIZE adet logo (mod ile sarmalanır).
  // index, her logonun değişmez kimliğidir; AnimatePresence giriş/çıkışı buna göre yapar.
  const windowLogos = Array.from({ length: WINDOW_SIZE }, (_, i) => {
    const index = (start + i) % LOGOS.length
    return { ...LOGOS[index], index }
  })

  const arrowActive = hovering && !reduceMotion
  // Hover yokken ve hareket azaltma kapalıyken ambient kıpırdama devrede.
  const arrowIdle = !hovering && !reduceMotion

  return (
    <Link
      href="/asistan"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="group inline-flex items-center gap-2 rounded-full border border-border bg-muted py-1 pr-2.5 pl-1.5 transition-colors select-none hover:border-foreground/20 dark:border-muted-foreground/20 dark:bg-muted dark:hover:border-muted-foreground/35"
    >
      <div className="flex -space-x-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {windowLogos.map((logo) => (
            <motion.div
              key={logo.index}
              layout
              initial={{ opacity: 0, scale: 0.5, x: 12 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: -12 }}
              // Giren/çıkan logo aynı anda küçülürken silikleşsin: opacity'ye ayrı tween.
              transition={{
                ...slide,
                opacity: { duration: 0.2, ease: "easeOut" },
              }}
              className="relative size-6 shrink-0 rounded-full ring-2 ring-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo.src}
                alt={logo.alt}
                decoding="async"
                className="size-full rounded-full object-cover"
              />
              {/* Beyaz arka planlı logolar açık zeminde kaybolmasın diye ince kenar. */}
              <span className="pointer-events-none absolute inset-0 rounded-full border border-black/10 dark:border-white/10" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <span className="text-[0.8125rem] font-medium text-muted-foreground">
        Tüm zincir marketler burada!
      </span>

      <motion.span
        animate={{
          scale: arrowActive ? 1.18 : 1,
          // Hover'da sabit bir kaydırma, boştayken periyodik kıpırdama.
          x: arrowActive ? 1 : arrowIdle ? [0, 3, 0] : 0,
        }}
        transition={{
          scale: ARROW_SPRING,
          x: arrowIdle ? ARROW_IDLE : ARROW_SPRING,
        }}
        className="text-muted-foreground"
      >
        <RiArrowRightLine className="size-3.5" />
      </motion.span>
    </Link>
  )
}
