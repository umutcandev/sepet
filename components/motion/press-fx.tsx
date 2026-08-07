"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"

import { SPRING_PRESS } from "@/lib/motion"
import { cn } from "@/lib/utils"

/**
 * Hover'da yaylı kaldırma jesti.
 *
 * Basma (compression) BİLEREK burada değil: `components/ui/button.tsx`
 * içindeki `active:` sınıfları zaten tüm uygulamada basma geri bildirimi
 * veriyor. İkisini üst üste koymak ölçekleri çarpar (0.98 × 0.96) ve buton
 * basıldığında çöker. Burada yalnızca CSS'in vermediği şey var: kaldırma.
 *
 * Yay `bounce` taşımaz — zıplama küçük ikon jestlerine yakışır, buton
 * boyutunda bir öğede ucuz durur.
 */
export function PressFx({
  children,
  className,
  lift = -2,
}: {
  children: React.ReactNode
  className?: string
  /** Kaldırma mesafesi (px, negatif = yukarı). */
  lift?: number
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className={cn("inline-flex", className)}
      whileHover={reduceMotion ? undefined : { y: lift }}
      // Basıldığında taban hizasına döner: CSS'teki `active:` ezilmesiyle
      // birleşince "kalktı → bastırıldı" hissi tamamlanır.
      whileTap={reduceMotion ? undefined : { y: 0 }}
      transition={SPRING_PRESS}
    >
      {children}
    </motion.div>
  )
}
