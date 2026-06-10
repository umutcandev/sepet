"use client"

import { InfoIcon } from "lucide-react"
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
  depotName: string | null | undefined
  market?: string
}) {
  if (!depotName) return null
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Fiyatın alındığı şube"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
        >
          <InfoIcon className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        onClick={(e) => e.stopPropagation()}
        className="w-56 gap-1 p-3"
      >
        <PopoverTitle className="text-xs"><b>{depotName}</b> {market ? ` (${market})` : ""}</PopoverTitle>
        <PopoverDescription className="text-[10px] text-muted-foreground/70">
          Yakınındaki şubeler arasından seçildi. Zincir marketlerde fiyat
          çoğunlukla ülke geneli aynıdır.
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  )
}
