"use client"

import * as React from "react"
import Link from "next/link"
import {
  RiArrowDownSLine,
  RiDeleteBinLine,
  RiLoader4Line,
} from "@remixicon/react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type RecordActionLink = {
  label: string
  href: string
  icon: React.ReactNode
  /** Etiketin altında sessiz tonda görünen gerekçe ("Fiyatlar 9 gün önce alındı"). */
  hint?: string | null
}

/**
 * Kayıt detay sayfalarının tek aksiyon girişi.
 *
 * Aksiyonlar üç ayrı yere dağılmıştı: sol üstte geri bağlantısı, sağ üstte
 * ghost bir "sil", başlığın yanında sohbet ve yenileme butonları. Üç farklı
 * hizada üç farklı ağırlık; dar ekranda hepsi başlığın payına giriyordu.
 * Hepsi tek bir "İşlem Yap" menüsünde toplandı — sayfanın sağ üstünde tek,
 * dar ve sabit genişlikli bir hedef.
 *
 * Silme onayı menünün İÇİNDEN açılır: `onSelect` engellenmezse Radix menüyü
 * kapatırken diyaloğu da beraberinde götürür.
 */
export function RecordActionsMenu({
  links,
  deleteLabel,
  deleteTitle,
  deleteDescription,
  onDelete,
}: {
  links: RecordActionLink[]
  deleteLabel: string
  deleteTitle: string
  deleteDescription: string
  /** `true` = silindi (yönlendirme başlıyor), `false` = başarısız. */
  onDelete: () => Promise<boolean>
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  async function handleDelete() {
    setBusy(true)
    const ok = await onDelete()
    // Başarılıysa sayfa değişiyor; bileşeni eski haline döndürmenin anlamı yok
    // ve "Siliniyor…" yazısının geri dönmesi yanlış sinyal verir.
    if (!ok) {
      setBusy(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            İşlem Yapın
            <RiArrowDownSLine className="ml-1.5 size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          {links.map((link) => (
            <DropdownMenuItem key={link.href} asChild>
              <Link href={link.href}>
                {link.icon}
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{link.label}</span>
                  {link.hint ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {link.hint}
                    </span>
                  ) : null}
                </span>
              </Link>
            </DropdownMenuItem>
          ))}
          {links.length > 0 ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault()
              setConfirmOpen(true)
            }}
          >
            <RiDeleteBinLine className="size-4" />
            {deleteLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirmOpen(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? (
                <>
                  <RiLoader4Line className="mr-1 size-3.5 animate-spin" />
                  Siliniyor…
                </>
              ) : (
                "Sil"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
