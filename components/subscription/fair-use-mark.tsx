"use client"

import Link from "next/link"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Mesafeli Satış Sözleşmesi'ndeki adil kullanım paragrafı (legal-content.tsx).
export const FAIR_USE_HREF = "/mesafeli-satis#adil-kullanim"

// "Sınırsız" yazan her yerin yanına konan * işareti.
// newTab: Ayarlar dialog'u URL'e bağlı değil, aynı sekmede sayfa arkada değişirdi.
export function FairUseMark({
  className,
  newTab,
}: {
  className?: string
  newTab?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={FAIR_USE_HREF}
          {...(newTab && { target: "_blank", rel: "noopener noreferrer" })}
          aria-label="Adil kullanım koşulu"
          className={cn(
            "relative ml-0.5 text-[0.9em] leading-none font-medium text-muted-foreground transition-colors after:absolute after:-inset-2 hover:text-foreground",
            className
          )}
        >
          *
        </Link>
      </TooltipTrigger>
      <TooltipContent>Adil kullanım koşulu geçerlidir</TooltipContent>
    </Tooltip>
  )
}
