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

// Öğe yukarı kaydırılıp görünümden çıktı mı. Mobilde belge, 48rem–64rem
// arasında <main> kayıyor; scroll olayı kaptan kaba bubble etmediği için
// document'te capture ile dinleniyor.
function useScrolledPast(ref: React.RefObject<HTMLElement | null>) {
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
      const top =
        scroller === window
          ? 0
          : (scroller as HTMLElement).getBoundingClientRect().top
      setPast(el.getBoundingClientRect().bottom <= top)
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
  }, [ref])

  return past
}

// Mobil/tablet'te (lg altı) yazar satırının en sağındaki Kopyala ve Paylaş
// düğmeleri. Masaüstünde aynı eylemler kenar çubuğunda olduğu için gizli.
//
// Düğmeler yukarı kaydırılıp görünümden çıkınca sağ altta küçük bir "başa
// dön" düğmesi belirir.
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
  const scrolledPast = useScrolledPast(ref)

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

      {/* Ana renkte (default varyant = primary), sayfanın tek yüzen öğesi. */}
      <Button
        variant="default"
        size="icon-sm"
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
        <RiArrowUpLine className="size-3.5" />
      </Button>
    </>
  )
}
