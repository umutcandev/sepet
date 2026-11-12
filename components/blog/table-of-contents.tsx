"use client"

import * as React from "react"
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react"

import { EASE_IN_OUT } from "@/lib/motion"
import { cn } from "@/lib/utils"

export type TocEntry = { title: string; url: string; items: TocEntry[] }
type FlatEntry = { title: string; url: string; depth: number }
export type NumberedTocEntry = FlatEntry & { number: string }

function flatten(entries: TocEntry[], depth = 0): FlatEntry[] {
  return entries.flatMap((entry) => [
    { title: entry.title, url: entry.url, depth },
    ...flatten(entry.items, depth + 1),
  ])
}

// Sayfa içi (#) bağlantı içeren düz başlık listesi. Hem masaüstü içindekiler hem
// de mobil drawer aynı listeyi kullanır; mobil tetik düğmesinin gösterilip
// gösterilmeyeceği de bunun uzunluğuna göre belirlenir.
export function getTocItems(toc: TocEntry[]): FlatEntry[] {
  return flatten(toc).filter((item) => item.url.startsWith("#"))
}

// Başlıklara hiyerarşik sıra numarası ekler (1, 1.1, 1.2, 2, 3 ...). Her derinlik
// için bir sayaç tutulur; daha üst bir başlığa dönüldüğünde altındaki sayaçlar
// sıfırlanır (counters.length kısaltması). Numara, kök başlıktan o başlığa kadar
// olan sayaçların noktayla birleşimidir.
export function getNumberedTocItems(toc: TocEntry[]): NumberedTocEntry[] {
  const counters: number[] = []
  return getTocItems(toc).map((item) => {
    counters[item.depth] = (counters[item.depth] ?? 0) + 1
    counters.length = item.depth + 1
    return { ...item, number: counters.join(".") }
  })
}

// İçeriğin gerçek kaydırma kabını bul. AppShell içeriği `window` yerine
// overflow-y-auto bir div'de kaydırır; scroll-spy ve smooth-scroll'un doğru
// çalışması için bu kabı yakalamamız gerekir.
export function getScrollParent(node: HTMLElement | null): HTMLElement | Window {
  let current = node?.parentElement ?? null
  while (current) {
    const overflowY = getComputedStyle(current).overflowY
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      current.scrollHeight > current.clientHeight
    ) {
      return current
    }
    current = current.parentElement
  }
  return window
}

// Üstten bırakılacak boşluk (px) — başlık kabın tepesine yapışmasın.
const SCROLL_OFFSET = 96

