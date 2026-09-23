"use client"

import { motion, useReducedMotion } from "motion/react"

import {
  WORDMARK_MARK_PATHS,
  WORDMARK_TEXT_PATHS,
  WORDMARK_VIEWBOX,
} from "@/lib/brand/wordmark"
import { cn } from "@/lib/utils"

export function SepetWordmark({
  collapsed,
  className,
}: {
  collapsed: boolean
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0 text-[#6D4530] dark:text-[#F2C897]", className)}
    >
      {WORDMARK_MARK_PATHS.map((d) => (
        <path key={d.slice(0, 24)} d={d} fill="currentColor" />
      ))}
      <motion.g
        // initial={false}: sayfa açılışında oynamaz, yalnız durum değişiminde.
        initial={false}
        animate={
          collapsed
            ? { opacity: 0, x: reduceMotion ? 0 : -60 }
            : { opacity: 1, x: 0 }
        }
        transition={
          collapsed
            ? { duration: 0.1, ease: "easeIn" }
            : { duration: 0.25, delay: 0.14, ease: "easeOut" }
        }
      >
        {WORDMARK_TEXT_PATHS.map((d) => (
          <path key={d.slice(0, 24)} d={d} fill="currentColor" />
        ))}
      </motion.g>
    </svg>
  )
}
