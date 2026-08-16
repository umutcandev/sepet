"use client"

import { MoreHorizontalIcon, CheckSquareIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Sepet/fiş listelerindeki satır aksiyonları (⋯).
 *
 * Hem masaüstü tablosunda hem mobil kart listesinde, hem sepetlerde hem
 * fişlerde aynı menü. Dört yerde birebir kopya olarak duruyordu; `Seç`/`Sil`
 * dışında hiçbir farkı olmayan bir menünün dört ayrı kopyasında ilerde
 * kaçınılmaz olarak biri geride kalırdı.
 *
 * `z-10`: satırın tamamını kaplayan link overlay'inin (`after:absolute
 * after:inset-0`) üstünde kalmalı, yoksa menü tıklanamaz.
 * `after:-inset-2`: 24px'lik tetikleyiciyi dokunma hedefi eşiğine çıkarır.
 */
export function RecordRowActions({
  label,
  onSelect,
  onDelete,
}: {
  /** Ekran okuyucu etiketi, ör. "Sepet eylemleri". */
  label: string
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          className="relative z-10 text-muted-foreground after:absolute after:-inset-2"
        >
          <MoreHorizontalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            onSelect()
          }}
        >
          <CheckSquareIcon className="size-4" />
          Seç
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(e) => {
            e.preventDefault()
            onDelete()
          }}
        >
          <Trash2Icon className="size-4" />
          Sil
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