// Masaüstü sticky içindekiler. rehype-slug id'leri üzerinden çalışır; aktif
// başlık kaydırma konumuna göre belirlenir (IntersectionObserver yerine konum
// tabanlı: kısa yazılarda ve eş-zamanlı görünür başlıklarda daha kararlı).
export function TableOfContents({ toc }: { toc: TocEntry[] }) {
  const items = React.useMemo(() => getNumberedTocItems(toc), [toc])
  const [activeId, setActiveId] = React.useState("")
  // Tıklamayla başlayan smooth scroll bitene kadar scroll-spy susar; yoksa
  // ara karelerde önceki başlığı seçip göstergeyi geri-ileri oynatır.
  const lockRef = React.useRef(false)
  const unlockTimerRef = React.useRef(0)

  React.useEffect(() => {
    if (items.length === 0) return
    const ids = items.map((item) => item.url.slice(1))
    const getHeadings = () =>
      ids
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el != null)

    const headings = getHeadings()
    if (headings.length === 0) return

    const scroller = getScrollParent(headings[0])
    const isWindow = scroller === window
    const scrollEl = isWindow
      ? document.scrollingElement ?? document.documentElement
      : (scroller as HTMLElement)

    let frame = 0
    const compute = () => {
      frame = 0
      if (lockRef.current) return
      const containerTop = isWindow
        ? 0
        : (scroller as HTMLElement).getBoundingClientRect().top

      // Tabandayken son başlığı işaretle (son bölüm kısa olabilir).
      const atBottom =
        scrollEl.scrollTop + scrollEl.clientHeight >=
        scrollEl.scrollHeight - 4
      if (atBottom) {
        setActiveId(headings[headings.length - 1].id)
        return
      }

      // İlk başlığa varılmadıysa hiçbiri aktif değil.
      let current = ""
      for (const heading of headings) {
        const top = heading.getBoundingClientRect().top - containerTop
        if (top <= SCROLL_OFFSET) current = heading.id
        else break
      }
      setActiveId(current)
    }

    const onScroll = () => {
      // Kilit kaydırma sürdükçe uzar; sabit süre uzun mesafede erken açılıyordu.
      if (lockRef.current) {
        window.clearTimeout(unlockTimerRef.current)
        unlockTimerRef.current = window.setTimeout(unlock, 150)
        return
      }
      if (frame) return
      frame = requestAnimationFrame(compute)
    }
    // Kilit açılırken yeniden hesaplanmaz: tıklanan başlık sayfa sonuna yakınsa
    // tepeye çıkamaz ve hesap bir öncekini seçerdi.
    const unlock = () => {
      lockRef.current = false
    }

    compute()
    const target: HTMLElement | Window = isWindow ? window : (scroller as HTMLElement)
    target.addEventListener("scroll", onScroll, { passive: true })
    target.addEventListener("scrollend", unlock)
    window.addEventListener("resize", onScroll, { passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      target.removeEventListener("scroll", onScroll)
      target.removeEventListener("scrollend", unlock)
      window.removeEventListener("resize", onScroll)
      window.clearTimeout(unlockTimerRef.current)
    }
  }, [items])

  const handleClick = (id: string) => (event: React.MouseEvent) => {
    const el = document.getElementById(id)
    if (!el) return
    event.preventDefault()
    lockRef.current = true
    // Kaydırma hiç başlamazsa (zaten yerinde) yedek.
    window.clearTimeout(unlockTimerRef.current)
    unlockTimerRef.current = window.setTimeout(() => {
      lockRef.current = false
    }, 300)
    setActiveId(id)
    el.scrollIntoView({ behavior: "smooth", block: "start" })
    window.history.replaceState(null, "", `#${id}`)
  }

  const activeIndex = items.findIndex((item) => item.url === `#${activeId}`)

  // Liste kenar çubuğuna sığmazsa kendi içinde kayar; aktif başlık ortalanır,
  // taşan kenar SSS'teki gibi overlay fade ile söner (mask Chrome'da titretiyor).
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const centeredRef = React.useRef(false)
  const reduceMotion = useReducedMotion()
  const [fade, setFade] = React.useState({ top: false, bottom: false })

  const updateFade = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const top = el.scrollTop > 1
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1
    setFade((f) => (f.top === top && f.bottom === bottom ? f : { top, bottom }))
  }, [])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateFade()
    const observer = new ResizeObserver(updateFade)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [updateFade, items])

  React.useEffect(() => {
    const el = scrollRef.current
    const row = el?.querySelectorAll("li")[Math.max(0, activeIndex)]
    if (!el || !row || el.scrollHeight <= el.clientHeight) return
    const rowTop =
      row.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop
    el.scrollTo({
      top: rowTop - (el.clientHeight - row.offsetHeight) / 2,
      behavior: centeredRef.current && !reduceMotion ? "smooth" : "instant",
    })
    centeredRef.current = true
  }, [activeIndex, reduceMotion])

  if (items.length < 2) return null

  return (
    <nav aria-label="İçindekiler" className="flex min-h-0 flex-col gap-3">
      <p className="shrink-0 text-xs font-medium tracking-wider text-muted-foreground uppercase">
        İçindekiler
      </p>
      <div className="relative flex min-h-0 flex-col">
        {/* -ml-1 pl-1: aktif düğümün halkası sol kenarda kırpılmasın. */}
        <div
          ref={scrollRef}
          onScroll={updateFade}
          className="-ml-1 min-h-0 overflow-y-auto pl-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <TocSteps items={items} activeIndex={activeIndex} onItemClick={handleClick} />
        </div>
        <div
          aria-hidden
          className={cn(FADE, "top-0 bg-gradient-to-b", !fade.top && "opacity-0")}
        />
        <div
          aria-hidden
          className={cn(FADE, "bottom-0 bg-gradient-to-t", !fade.bottom && "opacity-0")}
        />
      </div>
    </nav>
  )
}

const FADE =
  "pointer-events-none absolute inset-x-0 z-20 h-12 from-background to-transparent transition-opacity duration-300 ease-out-soft"

type Rail = { top: number; height: number }

// Dolgu ilerlemesi yalnız görünen ray uzunluğu üzerinden sayılır; düğümlerin
// arkası atlanır ki ease-in-out'un yavaş kalkış/inişi daire arkasında kaybolmasın.
function railToY(rails: Rail[], progress: number) {
  let acc = 0
  for (const rail of rails) {
    if (progress <= acc + rail.height) return rail.top + Math.max(0, progress - acc)
    acc += rail.height
  }
  const last = rails.at(-1)
  return last ? last.top + last.height : 0
}

