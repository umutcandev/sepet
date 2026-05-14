"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { MessageSquareIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  deleteConversation,
  renameConversation,
} from "@/lib/actions/conversations"

export type ConversationListItem = {
  id: string
  title: string
  updatedAt: Date | string
}

type Props = {
  conversations: ConversationListItem[]
}

export function AssistantConversationsGroup({ conversations }: Props) {
  const params = useParams<{ id?: string }>()
  const activeId = typeof params?.id === "string" ? params.id : null
  const { isMobile, setOpenMobile } = useSidebar()

  const [renameTarget, setRenameTarget] = React.useState<ConversationListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ConversationListItem | null>(null)

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  if (conversations.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Geçmiş Sohbetler</SidebarGroupLabel>
        <SidebarGroupContent>
          <p className="px-2 py-1 text-xs text-muted-foreground">
            Henüz sohbetin yok.
          </p>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Geçmiş Sohbetler</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {conversations.map((c) => {
              const isActive = c.id === activeId
              return (
                <SidebarMenuItem key={c.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={c.title}
                  >
                    <Link
                      href={`/assistant/${c.id}`}
                      onClick={handleNavClick}
                    >
                      <MessageSquareIcon />
                      <span className="truncate">{c.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction showOnHover>
                        <MoreHorizontalIcon />
                        <span className="sr-only">Daha fazla</span>
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side={isMobile ? "bottom" : "right"}
                      align="start"
                    >
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault()
                          setRenameTarget(c)
                        }}
                      >
                        <PencilIcon className="mr-2 size-4" />
                        Yeniden adlandır
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={(e) => {
                          e.preventDefault()
                          setDeleteTarget(c)
                        }}
                      >
                        <Trash2Icon className="mr-2 size-4" />
                        Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <RenameDialog
        target={renameTarget}
        onClose={() => setRenameTarget(null)}
      />
      <DeleteDialog
        target={deleteTarget}
        activeId={activeId}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}

function RenameDialog({
  target,
  onClose,
}: {
  target: ConversationListItem | null
  onClose: () => void
}) {
  const [value, setValue] = React.useState("")
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
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

function DeleteDialog({
  target,
  activeId,
  onClose,
}: {
  target: ConversationListItem | null
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
        router.push("/assistant")
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
