"use client"

import * as React from "react"
import {
  RiArrowUpLine,
  RiFileCopyLine,
  RiLinksLine,
  RiShareForwardLine,
} from "@remixicon/react"

import {
  CopyArticleMenuItems,
  getShareTargets,
} from "@/components/blog/article-actions"
import { getScrollParent } from "@/components/blog/table-of-contents"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/sonner"
import { copyText } from "@/lib/copy"
import { cn } from "@/lib/utils"

// Makaleyi kopyala açılır menüsü: yalnız ikonlu, yuvarlak düğme. Menü öğeleri
// masaüstü kenar çubuğundaki "Makaleyi Kopyala" menüsüyle paylaşılır.
function CopyMenu({
  markdown,
  markdownUrl,
  title,
}: {
  markdown: string
  markdownUrl: string
  title: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          hitArea
          aria-label="Kopyala"
          className="rounded-full"
        >
          <RiFileCopyLine className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <CopyArticleMenuItems
          markdown={markdown}
          markdownUrl={markdownUrl}
          title={title}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Paylaş açılır menüsü: bağlantıyı kopyala + sosyal paylaşım hedefleri
// (masaüstü kenar çubuğundaki ikon satırıyla aynı liste).
function ShareMenu({ pageUrl, title }: { pageUrl: string; title: string }) {
  const targets = getShareTargets(pageUrl, title)
  const handleCopyLink = async () => {
    const ok = await copyText(pageUrl)
    toast[ok ? "success" : "error"](
      ok ? "Bağlantı kopyalandı" : "Bağlantı kopyalanamadı"
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          hitArea
          aria-label="Paylaş"
          className="rounded-full"
        >
          <RiShareForwardLine className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={handleCopyLink}>
          <RiLinksLine className="size-4" />
          Bağlantıyı kopyala
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {targets.map((target) => (
          <DropdownMenuItem key={target.label} asChild>
            <a href={target.href} target="_blank" rel="noopener noreferrer">
              <target.icon className="size-4" />
              {target.label}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Öğe yukarı kaydırılıp görünümden çıktı mı; ayrıca sayfanın ne kadarı
// kaydırıldı. Mobilde belge, 48rem–64rem arasında <main> kayıyor; scroll olayı
// kaptan kaba bubble etmediği için document'te capture ile dinleniyor.
// İlerleme her karede değiştiği için state'e değil doğrudan halkanın
// stroke-dashoffset'ine yazılıyor; React yalnız görünürlük değişince çizer.
function useScrollState(
  ref: React.RefObject<HTMLElement | null>,
  ringRef: React.RefObject<SVGCircleElement | null>
) {
  const [past, setPast] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    let frame = 0
    const compute = () => {
      frame = 0
      // lg ve üstünde öğe gizli (display: none); ölçülecek bir şey yok.
      if (el.offsetParent === null) return setPast(false)
      const scroller = getScrollParent(el)
      const box =
        scroller === window
          ? (document.scrollingElement ?? document.documentElement)
          : (scroller as HTMLElement)
      const top = scroller === window ? 0 : box.getBoundingClientRect().top
      setPast(el.getBoundingClientRect().bottom <= top)

      const ring = ringRef.current
      if (ring) {
        const span = box.scrollHeight - box.clientHeight
        const progress =
          span > 0 ? Math.min(1, Math.max(0, box.scrollTop / span)) : 0
        ring.style.strokeDashoffset = String(1 - progress)
      }
    }
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(compute)
    }

    compute()
    document.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    })
    window.addEventListener("resize", onScroll, { passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      document.removeEventListener("scroll", onScroll, { capture: true })
      window.removeEventListener("resize", onScroll)
    }
  }, [ref, ringRef])

  return past
}

// Mobil/tablet'te (lg altı) yazar satırının en sağındaki Kopyala ve Paylaş
// düğmeleri. Masaüstünde aynı eylemler kenar çubuğunda olduğu için gizli.
//
// Düğmeler yukarı kaydırılıp görünümden çıkınca sağ altta küçük, yuvarlak bir
// "başa dön" düğmesi belirir; çevresindeki halka sayfanın ne kadarının
// kaydırıldığını gösterir.
export function MobileArticleActions({
  markdown,
  markdownUrl,
  pageUrl,
  title,
  className,
}: {
  markdown: string
  markdownUrl: string
  pageUrl: string
  title: string
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const ringRef = React.useRef<SVGCircleElement>(null)
  const scrolledPast = useScrollState(ref, ringRef)

  const scrollToTop = () => {
    getScrollParent(ref.current).scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <>
      <div
        ref={ref}
        className={cn("flex shrink-0 items-center gap-2 lg:hidden", className)}
      >
        <CopyMenu markdown={markdown} markdownUrl={markdownUrl} title={title} />
        <ShareMenu pageUrl={pageUrl} title={title} />
      </div>

      {/* Ana renkte (default varyant = primary), sayfanın tek yüzen öğesi.
          Halka düğmenin içinde: soluk iz tam daire, üstündeki çizgi tepeden
          saat yönünde kaydırma oranı kadar dolar (pathLength=1, dashoffset =
          1 − oran). */}
      <Button
        variant="default"
        size="icon-lg"
        hitArea
        onClick={scrollToTop}
        inert={!scrolledPast}
        aria-hidden={!scrolledPast}
        aria-label="Başa dön"
        className={cn(
          "fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 rounded-full shadow-md transition duration-200 lg:hidden",
          scrolledPast
            ? "opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        )}
      >
        <svg
          aria-hidden
          viewBox="0 0 36 36"
          className="pointer-events-none absolute inset-0 size-full -rotate-90"
        >
          <circle
            cx="18"
            cy="18"
            r="14.5"
            fill="none"
            strokeWidth="2"
            className="stroke-primary-foreground/25"
          />
          <circle
            ref={ringRef}
            cx="18"
            cy="18"
            r="14.5"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset="1"
            className="stroke-primary-foreground"
          />
        </svg>
        <RiArrowUpLine className="size-4" />
      </Button>
    </>
  )
}
