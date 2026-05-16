"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon, Trash2Icon } from "lucide-react"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { deleteBasket } from "@/lib/actions/baskets"

export function DeleteBasketButton({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)

  async function handleDelete() {
    setBusy(true)
    try {
      await deleteBasket(id)
      toast.success("Sepet silindi.")
      router.push("/sepetlerim")
      router.refresh()
    } catch (err) {
      console.error("[DeleteBasketButton] failed", err)
      toast.error("Sepet silinemedi.")
      setBusy(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive">
          <Trash2Icon className="mr-1 size-4" /> Sepeti sil
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sepeti silmek istediğine emin misin?</AlertDialogTitle>
          <AlertDialogDescription>
            Sepet ve içindeki kalemler kalıcı olarak silinecek. Bu işlem geri
            alınamaz.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? (
              <>
                <Loader2Icon className="mr-1 size-3.5 animate-spin" />
                Siliniyor…
              </>
            ) : (
              "Sil"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
