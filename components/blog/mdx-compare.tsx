"use client"

import * as React from "react"
import { RiExpandHorizontalLine } from "@remixicon/react"

import { cn } from "@/lib/utils"

// Önce/sonra bloğu: çizginin solu eski, sağı yeni hâl.
//
//   <Compare
//     before="https://cdn.trysepet.com/blog/<klasör>/once.svg"
//     beforeAlt="…"
//     after="https://cdn.trysepet.com/blog/<klasör>/sonra.svg"
//     afterAlt="…"
//     ratio="1200/630"
//   >
//     Alt yazı
//   </Compare>

type CompareProps = {
  before: string
  beforeAlt: string
  after: string
  afterAlt: string
  ratio?: string
  className?: string
  children?: React.ReactNode
}

const clamp = (n: number) => Math.min(100, Math.max(0, n))

export function Compare({
  before,
  beforeAlt,
  after,
  afterAlt,
  ratio = "16/9",
  className,
  children,
}: CompareProps) {
  const [pos, setPos] = React.useState(50)
  const frame = React.useRef<HTMLDivElement>(null)
  const dragging = React.useRef(false)

  const moveTo = React.useCallback((clientX: number) => {
    const box = frame.current?.getBoundingClientRect()
    if (!box || box.width === 0) return
    setPos(clamp(((clientX - box.left) / box.width) * 100))
  }, [])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // dokunmatikte görsel sayfayı kaydırır, çizgi yalnız tutamakla sürüklenir
    if (e.button !== 0 || e.pointerType === "touch") return
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    moveTo(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) moveTo(e.clientX)
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 20 : 5
    const next =
      e.key === "ArrowLeft"
        ? pos - step
        : e.key === "ArrowRight"
          ? pos + step
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? 100
              : null
    if (next === null) return
    e.preventDefault()
    setPos(clamp(next))
  }

  return (
    <figure className={cn("not-prose my-8 flex flex-col gap-2.5", className)}>
      {/* Tutamak görselin alt kenarına yarı yarıya taşar; alttaki boşluk
          açıklamanın ona değmemesi için. */}
      <div className="relative pb-5">
        <div
          ref={frame}
          className="relative cursor-ew-resize touch-pan-y overflow-hidden rounded-lg outline outline-1 -outline-offset-1 outline-black/10 select-none dark:outline-white/10"
          style={{ aspectRatio: ratio }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={after}
            alt={afterAlt}
            loading="lazy"
            draggable={false}
            className="absolute inset-0 size-full object-cover"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={before}
            alt={beforeAlt}
            loading="lazy"
            draggable={false}
            className="absolute inset-0 size-full object-cover"
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-background shadow-[0_0_0_1px_rgb(0_0_0/0.12)]"
            style={{ left: `${pos}%` }}
          />
        </div>
        <div
          tabIndex={0}
          role="slider"
          aria-label="Önce ve sonra arasındaki çizgi"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          aria-valuetext={`Solda yüzde ${Math.round(pos)} önce, sağda yüzde ${100 - Math.round(pos)} sonra`}
          onKeyDown={onKeyDown}
          onPointerDown={(e) => {
            dragging.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          className="absolute bottom-0 flex h-10 w-14 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center rounded-full bg-background text-foreground smooth-shadow-ring-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          style={{ left: `${pos}%` }}
        >
          <RiExpandHorizontalLine className="size-4" />
        </div>
      </div>
      {children ? (
        <figcaption className="text-sm text-muted-foreground">
          {children}
        </figcaption>
      ) : null}
    </figure>
  )
}
