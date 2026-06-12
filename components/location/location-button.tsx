"use client"

import { MapIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useUserLocation } from "@/lib/stores/location"
import { locationDialog } from "@/lib/stores/location-dialog"
import { cn } from "@/lib/utils"

/**
 * Header'daki kalıcı konum giriş noktası. Kayıtlı adresin kısa halini gösterir,
 * tıklanınca konum modalını açar. Outline buton; mobilde etiket gizlenir ve
 * sağındaki theme butonuyla aynı kare ikon footprint'ine (size-7) düşer.
 */
export function LocationButton({ className }: { className?: string }) {
  const { location } = useUserLocation()
  const short = location?.label ? location.label.split(",")[0].trim() : "Konum seç"

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => locationDialog.open()}
      aria-label={location?.label ? `Konum: ${short}` : "Konum seç"}
      title={short}
      className={cn("w-7 px-0 sm:w-auto sm:gap-1.5 sm:px-2.5", className)}
    >
      <MapIcon className="size-4" />
      <span className="hidden max-w-[160px] truncate sm:inline">{short}</span>
    </Button>
  )
}
