"use client"

import * as React from "react"
import { RiCheckboxCircleFill } from "@remixicon/react"
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
} from "motion/react"

import { HeaderSlot } from "@/components/header-slot"
import { IconSwap } from "@/components/motion/icon-swap"
import { POST_ARTICLE, POST_CONTAINER, POST_GRID } from "@/lib/blog/layout"
import { EASE_OUT_SOFT } from "@/lib/motion"
import { cn } from "@/lib/utils"

const FADE = 12
const MARQUEE_DELAY = 2 // sn
const MARQUEE_SPEED = 32 // px/sn
const META_INTERVAL = 8000
const DONE_AT = 0.98
const ROLL_FADE = 6

type MetaItem = { key: string; text: string; dateTime?: string }

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

// Slot makinesi: harfler sırayla alttan gelir, eskiler üste çıkar; tıklayınca da döner.
function RollingMeta({ items, play }: { items: MetaItem[]; play: boolean }) {
  const [index, setIndex] = React.useState(0)
  const reduceMotion = useReducedMotion()
  const count = items.length

  // index bağımlılığı: tıklama da sayacı sıfırlar.
  React.useEffect(() => {
    if (!play) return
    const id = window.setTimeout(
      () => setIndex((i) => (i + 1) % count),
      META_INTERVAL
    )
    return () => window.clearTimeout(id)
  }, [play, index, count])

  const active = items[index]
  const Label = active.dateTime ? motion.time : motion.span

  return (
    <button
      type="button"
      onClick={() => setIndex((i) => (i + 1) % count)}
      aria-label={`${active.text}, sonrakini göster`}
      className="pointer-events-auto shrink-0 cursor-pointer rounded-sm text-xs font-medium tracking-wider text-muted-foreground uppercase hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span
        style={{
          paddingBlock: ROLL_FADE,
          maskImage: `linear-gradient(to bottom, transparent, #000 ${ROLL_FADE}px, #000 calc(100% - ${ROLL_FADE}px), transparent)`,
        }}
        className="grid justify-items-end overflow-hidden"
      >
        {/* Genişlik en uzun etikette sabit kalsın diye görünmez ölçüler. */}
        {items.map((item) => (
          <span
            key={item.key}
            aria-hidden
            className="invisible col-start-1 row-start-1"
          >
            {item.text}
          </span>
        ))}
        <AnimatePresence initial={false}>
          <Label
            key={active.key}
            dateTime={active.dateTime}
            aria-hidden
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
    </button>
  )
}

// Sığmayan başlık bekledikten sonra gizli kısmı görünene kadar sola kayar ve durur.
function TitleMarquee({ text, play }: { text: string; play: boolean }) {
  const boxRef = React.useRef<HTMLSpanElement>(null)
  const textRef = React.useRef<HTMLSpanElement>(null)
  const [distance, setDistance] = React.useState(0)
  const reduceMotion = useReducedMotion()

  React.useEffect(() => {
    const box = boxRef.current
    const label = textRef.current
    if (!box || !label) return
    const measure = () => {
      setDistance(Math.max(0, label.offsetWidth - (box.clientWidth - FADE * 2)))
    }
    measure()
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(box)
    resizeObserver.observe(label)
    return () => resizeObserver.disconnect()
  }, [])

  const moving = play && distance > 0 && !reduceMotion

  return (
    <span
      ref={boxRef}
      className="block overflow-hidden"
      style={{
        paddingInline: FADE,
        maskImage: `linear-gradient(to right, transparent, #000 ${FADE}px, #000 calc(100% - ${FADE}px), transparent)`,
      }}
    >
      <motion.span
        className="block w-max"
        animate={{ x: moving ? -distance : 0 }}
        transition={
          moving
            ? {
                duration: distance / MARQUEE_SPEED,
                ease: "easeInOut",
                delay: MARQUEE_DELAY,
              }
            : { duration: 0 }
        }
      >
        <span ref={textRef} className="whitespace-nowrap">
          {text}
        </span>
      </motion.span>
    </span>
  )
}

