"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/** Sağ kenardaki solma payı. Kayma bu kadar fazla gider ki son harfler solmadan okunsun. */
const FADE_PX = 12
/** Kayma hızı (px/s): okunabilir, göz yormayan bir tempo. */
const SPEED_PX_PER_S = 28

/**
 * Tek satırlık metin. Sığıyorsa düz durur; sığmıyorsa alt satıra kırılmak ya
 * da kesilmek yerine gizli kalan ucunu göstermek için yavaşça kayar, bekler ve
 * geri döner (animasyon: globals.css `marquee-pingpong`). Hareket azaltma
 * tercihinde kaymaz, üç noktayla kesilir.
 *
 * Taşma ölçümü ResizeObserver ile: genişlik değişince (ekran döndü, kart
 * daraldı) kayma mesafesi de güncellenir.
 */
export function MarqueeText({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const outerRef = React.useRef<HTMLSpanElement>(null)
  const innerRef = React.useRef<HTMLSpanElement>(null)
  const [overflow, setOverflow] = React.useState(0)

  React.useEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    const ro = new ResizeObserver(() => {
      // Kesirli genişliklerle: scrollWidth/clientWidth tam sayıya yuvarlanıyor
      // ve sığan kısa bir metin ("Su") 1px taşıyor sanılıp kayıyordu.
      const diff =
        inner.getBoundingClientRect().width - outer.getBoundingClientRect().width
      setOverflow(diff > 1 ? Math.ceil(diff) : 0)
    })
    ro.observe(outer)
    ro.observe(inner)
    return () => ro.disconnect()
  }, [])

  const shift = overflow > 0 ? overflow + FADE_PX : 0
  // Kayma toplam sürenin %60'ı (gidiş + dönüş), kalan %40 iki uçta bekleme.
  const duration = Math.max(4, (2 * shift) / SPEED_PX_PER_S / 0.6)

  return (
    <span
      ref={outerRef}
      data-overflow={overflow > 0 || undefined}
      className={cn(
        "marquee-text block min-w-0 overflow-hidden whitespace-nowrap",
        className,
      )}
      style={
        overflow > 0
          ? ({
              "--marquee-shift": `-${shift}px`,
              "--marquee-duration": `${duration.toFixed(2)}s`,
            } as React.CSSProperties)
          : undefined
      }
    >
      <span ref={innerRef} className="inline-block">
        {children}
      </span>
    </span>
  )
}
