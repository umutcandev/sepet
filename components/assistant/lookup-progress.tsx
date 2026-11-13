"use client"

import * as React from "react"
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react"

import { Marker, MarkerContent } from "@/components/ui/marker"
import type { LookupProgress } from "@/lib/ai/tools"

type Progress = LookupProgress & { id: string }

// Sohbetin tamamı her olayda yeniden çizilmesin diye modül düzeyinde tutulur.
let current: Progress | null = null
const listeners = new Set<() => void>()

export function setLookupProgress(p: Progress) {
  current = p
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

// Arama %0-40, eşleştirme %40-96. Gerçek değere hızla çıkar, sonra fazın
// tavanına doğru yavaşlayarak ilerler; tavana gerçek olay gelmeden varmaz.
function bounds(p: LookupProgress | null): [floor: number, ceil: number] {
  if (!p) return [0, 30]
  const r = p.total > 0 ? p.done / p.total : 1
  if (p.phase === "search") return [r * 40, r < 1 ? 39 : 45]
  return [40 + r * 56, r < 1 ? 95 : 99]
}

const R = 6
const C = 2 * Math.PI * R

export function LookupProgressMarker({ toolCallId }: { toolCallId?: string }) {
  const progress = React.useSyncExternalStore(
    subscribe,
    () => (current && current.id === toolCallId ? current : null),
    () => null
  )
  const reduce = useReducedMotion()
  const [floor, ceil] = bounds(progress)
  const value = useMotionValue(0)
  const offset = useTransform(value, (v) => C * (1 - v / 100))

  React.useEffect(() => {
    let stopped = false
    let ctrl = animate(value, Math.max(value.get(), floor), {
      duration: reduce ? 0 : 0.5,
      ease: "easeOut",
      onComplete: () => {
        if (stopped || reduce || ceil <= value.get()) return
        ctrl = animate(value, ceil, { duration: 14, ease: [0.1, 0.5, 0.3, 1] })
      },
    })
    return () => {
      stopped = true
      ctrl.stop()
    }
  }, [floor, ceil, reduce, value])

  return (
    <div className="py-0.5">
      <Marker role="status">
        <svg
          viewBox="0 0 16 16"
          className="size-3.5 shrink-0 -rotate-90"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r={R} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth="2" />
          <motion.circle
            cx="8"
            cy="8"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={C}
            style={{ strokeDashoffset: offset }}
          />
        </svg>
        <MarkerContent className="shimmer font-medium">
          {progress?.phase === "match"
            ? "Ürünleri eşleştiriyorum"
            : "Ürünleri arıyorum"}
        </MarkerContent>
      </Marker>
    </div>
  )
}
