"use client"

import { RiCheckboxLine, RiDeleteBinLine, RiMoreLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Sepetlerim / Fişlerim satırlarının aksiyon menüsü (⋯).
 *
 * İki listede karakteri karakterine aynı iki kopya olarak duruyordu; aradaki
 * "bkz. diğer dosya" yorumu kopyayı belgeliyor ama tekilleştirmiyordu — ve
 * bu branch'in tamamı zaten `formatTL`, `RecordListCard`, `SaveRecordRow` gibi
 * ortak kaynakları teke indirmek üzerine kurulu.
 *
 * `RecordListCard`'ın `actions` yuvasına girer. `z-10`, satırın tamamını
 * kaplayan link overlay'inin üstünde kalması için (bkz. `RecordListCard`
 * içindeki `after:absolute after:inset-0`).
 */
export function RecordRowActions({
  label,
  onSelect,
  onDelete,
}: {
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
          <RiMoreLine className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            onSelect()
          }}
        >
          <RiCheckboxLine className="size-4" />
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
          <RiDeleteBinLine className="size-4" />
          Sil
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
