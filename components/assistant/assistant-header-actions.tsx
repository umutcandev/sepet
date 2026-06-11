"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  ChevronDownIcon,
  PencilIcon,
  StarIcon,
  StarOffIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ConversationDeleteDialog,
  ConversationRenameDialog,
  type ConversationTarget,
} from "@/components/assistant/conversation-action-dialogs"
import { setConversationStarred } from "@/lib/actions/conversations"
import {
  assistantConversations,
  useAssistantConversations,
} from "@/lib/stores/assistant-conversations"
import type { ConversationListItem } from "@/components/assistant/assistant-conversations-group"

type Props = {
  conversationId: string
  title: string
}

// Hidrasyondan önce store boş; stabil referans, useSyncExternalStore'un
// getSnapshot'ını her render'da yeniden oluşturmamak için modül seviyesinde.
const EMPTY: ConversationListItem[] = []

export function AssistantHeaderActions({ conversationId, title }: Props) {
  const [renameOpen, setRenameOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  // Yıldız durumunu sidebar ile aynı store'dan oku; iki yer de senkron kalır.
  const list = useAssistantConversations(EMPTY)
  const starred =
    list.find((c) => c.id === conversationId)?.starred ?? false

  // Yıldız aç/kapa — store'da optimistik güncelle, server başarısız olursa
  // geri al. Sıralamayı (updatedAt) değiştirmez.
  const handleToggleStar = React.useCallback(async () => {
    const next = !starred
    assistantConversations.setStarred(conversationId, next)
    try {
      await setConversationStarred(conversationId, next)
    } catch {
      assistantConversations.setStarred(conversationId, !next)
      toast.error("İşlem başarısız oldu, tekrar dene.")
    }
  }, [conversationId, starred])

  const target: ConversationTarget = { id: conversationId, title }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="ml-1 size-6 text-muted-foreground hover:text-foreground"
            aria-label="Sohbet eylemleri"
          >
            <ChevronDownIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-auto min-w-40">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              void handleToggleStar()
            }}
          >
            {starred ? (
              <>
                <StarOffIcon className="mr-2 size-4" />
                Favorilerden çıkar
              </>
            ) : (
              <>
                <StarIcon className="mr-2 size-4" />
                Favorilere ekle
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              setRenameOpen(true)
            }}
          >
            <PencilIcon className="mr-2 size-4" />
            Yeniden adlandır
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault()
              setDeleteOpen(true)
            }}
          >
            <Trash2Icon className="mr-2 size-4" />
            Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConversationRenameDialog
        target={renameOpen ? target : null}
        onClose={() => setRenameOpen(false)}
      />
      <ConversationDeleteDialog
        target={deleteOpen ? target : null}
        activeId={conversationId}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  )
}
