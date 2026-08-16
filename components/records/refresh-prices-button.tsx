"use client"

import Link from "next/link"
import { RefreshCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * "Fiyatları yenile" — kayıtlı sepeti aynı kalemlerle asistanda yeniden
 * hesaplatır. Kayıtlı sepeti ölü bir arşivden tekrar kullanılabilir bir listeye
 * çeviren şey bu, o yüzden sayfanın birincil aksiyonu.
 *
 * Fiyatların ne zaman alındığı bilgisi ayrı bir rozet olarak başlığa
 * yığılmıyor; butonun tooltip'inde duruyor — yenilemenin GEREKÇESİ zaten o.
 * `TooltipProvider` kök layout'ta.
 */
export function RefreshPricesButton({
  href,
  freshnessLabel,
  isStale,
}: {
  href: string
  /** "bugün" · "7 gün önce" — priceFreshness().ageLabel */
  freshnessLabel: string | null
  isStale: boolean
}) {
  const button = (
    <Button size="sm" asChild>
      <Link href={href}>
        <RefreshCwIcon className="mr-1.5 size-3.5" />
        Fiyatları yenile
      </Link>
    </Button>
  )

  if (!freshnessLabel) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>
        <p>
          Fiyatlar {freshnessLabel} alındı
          {isStale ? ", güncel olmayabilir." : "."}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
