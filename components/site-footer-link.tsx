"use client"

// Footer bağlantısı — hover'da soldan sağa açılan alt çizgi.
//
// Çizgi `border-b`/`underline` yerine ayrı bir motion katmanı: scaleX 0→1 ile
// origin-left büyür, böylece renk geçişiyle aynı anda "yazılıyormuş" gibi
// açılır. bg-current sayesinde rengi metnin hover rengini (foreground) izler.
//
// SiteFooter sunucu bileşeni olarak kalsın diye ayrı dosyada: yalnızca bu
// yaprak bileşen istemciye iner.

import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"

import { EASE_OUT_SOFT } from "@/lib/motion"
import { cn } from "@/lib/utils"

const underline = {
  rest: { scaleX: 0 },
  hover: { scaleX: 1 },
}

export function FooterLink({
  href,
  external,
  className,
  children,
}: {
  href: string
  external?: boolean
  className?: string
  children: React.ReactNode
}) {
  const reduceMotion = useReducedMotion()

  const content = (
    // Hover kutusu metnin kendisi kadar: satır aralığındaki boşluğa gelince
    // çizgi tetiklenmesin diye inline-block bir sarmalayıcı.
    <motion.span
      initial="rest"
      animate="rest"
      whileHover="hover"
      className="relative inline-block"
    >
      {children}
      <motion.span
        aria-hidden
        variants={underline}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.28, ease: EASE_OUT_SOFT }
        }
        className="absolute -bottom-0.5 left-0 h-px w-full origin-left bg-current"
      />
    </motion.span>
  )

  const linkClassName = cn(
    "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
    className
  )

  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClassName}
    >
      {content}
    </a>
  ) : (
    <Link href={href} className={linkClassName}>
      {content}
    </Link>
  )
}
