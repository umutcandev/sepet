"use client"

import * as React from "react"
import {
  RiArrowDownSLine,
  RiFullscreenLine,
  RiImageLine,
} from "@remixicon/react"

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import { cn } from "@/lib/utils"

/** Paylaşılan fişte görsel gizliyken görselin yeri. */
export function ReceiptImageOmitted() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fiş Görseli</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <Marker>
          <MarkerIcon>
            <RiImageLine />
          </MarkerIcon>
          <MarkerContent>Fiş görseli gizlilik için paylaşılmadı</MarkerContent>
        </Marker>
      </CardContent>
    </Card>
  )
}

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
    <Card>
      {/* Mobilde başlık katlama düğmesi. */}
      <CardHeader asChild>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
        >
          {/* Düğme içinde blok öğe olmaz: başlık span. */}
          <CardTitle asChild>
            <span>Fiş Görseli</span>
          </CardTitle>
          <RiArrowDownSLine
            aria-hidden="true"
            className={cn(
              "ml-auto size-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </CardHeader>
      <CardHeader className="max-md:hidden">
        <CardTitle>Fiş Görseli</CardTitle>
      </CardHeader>

      <CardContent className={cn("p-3 md:block", open ? "block" : "hidden")}>
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="group relative block w-full overflow-hidden rounded-sm bg-muted/30 outline outline-1 -outline-offset-1 outline-black/10 focus-visible:outline-2 focus-visible:outline-ring dark:outline-white/10"
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
      </CardContent>
    </Card>
  )
}
