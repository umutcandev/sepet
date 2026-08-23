"use client"

import * as React from "react"
import Image from "next/image"
import { CheckIcon, DownloadIcon, PackageIcon } from "lucide-react"

import { IconSwap } from "@/components/motion/icon-swap"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { toast } from "@/components/ui/sonner"
import { copyText } from "@/lib/copy"

// Dosya adlarındaki "-light" AÇIK MÜREKKEBİ anlatır, yani koyu zeminde
// kullanılır. Mürekkep dosyanın içinde sabittir (token'a bağlanamaz), bu yüzden
// hangi varyantın verileceğine sayfanın teması karar verir.
const ASSET = {
  light: { wordmark: "/brand/sepet-dark.svg", logo: "/brand/sepet-logo-dark.svg" },
  dark: { wordmark: "/brand/sepet-light.svg", logo: "/brand/sepet-logo-light.svg" },
} as const

const MEDIA_KIT = "/brand/sepet-medya-kiti.zip"

// Menü gövdesi <body>'ye portallanır, yani sayfanın kendi temasında yaşar
// (logonun durduğu yerel `.dark` sarmalayıcısında değil). Önizleme kutuları da
// `dark:` varyantlarıyla aynı kaynağa bakar; kullanıcı kutuda ne görüyorsa onu
// kopyalar. next-themes yerine sınıf okunuyor: tıklama anında çalıştığı için
// hidrasyon sarkması olmaz.
function assets() {
  return ASSET[
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  ]
}

function download(href: string, filename: string) {
  const a = document.createElement("a")
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * Önizleme kutusu + altında etiket. Kopyalanınca kutunun içeriği `IconSwap` ile
 * (ölçek + opaklık + bulanıklık) onay durumuna geçer — kod bloğundaki kopyalama
 * geri bildiriminin aynı fiziği.
 */
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
      // preventDefault: onay kutunun içinde gösteriliyor, menü kapanırsa
      // kullanıcı onu hiç görmez.
      onSelect={(event) => {
        event.preventDefault()
        onCopy()
      }}
      className="flex-col items-stretch gap-1.5 rounded-md p-1 focus:bg-transparent"
    >
      <span className="surface-inset flex h-14 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
        <IconSwap swapKey={copied ? "copied" : "idle"}>
          {copied ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CheckIcon className="size-3.5" />
              Kopyalandı
            </span>
          ) : (
            children
          )}
        </IconSwap>
      </span>
      <span className="px-0.5 text-sm text-foreground">{label}</span>
    </ContextMenuItem>
  )
}

/**
 * Logoya sağ tık (mobilde basılı tutma) ile açılan marka menüsü.
 *
 * Radix ContextMenu her iki jesti de kendisi karşılıyor, ek kütüphane gerekmez.
 * Sunulan her varlık `public/brand` altında gerçekten var; işaretin SVG'leri ve
 * medya kiti `scripts/build-brand-kit.mjs` ile ekrandaki bileşenle aynı
 * kaynaktan üretiliyor.
 */
export function BrandContextMenu({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = React.useState<"wordmark" | "logo" | null>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  // Menü açılırken doldurulur; tıklama anında ağa gidilmez (aşağıya bkz).
  const cache = React.useRef<Record<string, string>>({})

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const flag = (which: "wordmark" | "logo") => {
    setCopied(which)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(null), 1600)
  }

  // Menü açıldığında iki SVG'yi de önden indirip saklar. Amaç Safari: clipboard
  // yazımı kullanıcı hareketinden çok sonra gelirse (araya `await fetch`
  // girerse) sessizce reddedilebiliyor. Önbellek doluysa kopyalama ağa uğramaz.
  const prefetch = () => {
    const { wordmark, logo } = assets()
    for (const src of [wordmark, logo]) {
      if (cache.current[src]) continue
      void fetch(src)
        .then((res) => (res.ok ? res.text() : null))
        .then((text) => {
          if (text) cache.current[src] = text
        })
        .catch(() => {})
    }
  }

  const copy = async (src: string, which: "wordmark" | "logo") => {
    try {
      let source = cache.current[src]
      if (!source) {
        const res = await fetch(src)
        if (!res.ok) throw new Error(String(res.status))
        source = await res.text()
        cache.current[src] = source
      }
      if (!(await copyText(source))) throw new Error("clipboard")
      flag(which)
    } catch {
      toast.error("Kopyalanamadı")
    }
  }

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open) prefetch()
        else setCopied(null)
      }}
    >
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>

      {/* collisionPadding: menü imlecin/parmağın konumuna çıpalanır. Logolar
          başlığın en solunda ve en üstünde duruyor, yani çıpa hep bir kenara
          yapışık; pay olmadan menü ekranın kenarına dayanıp kırpılmış
          görünüyordu. */}
      <ContextMenuContent className="w-72 p-1" collisionPadding={12}>
        <div className="grid grid-cols-2 gap-1">
          <CopyTile
            label="Wordmark'ı kopyala"
            copied={copied === "wordmark"}
            onCopy={() => copy(assets().wordmark, "wordmark")}
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
            label="Logoyu kopyala"
            copied={copied === "logo"}
            onCopy={() => copy(assets().logo, "logo")}
          >
            <Image
              src="/brand/sepet-logo-dark.svg"
              alt="Sepet logosu"
              width={167}
              height={284}
              className="h-8 w-auto dark:hidden"
            />
            <Image
              src="/brand/sepet-logo-light.svg"
              alt=""
              aria-hidden
              width={167}
              height={284}
              className="hidden h-8 w-auto dark:block"
            />
          </CopyTile>
        </div>

        <ContextMenuSeparator />

        {/* İkonlar sağda: menü öğesinin temeli bunu zaten yapıyor
            (`[&>svg]:order-last` + `ms-auto`), o yüzden ikonu doğrudan çocuk
            bırakıp kurala dokunmuyoruz. */}
        <ContextMenuItem
          onSelect={() => download(assets().wordmark, "sepet-wordmark.svg")}
        >
          Wordmark&apos;ı indir
          <DownloadIcon />
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => download(assets().logo, "sepet-logo.svg")}
        >
          Logoyu indir
          <DownloadIcon />
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => download(MEDIA_KIT, "sepet-medya-kiti.zip")}
        >
          Medya kitini indir
          <PackageIcon />
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
