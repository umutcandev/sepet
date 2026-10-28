import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Uygulamanın TEK kart kabuğu: sohbet kartları (sepet, fiş, eşleşmeler,
 * özet), kayıt sayfaları (sepet/fiş detayı, bilgi kartları, listeler) ve
 * iskeletleri. Eskiden üç ayrı biçimde yazılıyordu: sohbette Squircle + iç
 * halka (yedi kopya, her birinde aynı uzun gerekçe), kayıt sayfalarında
 * `rounded-xl border bg-card` (on beş kopya), bu dosyada ise hiç kullanılmayan
 * üçüncü bir dış gölgeli sürüm.
 *
 * Kenar `smooth-shadow-ring-sm`: ana sayfadaki özellik ve fiyatlandırma
 * kartlarıyla AYNI reçete. Halka gölgenin son katmanı, rengi `--border`
 * (globals.css, `--smooth-ring-color`), yani içteki satır/başlık çizgileriyle
 * aynı renk. Ayrıca `border` VERME, halka zaten içinde; ikisi çift kenar çizer.
 *
 * Eskiden düz `border` idi, gerekçesi kırpılmaydı: kart `overflow-hidden` bir
 * sütunun (sohbet sütunu, mesaj içeriği) kenarına yaslandığında dış halka ve
 * gölge düz kesiliyordu. Bu artık kabın işi: sohbet kaydırma kabı yanlarda
 * gölge payı bırakıyor, asistan mesaj içeriği kırpmıyor (bkz.
 * ai-elements/conversation.tsx ve message.tsx). Kartı başka bir kırpan kabın
 * kenarına koyuyorsan orada da pay bırak.
 *
 * Squircle (clip-path) KULLANILMAZ. Kullanılan eğri bu yarıçapta
 * `border-radius`tan piksel altı sapıyor (bkz. squircle.tsx), ama clip-path
 * kartın kendi odak çerçevesini (ör. liste kartının `outline`ı) siliyor ve
 * gölgeyi göstermek için `effects` (kart başına SVG + sarmalayıcı div)
 * gerektiriyor. Dokunmatik cihazlarda Squircle zaten düz `border-radius`;
 * ana sayfa kartları telefonda bugün de tam olarak bu CSS ile çiziliyor.
 */
function Card({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="card"
      className={cn(
        "overflow-hidden rounded-xl bg-card text-card-foreground smooth-shadow-ring-sm",
        className
      )}
      {...props}
    />
  )
}

/** Başlık şeridi: her kartta aynı ritim (`min-h-12`), alt çizgiyle ayrılır. */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex min-h-12 flex-wrap items-center gap-2 border-b px-4 py-2",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  )
}

/** Eylem şeridi (Onayla / İptal / Yeni kalem): sessiz zemin, üst çizgi. */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex flex-wrap items-center gap-2 border-t bg-muted/30 px-4 py-3",
        className
      )}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardFooter }
