"use client"

import * as React from "react"
import { toast } from "@/components/ui/sonner"
import {
  RiArrowDownSLine,
  RiDeleteBinLine,
  RiPencilLine,
  RiShareBoxLine,
  RiStarLine,
  RiStarOffLine,
} from "@remixicon/react"

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
  type ConversationTarget,
} from "@/components/assistant/conversation-action-dialogs"
import { ShareConversationDialog } from "@/components/assistant/share-conversation-dialog"
import { setConversationStarred } from "@/lib/actions/conversations"
import {
  assistantConversations,
  useAssistantConversations,
} from "@/lib/stores/assistant-conversations"
import type { ConversationListItem } from "@/components/assistant/assistant-conversations-group"

type Props = {
  conversationId: string
  title: string
  /** "Yeniden adlandır": başlığı yerinde düzenlemeye açar (bkz. ConversationTitleEditor). */
  onRename: () => void
}

// Hidrasyondan önce store boş; stabil referans, useSyncExternalStore'un
// getSnapshot'ını her render'da yeniden oluşturmamak için modül seviyesinde.
const EMPTY: ConversationListItem[] = []

export function AssistantHeaderActions({
  conversationId,
  title,
  onRename,
}: Props) {
  // Menü kapanınca Radix odağı tetikleyiciye geri veriyor; yerinde düzenleme
  // açılırken bu, input'un odağını hemen çalardı.
  const renamingRef = React.useRef(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [shareOpen, setShareOpen] = React.useState(false)

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
            hitArea
              className="ml-1"
            aria-label="Sohbet eylemleri"
          >
            <RiArrowDownSLine className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        {/* Pencere açan öğelerde menü kapanır (preventDefault yok): açık
            tutulan menü pencere kapandıktan sonra da sayfanın üstünde açık
            kalıyor, dışına tıklanana kadar sayfayı kilitliyordu. Yalnızca
            yıldız menüde kalır, değişimi orada görünsün diye. */}
        <DropdownMenuContent
          align="start"
          className="w-auto min-w-40"
          onCloseAutoFocus={(e) => {
            if (!renamingRef.current) return
            renamingRef.current = false
            e.preventDefault()
            onRename()
          }}
        >
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              void handleToggleStar()
            }}
          >
            {starred ? (
              <>
                <RiStarOffLine className="size-4" />
                Favorilerden çıkar
              </>
            ) : (
              <>
                <RiStarLine className="size-4" />
                Favorilere ekle
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => (renamingRef.current = true)}>
            <RiPencilLine className="size-4" />
            Yeniden adlandır
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShareOpen(true)}>
            <RiShareBoxLine className="size-4" />
            Paylaş
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <RiDeleteBinLine className="size-4" />
            Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConversationDeleteDialog
        target={deleteOpen ? target : null}
        activeId={conversationId}
        onClose={() => setDeleteOpen(false)}
      />
      <ShareConversationDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        conversationId={conversationId}
        title={title}
      />
    </>
  )
}
