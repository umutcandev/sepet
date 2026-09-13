import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Giriş animasyonu sarmalayıcısı — yüksel + netleş (translateY + blur).
 *
 * Animasyonun kendisi CSS'te (`enter-fx`, app/globals.css); bu bileşen yalnızca
 * gecikme/süre taşır. KAYDIRMA TETİKLEYİCİSİ YOK ve olmamalı.
 *
 * YALNIZCA İLK EKRANDA KULLANILIR. Ekran dışında oynayan bir giriş, oraya
 * kaydıran kullanıcıya kaydırmayla tetiklenmiş gibi görünür — sıralama
 * `HOME_ENTER`ın neden hero ile sınırlı olduğunu da bu belirler (lib/motion.ts).
 *
 * Animasyon CSS'te olduğu için compositor'da koşar; main thread tıkansa bile
 * `both` doldurması sayesinde eleman gecikmesi dolduğunda kesin görünür olur.
 * İstemci kancası kalmadığı için sunucu bileşeni olarak da kullanılabilir.
 */

export type AnimateEnterProps = {
  children: React.ReactNode
  className?: string
  /** Kademe gecikmesi (saniye). */
  delay?: number
  /** Geçiş süresi (saniye). */
  duration?: number
  /** Sarmalayıcı etiketi — grid/flex düzenini bozmamak için değiştirilebilir. */
  as?: "div" | "span" | "li"
}

export function AnimateEnter({
  children,
  className,
  delay = 0,
  duration = 0.6,
  as: Tag = "div",
}: AnimateEnterProps) {
  return (
    <Tag
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
