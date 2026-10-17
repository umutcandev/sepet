"use client"

import { RiInformationLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

/**
 * Bir fiyatın hangi şubeden (depo) indekslendiğini gösteren küçük bilgi balonu.
 * Hover YOK — tıklanır popover (mobil + masaüstü aynı davranış). `depotName`
 * yoksa hiç render edilmez (eski kayıtlarda alan olmayabilir).
 *
 * Dil bilinçli: "buraya git" değil "fiyat kaynağı". marketfiyati her zincir için
 * ürünü indeksleyen en yakın/temsilci şubeyi döndürür; zincir indirim
 * marketlerinde (BİM/A101/ŞOK) fiyat çoğunlukla ülke geneli aynı olduğundan şube
 * adı yalnızca şeffaflık/bilgi amaçlıdır, "tam bu mağazaya git" demek değildir.
 */
export function DepotInfo({
  depotName,
  market,
}: {
  /**
   * Tek şube ya da bir marketin kalemlerinin şubeleri (Sepet Özeti'nde market
   * başına tek balon). Liste tekrarsızlaştırılır; boşsa balon yok.
   */
  depotName: string | null | undefined | ReadonlyArray<string | null | undefined>
  market?: string
}) {
  const names = [
    ...new Set(
      (Array.isArray(depotName) ? depotName : [depotName]).filter(
        (n): n is string => !!n,
      ),
    ),
  ]
  if (names.length === 0) return null
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-2xs"
          // Görünen daire 16px kalıyor ama tıklama alanı 32px'e açılıyor
          // (WCAG 2.5.8 tabanı 24px).
          hitArea
          aria-label={
            names.length > 1 ? "Fiyatların alındığı şubeler" : "Fiyatın alındığı şube"
          }
          onClick={(e) => e.stopPropagation()}
        >
          <RiInformationLine />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        onClick={(e) => e.stopPropagation()}
        className="w-56 gap-1 p-3"
      >
        <PopoverTitle className="text-xs">
          {names.map((n, i) => (
            <span key={n}>
              {i > 0 ? ", " : null}
              <b>{n}</b>
            </span>
          ))}
          {market ? ` (${market})` : ""}
        </PopoverTitle>
        <PopoverDescription className="text-[0.625rem] text-muted-foreground/70">
          Yakınındaki şubeler arasından seçildi. Zincir marketlerde fiyat
          çoğunlukla ülke geneli aynıdır.
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  )
}
