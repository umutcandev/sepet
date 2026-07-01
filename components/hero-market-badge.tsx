"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowRightIcon } from "lucide-react"

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
const slide = { type: "spring", stiffness: 460, damping: 34, mass: 0.7 } as const

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

  return (
    <Link
      href="/asistan"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="group inline-flex select-none items-center gap-2 rounded-full border border-border bg-muted py-1 pl-1.5 pr-2.5 transition-colors hover:border-foreground/20 dark:border-muted-foreground/20 dark:bg-muted dark:hover:border-muted-foreground/35"
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
              transition={{ ...slide, opacity: { duration: 0.2, ease: "easeOut" } }}
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

      <span className="text-[13px] font-medium text-muted-foreground">
        Tüm zincir marketler burada!
      </span>

      <motion.span
        animate={{ scale: arrowActive ? 1.18 : 1, x: arrowActive ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 17 }}
        className="text-muted-foreground"
      >
        <ArrowRightIcon className="size-3.5" />
      </motion.span>
    </Link>
  )
}
