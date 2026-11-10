"use client"

import * as React from "react"
import { useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

const ERASE_MS = 18
const TYPE_MS = 38

// Eski metni harf harf siler, yenisini yazar; ortak başlangıç silinmez.
// Genişlik en uzun metinde sabit, imleç akış dışında: yazarken çevresi oynamaz.
export function TypewriterText({
  texts,
  index,
  className,
}: {
  texts: string[]
  index: number
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  const target = texts[index]
  const [typed, setTyped] = React.useState(target)
  const shown = reduceMotion ? target : typed

  React.useEffect(() => {
    if (reduceMotion || typed === target) return
    const erasing = !target.startsWith(typed)
    const id = window.setTimeout(
      () => setTyped(erasing ? typed.slice(0, -1) : target.slice(0, typed.length + 1)),
      erasing ? ERASE_MS : TYPE_MS
    )
    return () => window.clearTimeout(id)
  }, [typed, target, reduceMotion])

  return (
    <span aria-hidden className={cn("grid", className)}>
      {texts.map((text) => (
        <span key={text} className="invisible col-start-1 row-start-1">
          {text}
        </span>
      ))}
      <span className="col-start-1 row-start-1 flex">
        <span className="relative whitespace-pre">
          {shown}
          <span
            className={cn(
              "absolute top-1/2 left-full ml-px h-[1.1em] w-px -translate-y-1/2 bg-current transition-opacity duration-200",
              shown === target ? "opacity-0" : "opacity-100"
            )}
          />
        </span>
      </span>
    </span>
  )
}
