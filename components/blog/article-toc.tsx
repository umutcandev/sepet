"use client"

import * as React from "react"
import { RiArrowDownSLine } from "@remixicon/react"

import {
  getNumberedTocItems,
  getTocItems,
  type TocEntry,
} from "@/components/blog/table-of-contents"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Mobil/tablet'te (lg altı) yazının başında, kapağın hemen altında duran
// içindekiler bloğu. Çerçevesi yazıdaki kod bloklarıyla aynı aileden: yuvarlak
// kenar, hafif yüzey, üstte başlık şeridi. Başlıklar hiyerarşik numaralı
// (1, 1.1, 2 ...); şerit üzerindeki düğme bloğu katlar. Masaüstünde aynı liste
// kenar çubuğunda yapışkan durduğu için gizli.
export function ArticleToc({
  toc,
  className,
}: {
  toc: TocEntry[]
  className?: string
}) {
  const items = React.useMemo(() => getNumberedTocItems(toc), [toc])
  const [open, setOpen] = React.useState(true)
  const listId = React.useId()

  if (getTocItems(toc).length < 2) return null

  const handleClick = (id: string) => (event: React.MouseEvent) => {
    const el = document.getElementById(id)
    if (!el) return
    event.preventDefault()
    window.history.replaceState(null, "", `#${id}`)
    el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <nav
      aria-label="İçindekiler"
      className={cn(
        "overflow-hidden rounded-2xl bg-muted/45 smooth-shadow-ring-sm lg:hidden",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 bg-muted py-1.5 pr-1.5 pl-4 transition-[border-color]",
          open ? "border-b border-border" : "border-b border-transparent"
        )}
      >
        <p className="text-xs font-medium tracking-wider text-foreground uppercase">
          İçindekiler
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          hitArea
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={listId}
          aria-label={open ? "İçindekileri gizle" : "İçindekileri göster"}
          className="rounded-full"
        >
          <RiArrowDownSLine
            className={cn(
              "size-4 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* Yükseklik animasyonu grid satırıyla: 0fr ↔ 1fr, ölçüm gerektirmez.
          Kapalıyken liste odak sırasından da çıkar (inert). */}
      <div
        id={listId}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div inert={!open} className="min-h-0 overflow-hidden">
          <ol className="flex flex-col py-2">
            {items.map((item) => {
              const id = item.url.slice(1)
              const top = item.depth === 0
              return (
                <li key={item.url}>
                  <a
                    href={item.url}
                    onClick={handleClick(id)}
                    style={{ paddingLeft: 16 + item.depth * 22 }}
                    className={cn(
                      "flex gap-2.5 py-1.5 pr-4 leading-snug transition-colors hover:text-primary",
                      top
                        ? "text-sm font-medium text-foreground"
                        : "text-[0.8125rem] text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0 tabular-nums",
                        top
                          ? "min-w-5 text-primary"
                          : "min-w-7 text-muted-foreground/70"
                      )}
                    >
                      {item.number}
                    </span>
                    <span className="min-w-0">{item.title}</span>
                  </a>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </nav>
  )
}
