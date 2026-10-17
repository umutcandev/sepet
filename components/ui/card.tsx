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
 * Kenar düz CSS `border`, dış gölge yok. Kart çoğu yerde `overflow-hidden`
 * bir sütunun içinde duruyor (sohbet sütunu, mesaj içeriği); dış halka ve
 * gölge orada sağdan/soldan/alttan düz kesiliyordu. Border kutunun içinde
 * kalır, hiçbir yerde kırpılmaz.
 *
 * Eskiden `inset-ring` (gölgeyle çizilen halka) idi. Telefonda (2,625x) halka
 * kenar yumuşatmasıyla ~3 cihaz pikseline yayılırken kartın içindeki satır ve
 * başlık çizgileri (`border`) 2 piksele oturuyordu: dış kenar, içteki
 * çizgilerden belirgin kalın görünüyordu. Hepsi aynı ilkel olunca her
 * yoğunlukta aynı kalınlıkta çizilir. Renk `--border`, içteki çizgilerle aynı.
 *
 * Squircle (clip-path) KULLANILMAZ. Kullanılan eğri bu yarıçapta
 * `border-radius`tan piksel altı sapıyor (bkz. squircle.tsx), ama clip-path
 * kartın kendi odak çerçevesini (ör. liste kartının `outline`ı) siliyor.
 * Görünür bir squircle istenirse değişiklik yalnız burada yapılır.
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
        "overflow-hidden rounded-xl border bg-card text-card-foreground",
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
