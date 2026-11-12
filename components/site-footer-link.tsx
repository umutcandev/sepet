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

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAssistantLinks } from "@/lib/ai-assistants"
import { EASE_OUT_SOFT } from "@/lib/motion"
import { cn } from "@/lib/utils"

// Client'ta olmalı: sunucudan gelen asChild zinciri (Tooltip > Button > a)
// Radix Slot'ta lazy element olarak null render edip hydration'ı bozuyordu.
// prompt sunucuda kurulur; SITE_URL istemcide farklı çözülebilir.
export function FooterAssistantLinks({ prompt }: { prompt: string }) {
  return (
    <div className="flex items-center gap-2">
      {getAssistantLinks(prompt).map(({ key, name, href, icon: Icon }) => (
        <Tooltip key={key}>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="outline"
              size="icon"
              aria-label={`Sepet'i ${name} ile öğren`}
              className="text-muted-foreground hover:text-foreground"
            >
              <a href={href} target="_blank" rel="noopener noreferrer">
                <Icon className="size-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sepet&apos;i {name} ile öğren</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

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
