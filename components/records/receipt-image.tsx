"use client"

import * as React from "react"
import { RiArrowDownSLine, RiFullscreenLine } from "@remixicon/react"

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Fiş görseli.
 *
 * Önceden `max-h-[300px]` + `object-cover object-top` ile kesiliyordu: uzun bir
 * fişin alt yarısı görünmüyor, yakınlaştırma yok, tek çıkış yolu ham URL'yi yeni
 * sekmede açmaktı. Ayrıca mobilde ızgara tek kolona düştüğü için bu kırpılmış
 * görsel TÜM verinin üstünde duruyordu — kullanıcı önce yarım bir fiş fotoğrafı
 * görüyor, karşılaştırmayı görmek için kaydırıyordu.
 *
 * Artık: `object-contain` (kırpma yok), tıklayınca tam ekran görüntüleyici, ve
 * mobilde varsayılan kapalı katlanabilir bir bölüm — kalemler önce gelir.
 */
export function ReceiptImage({ url }: { url: string }) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {/* Kart başlığı diğer kartlarla aynı ritimde: `min-h-12 border-b px-4
          py-2 text-sm font-medium`. Mobilde ayrıca katlama düğmesi olur. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center gap-2 border-b px-4 py-2 text-left md:hidden"
      >
        <span className="text-sm font-medium">Fiş Görseli</span>
        <RiArrowDownSLine
          className={cn(
            "ml-auto size-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <div className="hidden min-h-12 items-center border-b px-4 py-2 text-sm font-medium md:flex">
        Fiş Görseli
      </div>

      <div className={cn("p-3 md:block", open ? "block" : "hidden")}>
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="group relative block w-full overflow-hidden rounded-lg bg-muted/30 outline outline-1 -outline-offset-1 outline-black/10 focus-visible:outline-2 focus-visible:outline-ring dark:outline-white/10"
              aria-label="Fişi tam ekran aç"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Fiş"
                className="block max-h-[240px] w-full object-contain"
              />
              <span className="pointer-events-none absolute right-2 top-2 flex size-7 items-center justify-center rounded-md bg-background/80 text-muted-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <RiFullscreenLine className="size-3.5" />
              </span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-[min(95vw,900px)] p-2 sm:p-3">
            <DialogTitle className="sr-only">Fiş görseli</DialogTitle>
            <div className="max-h-[85vh] overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Fiş"
                className="mx-auto block h-auto w-full object-contain"
              />
            </div>
            <div className="flex justify-end pt-1">
              <Button variant="ghost" size="sm" asChild>
                <a href={url} target="_blank" rel="noreferrer">
                  Yeni sekmede aç
                </a>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
