"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { EASE_OUT_SOFT } from "@/lib/motion"
import { cn } from "@/lib/utils"

const FADE = 6

const ROLL = {
  below: { y: "110%" },
  center: { y: 0 },
  above: { y: "-110%" },
}
const ROLL_REDUCED = {
  below: { opacity: 0 },
  center: { opacity: 1 },
  above: { opacity: 0 },
}
const STAGGER = {
  below: {},
  center: { transition: { staggerChildren: 0.025 } },
  above: { transition: { staggerChildren: 0.025 } },
}

export type RollingItem = { key: string; text: string; dateTime?: string }

// Aralıkla sıradakine geçer; index dışarıdan değişirse (tıklama) sayaç sıfırlanır.
export function useRotation(count: number, play: boolean, interval: number) {
  const [index, setIndex] = React.useState(0)

  React.useEffect(() => {
    if (!play) return
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % count), interval)
    return () => window.clearTimeout(id)
  }, [play, index, count, interval])

  const next = React.useCallback(() => setIndex((i) => (i + 1) % count), [count])
  return [index, next] as const
}

// Slot makinesi: harfler sırayla alttan gelir, eskiler üste çıkar. Genişlik en
// uzun öğede sabit kalır, takas sırasında çevresi oynamaz.
export function RollingText({
  items,
  index,
  className,
}: {
  items: RollingItem[]
  index: number
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  const active = items[index]
  const Label = active.dateTime ? motion.time : motion.span

  return (
    <span
      aria-hidden
      style={{
        paddingBlock: FADE,
        maskImage: `linear-gradient(to bottom, transparent, #000 ${FADE}px, #000 calc(100% - ${FADE}px), transparent)`,
      }}
      className={cn("grid overflow-hidden", className)}
    >
      {items.map((item) => (
        <span key={item.key} className="invisible col-start-1 row-start-1">
          {item.text}
        </span>
      ))}
      <AnimatePresence initial={false}>
        <Label
          key={active.key}
          dateTime={active.dateTime}
          className="col-start-1 row-start-1 flex"
          variants={STAGGER}
          initial="below"
          animate="center"
          exit="above"
        >
          {Array.from(active.text).map((char, i) => (
            <motion.span
              key={i}
              variants={reduceMotion ? ROLL_REDUCED : ROLL}
              transition={{ duration: 0.55, ease: EASE_OUT_SOFT }}
              className="inline-block whitespace-pre"
            >
              {char}
            </motion.span>
          ))}
        </Label>
      </AnimatePresence>
    </span>
  )
}