// Yazı başlığı header'ın altına girince header'da tek satırlık başlık, sırayla
// dönen kategori/tarih ve okuma ilerlemesi belirir. Yalnız lg+ ve makale sütununda; sağ sütun
// "Oturum Aç" ile çakışır.
export function ArticleHeaderBar({
  title,
  category,
  date,
  dateTime,
}: {
  title: string
  category: string
  date: string
  dateTime: string
}) {
  const [shown, setShown] = React.useState(false)
  const progress = useMotionValue(0)
  const reduceMotion = useReducedMotion()
  const [done, setDone] = React.useState(false)

  useMotionValueEvent(progress, "change", (v) => setDone(v >= DONE_AT))

  React.useEffect(() => {
    const main = document.getElementById("main")
    const heading = document.querySelector("[data-post-title]")
    const body = document.querySelector("[data-post-body]")
    if (!main || !heading || !body) return

    let frame = 0
    const measure = () => {
      frame = 0
      const view = main.getBoundingClientRect()
      const top = Math.max(view.top, 0)
      const height = Math.min(view.bottom, window.innerHeight) - top
      setShown(heading.getBoundingClientRect().bottom < top)
      const rect = body.getBoundingClientRect()
      const span = rect.height - height
      const p = span > 0 ? (top - rect.top) / span : 1
      progress.set(p < 0 ? 0 : p > 1 ? 1 : p)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    measure()
    main.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("scroll", schedule, { passive: true })
    const resizeObserver = new ResizeObserver(schedule)
    resizeObserver.observe(main)
    resizeObserver.observe(body)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      main.removeEventListener("scroll", schedule)
      window.removeEventListener("scroll", schedule)
      resizeObserver.disconnect()
    }
  }, [progress])

  const scrollToTop = () => {
    document
      .getElementById("main")
      ?.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })
  }

  return (
    <>
      {/* İçerik header'ın altına sert kesilmek yerine yumuşakça girer. Yükseklik
        sticky içindekilerin top-6'sında biter, onu soldurmaz. */}
      <div
        aria-hidden
        className="pointer-events-none sticky top-16 z-10 -mb-6 h-6 shrink-0 bg-gradient-to-b from-background to-transparent md:top-0"
      />
      <HeaderSlot>
        <motion.div
          initial={false}
          animate={
            shown
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: reduceMotion ? 0 : 6 }
          }
          transition={{ duration: 0.25, ease: EASE_OUT_SOFT }}
          inert={!shown}
          className={cn(POST_CONTAINER, POST_GRID, "hidden h-full")}
        >
          <div className={cn(POST_ARTICLE, "flex items-center")}>
            {/* Kod bloğundaki kopyala → tik geçişiyle aynı takas. */}
            <IconSwap
              swapKey={done ? "done" : "progress"}
              className="size-5 shrink-0 items-center justify-center"
            >
              {done ? (
                <RiCheckboxCircleFill
                  aria-hidden
                  className="size-5 text-primary"
                />
              ) : (
                <svg
                  aria-hidden
                  viewBox="0 0 20 20"
                  className="size-4.5 -rotate-90"
                >
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    fill="none"
                    strokeWidth="2.5"
                    className="stroke-border"
                  />
                  <motion.circle
                    cx="10"
                    cy="10"
                    r="8"
                    fill="none"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    style={{ pathLength: progress }}
                    className="stroke-primary"
                  />
                </svg>
              )}
            </IconSwap>
            <button
              type="button"
              onClick={scrollToTop}
              aria-label={`${title}, başa dön`}
              className="pointer-events-auto min-w-0 flex-1 rounded-sm text-left cn-font-display text-lg text-foreground hover:text-foreground/80 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <TitleMarquee text={title} play={shown} />
            </button>
            <RollingMeta
              play={shown}
              items={[
                { key: "category", text: category },
                { key: "date", text: date, dateTime },
              ]}
            />
          </div>
        </motion.div>
      </HeaderSlot>
    </>
  )
}
