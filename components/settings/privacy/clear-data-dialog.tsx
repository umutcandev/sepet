"use client"

import * as React from "react"
import { toast } from "sonner"

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
  clearAllBaskets,
  clearAllConversations,
  clearAllReceipts,
} from "@/lib/actions/privacy"

type Kind = "conversations" | "baskets" | "receipts"

const CONFIG: Record<
  Kind,
  {
    title: string
    description: string
    noun: string
    action: () => Promise<{ deleted: number }>
  }
> = {
  conversations: {
    title: "Tüm sohbetleri sil",
    description:
      "Tüm asistan sohbet geçmişin ve mesajların kalıcı olarak silinir. Bu işlem geri alınamaz.",
    noun: "sohbet",
    action: clearAllConversations,
  },
  baskets: {
    title: "Tüm sepetleri sil",
    description:
      "Kayıtlı tüm sepetlerin ve içindeki ürünler kalıcı olarak silinir. Bu işlem geri alınamaz.",
    noun: "sepet",
    action: clearAllBaskets,
  },
  receipts: {
    title: "Tüm fişleri sil",
    description:
      "Tüm fişlerin, kalemleri ve yüklediğin fiş görselleri kalıcı olarak silinir. Bu işlem geri alınamaz.",
    noun: "fiş",
    action: clearAllReceipts,
  },
}

export function ClearDataDialog({ kind }: { kind: Kind }) {
  const cfg = CONFIG[kind]
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  async function confirm() {
    setBusy(true)
    try {
      const { deleted } = await cfg.action()
      toast.success(
        deleted > 0
          ? `${deleted} ${cfg.noun} silindi`
          : `Silinecek ${cfg.noun} bulunamadı`,
      )
      setOpen(false)
    } catch {
      toast.error("Silme işlemi başarısız oldu")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Sil
      </Button>
      <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{cfg.title}</AlertDialogTitle>
            <AlertDialogDescription>{cfg.description}</AlertDialogDescription>
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
              {busy ? "Siliniyor…" : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