// Numaralı duraklar. Gri ray parçaları satırların içinde (düğüm etrafında 2px
// boşlukla); dolgu, aynı parçaların ölçülüp üstte kırpılan kopyası. Düğümler
// dolgu kendilerine vardığı an dolar.
function TocSteps({
  items,
  activeIndex,
  onItemClick,
}: {
  items: NumberedTocEntry[]
  activeIndex: number
  onItemClick: (id: string) => (event: React.MouseEvent) => void
}) {
  const listRef = React.useRef<HTMLOListElement>(null)
  const startedRef = React.useRef(false)
  // targets: her düğüme varmak için dolması gereken ray uzunluğu.
  const [layout, setLayout] = React.useState<{ rails: Rail[]; targets: number[] }>({
    rails: [],
    targets: [],
  })
  const [reached, setReached] = React.useState(0)
  const reduceMotion = useReducedMotion()
  const progress = useMotionValue(0)
  const fillY = useMotionValue(0)
  const clipPath = useTransform(fillY, (y) => `inset(0 0 calc(100% - ${y}px) 0)`)

  React.useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      const origin = list.getBoundingClientRect().top
      const rects = (selector: string) =>
        Array.from(list.querySelectorAll<HTMLElement>(selector), (el) =>
          el.getBoundingClientRect()
        )
      const rails = rects("[data-rail]").map((r) => ({ top: r.top - origin, height: r.height }))
      const targets = rects("[data-node]").map((r) =>
        rails
          .filter((rail) => rail.top < r.top - origin)
          .reduce((sum, rail) => sum + rail.height, 0)
      )
      setLayout({ rails, targets })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [items])

  // activeIndex -1: ilk başlığa henüz varılmadı, hiçbir düğüm dolmaz.
  const none = activeIndex < 0
  const sync = React.useCallback(
    (p: number) => {
      fillY.set(railToY(layout.rails, p))
      setReached(none ? 0 : layout.targets.filter((target) => target <= p + 0.5).length)
    },
    [layout, fillY, none]
  )
  useMotionValueEvent(progress, "change", sync)

  React.useLayoutEffect(() => {
    const target = none ? layout.targets[0] : layout.targets[activeIndex]
    if (target == null) return
    if (!startedRef.current || reduceMotion) {
      startedRef.current = true
      progress.jump(target)
      sync(target)
      return
    }
    sync(progress.get())
    const distance = Math.abs(target - progress.get())
    const controls = animate(progress, target, {
      duration: Math.min(0.9, 0.45 + distance / 300),
      ease: EASE_IN_OUT,
    })
    return () => controls.stop()
  }, [activeIndex, none, layout, reduceMotion, progress, sync])

  const last = items.length - 1

  return (
    <div className="relative">
      <ol ref={listRef}>
        {items.map((item, i) => {
          const top = item.depth === 0
          const filled = i < reached
          const active = i === activeIndex
          return (
            <li key={item.url}>
              <a
                href={item.url}
                onClick={onItemClick(item.url.slice(1))}
                className="group flex gap-3 pr-2"
              >
                {/* Tek sayı genişlik: 1px ray ile düğüm merkezi aynı piksele düşer.
                    Düğüm merkezi ~18px (satır üst boşluğu 8 + satır yarısı 10). */}
                <span aria-hidden className="flex w-[17px] shrink-0 flex-col items-center gap-0.5">
                  <span
                    data-rail={i > 0 || undefined}
                    className={cn(
                      "w-px shrink-0 bg-border",
                      top ? "h-[7px]" : "h-3",
                      i === 0 && "invisible"
                    )}
                  />
                  <span
                    data-node
                    className={cn(
                      "relative z-10 flex shrink-0 items-center justify-center rounded-full transition-[background-color,color,box-shadow] duration-150",
                      top
                        ? "size-[17px] text-[0.5625rem] leading-none font-medium tabular-nums"
                        : "size-[7px]",
                      filled
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground ring-1 ring-muted-foreground/30 ring-inset group-hover:text-foreground",
                      filled &&
                        active &&
                        "shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_22%,var(--background))]"
                    )}
                  >
                    {top ? item.number : null}
                  </span>
                  <span
                    data-rail={i < last || undefined}
                    className={cn("w-px flex-1 bg-border", i === last && "invisible")}
                  />
                </span>
                <span
                  className={cn(
                    "py-2 transition-colors",
                    top ? "text-sm/5" : "text-[0.8125rem]/5",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {item.title}
                </span>
              </a>
            </li>
          )
        })}
      </ol>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ clipPath }}
      >
        {layout.rails.map((rail, i) => (
          <span
            key={i}
            className="absolute left-2 w-px bg-primary"
            style={{ top: rail.top, height: rail.height }}
          />
        ))}
      </motion.div>
    </div>
  )
}
