"use client"

import * as React from "react"
import Link from "next/link"
import {
  RiDeleteBinLine,
  RiLoader4Line,
  RiMoreFill,
  RiShareBoxLine,
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
 * Kayıt detay aksiyonları: mobilde tek ⋯ menüsü, md+ yan yana kompakt butonlar.
 * Silme onayı menünün içinden açıldığı için `onSelect` engellenir.
 */
export function RecordActionsMenu({
  links,
  deleteLabel,
  deleteTitle,
  deleteDescription,
  onDelete,
  onShare,
}: {
  links: RecordActionLink[]
  deleteLabel: string
  deleteTitle: string
  deleteDescription: string
  /** `true` = silindi (yönlendirme başlıyor), `false` = başarısız. */
  onDelete: () => Promise<boolean>
  /** Paylaşım penceresini açar. */
  onShare?: () => void
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  async function handleDelete() {
    setBusy(true)
    const ok = await onDelete()
    // Başarılıysa sayfa değişiyor; "Siliniyor…" geri dönmemeli.
    if (!ok) {
      setBusy(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <div className="hidden items-center gap-1.5 md:flex">
        {links.map((link) => (
          <Button
            key={link.href}
            asChild
            variant="outline"
            size="sm"
            title={link.hint ?? undefined}
          >
            <Link href={link.href}>
              {link.icon}
              {link.label}
            </Link>
          </Button>
        ))}
        {onShare ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            aria-haspopup="dialog"
          >
            <RiShareBoxLine />
            Paylaş
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirmOpen(true)}
        >
          <RiDeleteBinLine />
          {deleteLabel}
        </Button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon-sm"
            className="md:hidden"
            aria-label="İşlem yapın"
          >
            <RiMoreFill className="size-4" />
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
          {onShare ? (
            <DropdownMenuItem onSelect={onShare}>
              <RiShareBoxLine className="size-4" />
              Paylaş
            </DropdownMenuItem>
          ) : null}
          {links.length > 0 || onShare ? <DropdownMenuSeparator /> : null}
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
