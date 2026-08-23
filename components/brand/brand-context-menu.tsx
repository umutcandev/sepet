"use client"

import * as React from "react"
import { CopyIcon, DownloadIcon, ImageIcon, TypeIcon } from "lucide-react"

import { SepetMark } from "@/components/brand/sepet-mark"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { toast } from "@/components/ui/sonner"
import { copyText } from "@/lib/copy"

// Wordmark iki ayrı dosyadır ve mürekkebi dosyanın İÇİNDE sabittir (token'a
// bağlanamaz): `sepet-dark.svg` açık zemin için #6D4530, `sepet-light.svg` koyu
// zemin için #F2C897. Kullanıcı hangi temada bakıyorsa onun gördüğü dosyayı
// kopyalamak/indirmek doğrusu — aksi hâlde kopyaladığı varlık ekrandakinden
// başka renkte çıkar.
const WORDMARK = {
  light: "/brand/sepet-dark.svg",
  dark: "/brand/sepet-light.svg",
} as const

const SQUARE = {
  light: "/brand/sepet-square-light.webp",
  dark: "/brand/sepet-square-dark.webp",
} as const

// SepetMark `currentColor` ile çizilir; DOM'dan serialize edilen SVG bu yüzden
// kendi başına açıldığında siyah görünür. Kopyalarken hesaplanan rengi sabitleyip
// varlığı kendi kendine yeter hâle getiriyoruz.
function serializeMark(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const ink = getComputedStyle(svg).color
  clone.removeAttribute("class")
  clone.setAttribute("fill", "none")
  clone.setAttribute("color", ink)
  for (const path of clone.querySelectorAll('[fill="currentColor"]')) {
    path.setAttribute("fill", ink)
  }
  return new XMLSerializer().serializeToString(clone)
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a")
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * Logoya sağ tık (mobilde basılı tutma) ile açılan marka menüsü.
 *
 * Radix ContextMenu her iki jesti de kendisi karşılıyor, ek kütüphane gerekmez.
 * Menü yalnızca `public/brand` altında GERÇEKTEN bulunan varlıkları sunar;
 * üretilmeyen bir "marka paketi" vaat etmez.
 */
export function BrandContextMenu({ children }: { children: React.ReactNode }) {
  const markRef = React.useRef<SVGSVGElement>(null)

  // Hangi varyantın kopyalanacağı SAYFA temasından değil, logonun durduğu YEREL
  // bağlamdan okunur. Ana sayfanın footer'ı `dark` sınıflı bir sarmalayıcının
  // içinde: sayfa light olsa bile orada koyu zemin wordmark'ı görünüyor.
  // `resolvedTheme`e baksaydık kullanıcı ekranda gördüğünden başka renkte bir
  // dosya kopyalardı. Gizli işaret aynı DOM bağlamında durduğu için hesaplanan
  // mürekkebi bu sorunun doğru cevabını verir.
  const readMode = (): "light" | "dark" => {
    const svg = markRef.current
    if (!svg) return "light"
    return svg.closest(".dark") ? "dark" : "light"
  }

  const copyWordmark = async () => {
    try {
      const res = await fetch(WORDMARK[readMode()])
      if (!res.ok) throw new Error(String(res.status))
      const ok = await copyText(await res.text())
      toast[ok ? "success" : "error"](
        ok ? "Wordmark SVG olarak kopyalandı" : "Kopyalanamadı",
      )
    } catch {
      toast.error("Wordmark kopyalanamadı")
    }
  }

  const copyMark = async () => {
    const svg = markRef.current
    if (!svg) return toast.error("İşaret kopyalanamadı")
    const ok = await copyText(serializeMark(svg))
    toast[ok ? "success" : "error"](
      ok ? "İşaret SVG olarak kopyalandı" : "Kopyalanamadı",
    )
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel>Sepet markası</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={copyWordmark}>
          <TypeIcon />
          Wordmark&apos;ı kopyala
        </ContextMenuItem>
        <ContextMenuItem onSelect={copyMark}>
          <CopyIcon />
          İşareti kopyala
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() =>
            triggerDownload(WORDMARK[readMode()], "sepet-wordmark.svg")
          }
        >
          <DownloadIcon />
          Wordmark&apos;ı indir (SVG)
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => triggerDownload(SQUARE[readMode()], "sepet-kare.webp")}
        >
          <ImageIcon />
          Kare logoyu indir
        </ContextMenuItem>
      </ContextMenuContent>

      {/* Kopyalamanın kaynağı: işaret yalnız bir React bileşeni olarak var,
          ayrıca bir .svg dosyası yok. Yolları burada tekrar yazmak yerine aynı
          bileşeni gizlice basıp DOM'dan serialize ediyoruz — tek kaynak korunur,
          bileşen değişirse kopyalanan varlık da değişir. */}
      <span aria-hidden className="pointer-events-none fixed -left-[9999px] top-0">
        <SepetMark ref={markRef} className="h-6" />
      </span>
    </ContextMenu>
  )
}
