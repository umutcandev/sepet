"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  deleteConversation,
  renameConversation,
} from "@/lib/actions/conversations"

export type ConversationTarget = {
  id: string
  title: string
}

export function ConversationRenameDialog({
  target,
  onClose,
}: {
  target: ConversationTarget | null
  onClose: () => void
}) {
  const [value, setValue] = React.useState("")
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    // Dialog re-opens with a different target — reset editable value to its title.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(target?.title ?? "")
  }, [target])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!target) return
    const trimmed = value.trim()
    if (!trimmed) return
    setPending(true)
    try {
      await renameConversation(target.id, trimmed)
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Sohbet yeniden adlandırılamadı.",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Sohbeti yeniden adlandır</DialogTitle>
            <DialogDescription>
              Bu sohbet için yeni bir başlık gir.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={100}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={pending || !value.trim()}>
              {pending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ConversationDeleteDialog({
  target,
  activeId,
  onClose,
}: {
  target: ConversationTarget | null
  activeId: string | null
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  const handleConfirm = async () => {
    if (!target) return
    setPending(true)
    try {
      await deleteConversation(target.id)
      if (target.id === activeId) {
        router.push("/asistan")
      }
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Sohbet silinemedi.",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sohbet silinsin mi?</AlertDialogTitle>
          <AlertDialogDescription>
            “{target?.title}” başlıklı sohbet ve tüm mesajları kalıcı olarak silinecek.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? "Siliniyor..." : "Sil"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
