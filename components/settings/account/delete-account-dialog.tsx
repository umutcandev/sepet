"use client"

import * as React from "react"

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
import { archiveAccount } from "@/lib/actions/profile"

// "Hesabımı sil" → arşivleme onayı. Onaylanınca archiveAccount hesabı arşivler,
// oturumları kapatır ve çıkış yaptırır (signOut redirect). 14 gün içinde tekrar
// giriş yapılmazsa veriler kalıcı silinir.
export function DeleteAccountDialog() {
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  async function confirm() {
    setBusy(true)
    try {
      await archiveAccount()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Hesabımı sil
      </Button>
      <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hesabını silmek istediğine emin misin?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Hesabın arşivlenecek ve tüm oturumların kapatılacak. 14 gün içinde
              tekrar giriş yapmazsan sepetlerin, fişlerin ve sohbetlerin kalıcı
              olarak silinir. Bu süre içinde giriş yaparsan hesabın geri açılır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault()
                void confirm()
              }}
            >
              {busy ? "Siliniyor…" : "Hesabımı sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
