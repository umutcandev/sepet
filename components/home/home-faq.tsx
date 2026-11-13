"use client"

// Ana sayfa SSS'i. lg'de sabit bir kutu: madde yerinde açılır, kutudan taşan
// kenar fade ile söner. Alttaki maddelerde liste yukarı kayar (kural measure'da). Fade mask-image değil overlay: mask, Chrome/Windows'ta
// metni titretiyor (bkz. ai-elements/conversation.tsx).

import * as React from "react"

import { SubscriptionFaqList } from "@/components/subscription/subscription-faq"
import { cn } from "@/lib/utils"

const FADE_MAX = 48

type Layout = { offset: number; top: number; bottom: number }

const OVERLAY =
  "pointer-events-none absolute inset-x-0 z-10 hidden from-[var(--home-base)] to-transparent transition-opacity duration-300 ease-out-soft lg:block"

export function HomeFaq({ className }: { className?: string }) {
  const [value, setValue] = React.useState("")
  const [layout, setLayout] = React.useState<Layout>({
    offset: 0,
    top: 0,
    bottom: 0,
  })
  // Kutu en az kapalı liste boyundadır; yoksa son başlıklar kırpılır.
  const [minHeight, setMinHeight] = React.useState<number>()
  const boxRef = React.useRef<HTMLDivElement>(null)
  const clipRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  const measure = React.useCallback(() => {
    const box = boxRef.current
    const clip = clipRef.current
    const list = listRef.current
    if (!box || !clip || !list) return

    // Kutu yalnız lg'de var (clip orada absolute); altında normal akordeon.
    if (getComputedStyle(clip).position !== "absolute") {
      setMinHeight(undefined)
      setLayout((l) => ({ ...l, offset: 0 }))
      return
    }

    // Hesap animasyonun o anki boyuyla değil SON ölçülerle yapılır: başlıklar
    // + açık cevabın tam boyu, kapanmakta olan cevaplar sayılmaz. Yoksa hedef
    // ilk karelerde yalnız başlığa göre çıkıp animasyon boyunca kayıyordu.
    const items = Array.from(
      list.querySelectorAll<HTMLElement>('[data-slot="accordion-item"]')
    )
    const contentOf = (el: HTMLElement) =>
      el.querySelector<HTMLElement>('[data-slot="accordion-content"]')
    // getBoundingClientRect: offsetHeight her değeri ayrı yuvarlar, animasyonda
    // fark kare kare 1px oynayıp kutuyu (ve sayfayı) titretiyordu.
    const rectHeight = (el: Element | null | undefined) =>
      el ? el.getBoundingClientRect().height : 0
    const headers = items.map((el) => rectHeight(el) - rectHeight(contentOf(el)))
    const closedHeight = Math.ceil(headers.reduce((sum, h) => sum + h, 0))
    setMinHeight(closedHeight)

    const height = box.clientHeight
    // Kart listeden uzunsa kapalı liste kutuda ortalı durur.
    const rest = -Math.round(Math.max(0, (height - closedHeight) / 2))
    const index = items.findIndex((el) => el.dataset.state === "open")

    if (index < 0) {
      // Kapanırken fade yükseklikleri korunur ki sönüşü görünsün.
      setLayout((l) => (l.offset === rest ? l : { ...l, offset: rest }))
      return
    }

    // İç div animasyon boyunca da cevabın tam boyunu taşır (accordion.tsx).
    const answer = rectHeight(contentOf(items[index])?.firstElementChild)
    const itemHeight = headers[index] + answer
    const itemTop = headers.slice(0, index).reduce((sum, h) => sum + h, 0)
    const itemBottom = itemTop + itemHeight
    const listHeight = closedHeight + answer

    // İlk üç madde yerinde açılır, liste hiç kaymaz. Dördüncü ortaya yarı yolda
    // yaklaşır. Kalanlar listenin sonu kutunun altına oturacak kadar kayar ki
    // en alttaki başlık görünsün. Hiçbiri başını kutunun üstüne itmez.
    const end = Math.max(rest, listHeight - height)
    let offset = rest
    if (index === 3) {
      const centered = itemTop - (height - itemHeight) / 2
      offset = Math.max(itemBottom - height, rest + (centered - rest) / 2)
      offset = Math.max(rest, Math.min(offset, end, itemTop))
    } else if (index > 3) {
      offset = Math.max(rest, Math.min(end, itemTop))
    }

    // Tam piksel: kesirli hedef her ölçümde azıcık değişip translate'i oynatıyordu.
    offset = Math.round(offset)
    const overflowTop = offset > 0
    const overflowBottom = listHeight - offset > height + 0.5
    const next = {
      offset,
      top: overflowTop ? Math.round(Math.min(FADE_MAX, itemTop - offset)) : 0,
      bottom: overflowBottom
        ? Math.round(Math.min(FADE_MAX, height - (itemBottom - offset)))
        : 0,
    }
    setLayout((l) =>
      l.offset === next.offset && l.top === next.top && l.bottom === next.bottom
        ? l
        : next
    )
  }, [])

  // Metin sarması değişirse (genişlik, font yüklenmesi) yeniden ölçülür.
  React.useEffect(() => {
    const box = boxRef.current
    const list = listRef.current
    if (!box || !list) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    observer.observe(list)
    return () => observer.disconnect()
  }, [measure, value])

  const open = value !== ""

  return (
    <div
      ref={boxRef}
      className={cn("relative", className)}
      style={{ minHeight }}
    >
      <div ref={clipRef} className="lg:absolute lg:inset-0 lg:overflow-hidden">
        <div
          ref={listRef}
          className="relative transition-transform duration-300 ease-out-soft"
          style={{ transform: `translateY(${-layout.offset}px)` }}
        >
          <SubscriptionFaqList value={value} onValueChange={setValue} />
        </div>

        <div
          aria-hidden
          className={cn(
            OVERLAY,
            "top-0 bg-gradient-to-b",
            !(open && layout.top) && "opacity-0"
          )}
          style={{ height: layout.top }}
        />
        <div
          aria-hidden
          className={cn(
            OVERLAY,
            "bottom-0 bg-gradient-to-t",
            !(open && layout.bottom) && "opacity-0"
          )}
          style={{ height: layout.bottom }}
        />
      </div>
    </div>
  )
}
