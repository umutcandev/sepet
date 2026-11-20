"use client"

import { RiInformationLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { hasNationalPricing } from "@/lib/markets/registry"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

// Market adına ek getirilmez: ünlü uyumu ada göre değişir ("Migros'ta", "A101'de").
function describe(
  market: string | undefined,
  multiple: boolean,
  relocated: boolean,
): string {
  if (!market || !hasNationalPricing(market)) {
    return multiple
      ? "Bu markette fiyat şubeye göre değişebilir. Her ürün, fiyatının geçerli olduğu şubede."
      : "Bu markette fiyat şubeye göre değişebilir. Fiyat bu şubeden."
  }
  const base = `${market} fiyatları tüm şubelerde aynı.`
  if (multiple) {
    return `${base} Kampanyası tek şubede geçerli ürün olduğu için rota o şubeye de uğruyor.`
  }
  return relocated ? `${base} Stok şubeye göre değişebilir.` : base
}

/**
 * Bir fiyatın hangi şubeden (depo) geldiğini gösteren küçük bilgi balonu.
 * Hover YOK — tıklanır popover (mobil + masaüstü aynı davranış). `depotName`
 * yoksa hiç render edilmez (eski kayıtlarda alan olmayabilir).
 */
export function DepotInfo({
  depotName,
  market,
  relocated = false,
}: {
  /**
   * Tek şube ya da bir marketin kalemlerinin şubeleri (Sepet Özeti'nde market
   * başına tek balon). Liste tekrarsızlaştırılır; boşsa balon yok.
   */
  depotName: string | null | undefined | ReadonlyArray<string | null | undefined>
  market?: string
  /** Kalemlerden biri başka şubeden bu şubeye toplandı: stok uyarısı eklenir. */
  relocated?: boolean
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
          {describe(market, names.length > 1, relocated)}
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  )
}
