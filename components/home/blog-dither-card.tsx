"use client"

import * as React from "react"
import Link from "next/link"
import { Dithering } from "@paper-design/shaders-react"
import { useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

// Paper "Sine Wave" dithering preset'i (shaders.paper.design/dithering):
// shape=wave, type=4x4, size=11, speed=1, scale=1.2. Playground'un mor/turkuaz
// renkleri yerine kartın kendi paletini kullanıyoruz: zemin = dark kart rengi
// (--card), mürekkep = primary tan (--primary). Bölüm `dark` sarmalayıcı içinde
// olduğu için bu ikili her iki temada da sabit kalır.
const DITHER = {
  colorBack: "#221A14",
  colorFront: "#d4a6747c",
  shape: "wave",
  type: "8x8",
  size: 5,
  speed: 1,
  scale: 4,
  offsetX: -0.25,
  offsetY: 0.35,
} as const

// Fade-out süresi; canvas'ı bu süre dolmadan söküp geçişi kesmiyoruz.
const FADE_MS = 300

// Her kartın dalgası farklı yöne baksın: kart index'ine göre sabit rotasyon.
// Kartlar aynı satırda yan yana olduğu için deterministik bir liste (rastgele
// değil) — SSR/CSR aynı değeri üretir ve dizilim her yüklemede aynı kalır.
const ROTATIONS = [0, 45, 90, 135] as const

export function BlogDitherCard({
  href,
  index = 0,
  className,
  children,
}: {
  href: string
  index?: number
  className?: string
  children: React.ReactNode
}) {
  const reduceMotion = useReducedMotion()
  const [active, setActive] = React.useState(false)
  // WebGL context'i 4 kart için sürekli açık tutmamak adına canvas yalnızca
  // hover/focus sırasında mount ediliyor, fade bitince sökülüyor.
  const [mounted, setMounted] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const activate = React.useCallback(() => {
    if (reduceMotion) return
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    setMounted(true)
    setActive(true)
  }, [reduceMotion])

  const deactivate = React.useCallback(() => {
    setActive(false)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMounted(false), FADE_MS)
  }, [])

  return (
    <Link
      href={href}
      onPointerEnter={activate}
      onPointerLeave={deactivate}
      onFocus={activate}
      onBlur={deactivate}
      className={cn("relative isolate overflow-hidden", className)}
    >
      {mounted ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 transition-opacity duration-300",
            active ? "opacity-100" : "opacity-0"
          )}
        >
          <Dithering
            {...DITHER}
            rotation={ROTATIONS[index % ROTATIONS.length]}
            style={{ width: "100%", height: "100%" }}
          />
          {/* Metin kontrastı: shader'ın üzerine karttan gelen yarı saydam perde. */}
          <div className="absolute inset-0 bg-card/45" />
        </div>
      ) : null}
      {children}
    </Link>
  )
}
