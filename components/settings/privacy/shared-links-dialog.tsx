"use client"

import * as React from "react"
import {
  RiDeleteBinLine,
  RiExternalLinkLine,
  RiFileCopyLine,
} from "@remixicon/react"

import { toast } from "@/components/ui/sonner"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  listConversationShares,
  unshareAllConversations,
  unshareConversation,
  type SharedLinkItem,
} from "@/lib/actions/conversation-shares"
import { copyText } from "@/lib/copy"

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" })

function shareUrl(token: string): string {
  return `${window.location.origin}/paylasim/${token}`
}

/**
 * Ayarlar → Gizlilik → Paylaşılan bağlantılar. Herkese açık her bağlantıyı
 * tek yerden görüp kaldırmak için: sohbeti tek tek açıp aramak gerekmesin.
 */
export function SharedLinksDialog() {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<SharedLinkItem[] | null>(null)
  // Aynı anda birden çok satır kaldırılıyor olabilir.
  const [pending, setPending] = React.useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [confirmAll, setConfirmAll] = React.useState(false)
  const [clearing, setClearing] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- her açılışta liste sunucudan tazelenir
    setItems(null)
    listConversationShares()
      .then((rows) => {
        if (!cancelled) setItems(rows)
      })
      .catch(() => {
        if (!cancelled) {
          setItems([])
          toast.error("Paylaşılan bağlantılar yüklenemedi.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [open])

  async function revoke(item: SharedLinkItem) {
    const id = item.conversationId
    setPending((p) => new Set(p).add(id))
    try {
      const res = await unshareConversation(item.conversationId)
      if (!res.ok) throw new Error(res.error)
      setItems((list) =>
        list
          ? list.filter((i) => i.conversationId !== item.conversationId)
          : list
      )
      toast.success("Bağlantı kaldırıldı.")
    } catch {
      toast.error("Bağlantı kaldırılamadı. Lütfen tekrar dene.")
    } finally {
      setPending((p) => {
        const next = new Set(p)
        next.delete(id)
        return next
      })
    }
  }

  async function revokeAll() {
    setClearing(true)
    try {
      const res = await unshareAllConversations()
      if (!res.ok) throw new Error(res.error)
      setItems([])
      setConfirmAll(false)
      toast.success(
        res.deleted > 0
          ? `${res.deleted} bağlantı kaldırıldı.`
          : "Kaldırılacak bağlantı yok."
      )
    } catch {
      toast.error("Bağlantılar kaldırılamadı. Lütfen tekrar dene.")
    } finally {
      setClearing(false)
    }
  }

  async function copy(item: SharedLinkItem) {
    if (await copyText(shareUrl(item.token))) {
      toast.success("Bağlantı kopyalandı.")
    } else {
      toast.error("Bağlantı kopyalanamadı.")
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Yönet
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Paylaşılan bağlantılar</DialogTitle>
            <DialogDescription>
              Bağlantısı olan herkesin görebildiği sohbetlerin. Kaldırdığın
              bağlantı anında çalışmaz olur.
            </DialogDescription>
          </DialogHeader>

          {/* Kenardan kenara liste; alt kenarı footer şeridinin üst çizgisi. */}
          <div className="-mx-4 -mb-4 max-h-[55vh] overflow-y-auto border-t">
            {items === null ? (
              <div className="grid gap-3 p-4" aria-busy="true">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Paylaştığın bir sohbet yok.
              </p>
            ) : (
              <ul className="divide-y">
                {items.map((item) => (
                  <li
                    key={item.conversationId}
                    className="flex items-center gap-2 px-4 py-2.5"
                  >
                    <div className="grid min-w-0 flex-1 gap-0.5">
                      <a
                        href={shareUrl(item.token)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-medium underline-offset-2 hover:underline"
                      >
                        {item.title}
                      </a>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {dateFormat.format(new Date(item.sharedAt))}
                        {item.anonymous ? (
                          <Badge
                            variant="secondary"
                            className="h-4 px-1.5 text-[0.625rem]"
                          >
                            Anonim
                          </Badge>
                        ) : null}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${item.title} bağlantısını kopyala`}
                      onClick={() => void copy(item)}
                    >
                      <RiFileCopyLine />
                    </Button>
                    <Button variant="ghost" size="icon-sm" asChild>
                      <a
                        href={shareUrl(item.token)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${item.title} sayfasını aç`}
                      >
                        <RiExternalLinkLine />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="hover:text-destructive"
                      aria-label={`${item.title} bağlantısını kaldır`}
                      disabled={pending.has(item.conversationId)}
                      onClick={() => void revoke(item)}
                    >
                      <RiDeleteBinLine />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="destructive"
              size="sm"
              disabled={!items || items.length === 0}
              onClick={() => setConfirmAll(true)}
            >
              Tümünü kaldır
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmAll}
        onOpenChange={(o) => !clearing && setConfirmAll(o)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tüm bağlantıları kaldır</AlertDialogTitle>
            <AlertDialogDescription>
              Paylaştığın tüm sohbet bağlantıları çalışmaz olur. Sohbetlerin
              silinmez; istersen yeniden paylaşabilirsin, yeni bir bağlantıyla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={clearing}
              onClick={(e) => {
                e.preventDefault()
                void revokeAll()
              }}
            >
              {clearing ? "Kaldırılıyor…" : "Tümünü kaldır"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
