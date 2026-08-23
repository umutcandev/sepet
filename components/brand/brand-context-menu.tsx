"use client"

import * as React from "react"
import Image from "next/image"
import { CheckIcon, DownloadIcon } from "lucide-react"

import { SepetMark } from "@/components/brand/sepet-mark"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { toast } from "@/components/ui/sonner"
import { copyText } from "@/lib/copy"
import { cn } from "@/lib/utils"

// Wordmark iki ayrı dosyadır ve mürekkebi dosyanın İÇİNDE sabittir (token'a
// bağlanamaz): `sepet-dark.svg` açık zemin için #6D4530, `sepet-light.svg` koyu
// zemin için #F2C897.
const WORDMARK = {
  light: "/brand/sepet-dark.svg",
  dark: "/brand/sepet-light.svg",
} as const

// Menü gövdesi <body>'ye portallanır, yani sayfanın kendi temasında yaşar
// (logonun durduğu yerel `.dark` sarmalayıcısında değil). Önizleme kutuları da
// `dark:` varyantlarıyla aynı kaynağa bakıyor; ikisi bu yüzden hep aynı şeyi
// gösterir — kullanıcı ne görüyorsa onu kopyalar. next-themes yerine doğrudan
// sınıf okunuyor: tıklama anında çalıştığı için hidrasyon sarkması olmaz.
function isDarkPage() {
  return document.documentElement.classList.contains("dark")
}

// SepetMark `currentColor` ile çizilir; DOM'dan serialize edilen SVG kendi
// başına açıldığında siyah kalırdı. Kopyalarken hesaplanan mürekkebi sabitleyip
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

function downloadBlob(source: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([source], { type: "image/svg+xml;charset=utf-8" }),
  )
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Tarayıcı indirmeyi kuyruğa aldıktan sonra serbest bırak; hemen revoke etmek
  // yavaş cihazlarda indirmeyi boş dosyaya düşürebiliyor.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Önizleme kutusu + altında etiket. Kopyalanınca kutu "Kopyalandı"ya döner. */
function CopyTile({
  label,
  copied,
  onCopy,
  children,
}: {
  label: string
  copied: boolean
  onCopy: () => void
  children: React.ReactNode
}) {
  return (
    <ContextMenuItem
      // preventDefault: kopyalama geri bildirimi kutunun içinde gösteriliyor,
      // menü kapanırsa kullanıcı onu hiç görmez.
      onSelect={(event) => {
        event.preventDefault()
        onCopy()
      }}
      className="flex-col items-stretch gap-1.5 rounded-md p-1 focus:bg-transparent"
    >
      <span className="surface-inset relative flex h-14 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
        <span
          className={cn(
            "flex items-center transition-opacity duration-150",
            copied ? "opacity-10" : "opacity-100",
          )}
        >
          {children}
        </span>
        {copied ? (
          <span className="absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CheckIcon className="size-3.5" />
            Kopyalandı
          </span>
        ) : null}
      </span>
      <span className="px-0.5 text-sm text-foreground">{label}</span>
    </ContextMenuItem>
  )
}

/**
 * Logoya sağ tık (mobilde basılı tutma) ile açılan marka menüsü.
 *
 * Radix ContextMenu her iki jesti de kendisi karşılıyor, ek kütüphane gerekmez.
 * Menü yalnızca elde GERÇEKTEN bulunan varlıkları sunar; üretilmemiş bir "marka
 * paketi" ya da olmayan bir kılavuz sayfası vaat etmez.
 */
