"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

/**
 * Aynı yuvada duran iki ikon arasında geçiş: ölçek + opaklık + bulanıklık.
 *
 * Sert bir koşullu render takası tek karede yapar ve kaçırılabilir — oysa bu
 * bileşenlerin kullanıldığı yerlerde (kopyalama onayı, logo → kenar çubuğu
 * anahtarı) geri bildirimin TAMAMI o ikon. Geçiş, takasın olduğunu görünür
 * kılar.
 *
 * `initial={false}` ilk render'da animasyonu bastırır: ikon sayfa açılışında
 * belirmez, yalnızca durum değişiminde oynar.
 *
 * Reduced motion altında ölçek ve bulanıklık düşer, geriye yalnızca opaklık
 * geçişi kalır: geri bildirim korunur, hareket kalkar.
 */
export function IconSwap({
  swapKey,
  children,
  className,
}: {
  /** Değiştiğinde geçiş oynar — içeriğin kimliğini temsil etmeli. */
  swapKey: string
  children: React.ReactNode
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  const hidden = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
  const shown = reduceMotion
    ? { opacity: 1 }
    : { opacity: 1, scale: 1, filter: "blur(0px)" }

  return (
    // `popLayout` çıkan öğeyi position:absolute yapar; konumlanmış atayı
    // burada garantiliyoruz ki çağıran kabın `relative` olup olmaması sonucu
    // değiştirmesin. Giren ikon (akışta kalan) kabın boyutunu verir.
    <span className={cn("relative inline-flex", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={swapKey}
          initial={hidden}
          animate={shown}
          exit={hidden}
          transition={
            reduceMotion
              ? { duration: 0.15, ease: "easeOut" }
              : { type: "spring", duration: 0.3, bounce: 0 }
          }
          className="inline-flex"
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
