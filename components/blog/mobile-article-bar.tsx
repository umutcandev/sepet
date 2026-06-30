"use client"

import * as React from "react"
import { ChevronDownIcon, CopyIcon, ListIcon } from "lucide-react"

import {
  CopyArticleMenuItems,
  getShareTargets,
} from "@/components/blog/article-actions"
import { getTocItems, type TocEntry } from "@/components/blog/table-of-contents"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// İçindekiler açılır penceresi. Masaüstü içindekiler listesiyle aynı görünüm
// (kenar çizgisi + girinti hiyerarşisi) ama aktif başlık göstergesi yok; bir
// başlığa dokununca o başlığa kaydırır ve pencereyi kapatır.
function TocMenu({ toc }: { toc: TocEntry[] }) {
  const [open, setOpen] = React.useState(false)
  const items = React.useMemo(() => getTocItems(toc), [toc])

  const handleClick = (id: string) => (event: React.MouseEvent) => {
    event.preventDefault()
    if (!document.getElementById(id)) return
    window.history.replaceState(null, "", `#${id}`)
    // Önce pencereyi kapat, sonra kaydır. Popover kapanırken odağı tetikleyici
    // düğmeye geri verip onu görünür kılmak için sayfayı yukarı çekiyor; bu da
    // smooth scroll'u yarıda kesiyordu. Kaydırmayı bir frame sonraya bırakıyoruz
    // (onCloseAutoFocus preventDefault ile odak kaynaklı kaydırma da engellendi).
    setOpen(false)
    requestAnimationFrame(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ListIcon className="size-3.5" />
          İçindekiler
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="cn-scrollbar-thin max-h-[min(60vh,24rem)] w-64 gap-0 overflow-y-auto p-2"
      >
        <nav aria-label="İçindekiler">
          <ul className="flex flex-col">
            {items.map((item) => {
              const id = item.url.slice(1)
              return (
                <li key={item.url}>
                  <a
                    href={item.url}
                    onClick={handleClick(id)}
                    style={{ paddingLeft: 8 + item.depth * 14 }}
                    className="block rounded-md py-1.5 pr-2 text-sm leading-snug text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {item.title}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
      </PopoverContent>
    </Popover>
  )
}

// Makaleyi kopyala açılır menüsü. Düğme masaüstündeki split-button ile birebir
// aynı; yalnız etiket "Kopyala". Menü öğeleri masaüstü menüsüyle paylaşılır.
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
        <Button variant="outline" size="sm" className="justify-between gap-0 px-0">
          <span className="flex items-center gap-1.5 pr-2 pl-2.5">
            <CopyIcon className="size-3.5" />
            Kopyala
          </span>
          <span className="flex items-center self-stretch border-l border-border px-1.5">
            <ChevronDownIcon className="size-3.5 transition-transform group-aria-expanded/button:rotate-180" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <CopyArticleMenuItems
          markdown={markdown}
          markdownUrl={markdownUrl}
          title={title}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Mobil/tablet'te (lg altı) başlık ile içerik arasına gelen yatay eylem satırı.
// Solda İçindekiler + Kopyala (açılır menüler), sağda paylaş düğmeleri (doğrudan
// bağlantı). Gruplar kendi içinde boşluklu; masaüstünde kenar çubuğu kullanıldığı
// için satır gizli (lg:hidden).
export function MobileArticleBar({
  toc,
  markdown,
  markdownUrl,
  pageUrl,
  title,
  className,
}: {
  toc: TocEntry[]
  markdown: string
  markdownUrl: string
  pageUrl: string
  title: string
  className?: string
}) {
  const hasToc = getTocItems(toc).length >= 2
  const shareTargets = getShareTargets(pageUrl, title)

  return (
    <div className={cn("flex items-center justify-between gap-2 lg:hidden", className)}>
      <div className="flex items-center gap-1.5">
        {hasToc ? <TocMenu toc={toc} /> : null}
        <CopyMenu markdown={markdown} markdownUrl={markdownUrl} title={title} />
      </div>

      <div className="flex items-center gap-1.5">
        {shareTargets.map((target) => (
          <Button
            key={target.label}
            asChild
            variant="outline"
            size="icon-sm"
            aria-label={target.label}
          >
            <a href={target.href} target="_blank" rel="noopener noreferrer">
              <target.icon className="size-3.5" />
            </a>
          </Button>
        ))}
      </div>
    </div>
  )
}