export function BrandContextMenu({ children }: { children: React.ReactNode }) {
  const markRef = React.useRef<SVGSVGElement>(null)
  const [copied, setCopied] = React.useState<"wordmark" | "mark" | null>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  // Menü açılırken doldurulur; tıklama anında ağa gidilmez (aşağıya bkz).
  const wordmarkCache = React.useRef<Record<string, string>>({})

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const flag = (which: "wordmark" | "mark") => {
    setCopied(which)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(null), 1600)
  }

  // Menü açıldığında güncel varyantı önden indirip saklar. Amaç Safari:
  // clipboard yazımı kullanıcı hareketinden çok sonra gelirse (araya `await
  // fetch` girerse) sessizce reddedilebiliyor. Önbellek doluysa kopyalama yolu
  // ağa hiç uğramaz. Hata yutulur — asıl kopyalama yine de fetch'e düşebilir.
  const prefetchWordmark = () => {
    const src = WORDMARK[isDarkPage() ? "dark" : "light"]
    if (wordmarkCache.current[src]) return
    void fetch(src)
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => {
        if (text) wordmarkCache.current[src] = text
      })
      .catch(() => {})
  }

  const copyWordmark = async () => {
    const src = WORDMARK[isDarkPage() ? "dark" : "light"]
    try {
      let source = wordmarkCache.current[src]
      if (!source) {
        const res = await fetch(src)
        if (!res.ok) throw new Error(String(res.status))
        source = await res.text()
        wordmarkCache.current[src] = source
      }
      if (!(await copyText(source))) throw new Error("clipboard")
      flag("wordmark")
    } catch {
      toast.error("Wordmark kopyalanamadı")
    }
  }

  const copyMark = async () => {
    const svg = markRef.current
    if (!svg) return toast.error("İşaret kopyalanamadı")
    if (!(await copyText(serializeMark(svg)))) {
      return toast.error("İşaret kopyalanamadı")
    }
    flag("mark")
  }

  const downloadMark = () => {
    const svg = markRef.current
    if (!svg) return toast.error("İşaret indirilemedi")
    downloadBlob(serializeMark(svg), "sepet-simge.svg")
  }

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open) prefetchWordmark()
        else setCopied(null)
      }}
    >
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>

      <ContextMenuContent className="w-72 p-1">
        <div className="grid grid-cols-2 gap-1">
          <CopyTile
            label="Wordmark'ı kopyala"
            copied={copied === "wordmark"}
            onCopy={copyWordmark}
          >
            {/* Tema seçimi CSS ile: iki dosya da basılır, biri gizlenir.
                Hidrasyonda yanlış varyantın parlaması böyle engellenir ve
                kaynak, kopyalamanın baktığı `html.dark` ile aynı olur. */}
            <Image
              src="/brand/sepet-dark.svg"
              alt="Sepet"
              width={846}
              height={178}
              className="h-5 w-auto dark:hidden"
            />
            <Image
              src="/brand/sepet-light.svg"
              alt=""
              aria-hidden
              width={846}
              height={178}
              className="hidden h-5 w-auto dark:block"
            />
          </CopyTile>

          <CopyTile
            label="İşareti kopyala"
            copied={copied === "mark"}
            onCopy={copyMark}
          >
            <SepetMark className="h-8" />
          </CopyTile>
        </div>

        <ContextMenuSeparator />

        {/* Menü öğelerinin varsayılanı ikonu SAĞA itmek (`[&>svg]:order-last`
            + `ms-auto`). Bunu aynı özgüllükte bir karşı-sınıfla ezmek sıralamaya
            bağlı kalırdı; ikonu bir span'e sarıyoruz, böylece `[&>svg]` doğrudan
            çocuk eşleşmesi hiç kurulmuyor. Boyut kuralı `[&_svg]` descendant
            olduğu için geçerliliğini koruyor. */}
        <ContextMenuItem onSelect={downloadMark} className="gap-2 py-1.5">
          <span className="flex shrink-0 items-center">
            <DownloadIcon />
          </span>
          Simgeyi indir (SVG)
        </ContextMenuItem>
      </ContextMenuContent>

      {/* Kopyalama/indirmenin kaynağı: işaretin ayrı bir .svg dosyası yok,
          yalnız bu bileşen var. Yolları burada tekrar yazmak yerine aynı
          bileşeni gizlice basıp DOM'dan serialize ediyoruz — tek kaynak korunur.
          Trigger ile aynı ağaçta durur (portallanmaz), bu yüzden mürekkebi
          logonun bulunduğu yerel bağlamdan alır. */}
      <span aria-hidden className="pointer-events-none fixed top-0 -left-[9999px]">
        <SepetMark ref={markRef} className="h-6" />
      </span>
    </ContextMenu>
  )
}
