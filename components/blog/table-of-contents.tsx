"use client"

import * as React from "react"

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
function getScrollParent(node: HTMLElement | null): HTMLElement | Window {
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
  const items = React.useMemo(() => getTocItems(toc), [toc])
  const [activeId, setActiveId] = React.useState("")

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

      let current = headings[0].id
      for (const heading of headings) {
        const top = heading.getBoundingClientRect().top - containerTop
        if (top <= SCROLL_OFFSET) current = heading.id
        else break
      }
      setActiveId(current)
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(compute)
    }

    compute()
    const target: HTMLElement | Window = isWindow ? window : (scroller as HTMLElement)
    target.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      target.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [items])

  const handleClick = (id: string) => (event: React.MouseEvent) => {
    const el = document.getElementById(id)
    if (!el) return
    event.preventDefault()
    setActiveId(id)
    el.scrollIntoView({ behavior: "smooth", block: "start" })
    window.history.replaceState(null, "", `#${id}`)
  }

  if (items.length < 2) return null

  return (
    <nav aria-label="İçindekiler" className="flex flex-col gap-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">
        İçindekiler
      </p>
      <ul className="flex flex-col border-l border-border">
        {items.map((item) => {
          const id = item.url.slice(1)
          const active = id === activeId
          return (
            <li key={item.url}>
              <a
                href={item.url}
                onClick={handleClick(id)}
                style={{ paddingLeft: 12 + item.depth * 12 }}
                className={cn(
                  "-ml-px block border-l-2 py-1.5 pr-2 text-sm leading-snug transition-colors",
                  active
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.title}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
