"use client"

import * as React from "react"
import { RiChat3Line } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  ShareDialog,
  type ShareDialogAdapter,
  type ShareDialogCopy,
} from "@/components/share/share-dialog"
import {
  getConversationShareStatus,
  setConversationShareAnonymous,
  setConversationShareHideImages,
  shareConversation,
  unshareConversation,
} from "@/lib/actions/conversation-shares"
import { sharePath } from "@/lib/share/paths"
import { useAssistantConversations } from "@/lib/stores/assistant-conversations"
import type { ConversationListItem } from "@/components/assistant/assistant-conversations-group"

const COPY: ShareDialogCopy = {
  title: "Sohbeti paylaş",
  // Görseller "Resimleri gizle"ye bağlı; şube adları hiçbir durumda paylaşılmaz.
  description:
    "Yalnızca şu ana kadarki mesajlar paylaşılır; şube adları paylaşılmaz.",
  errors: {
    not_found: "Bu sohbet bulunamadı.",
    empty: "Bu sohbette paylaşılacak bir mesaj yok.",
    too_large: "Bu sohbet paylaşmak için çok uzun.",
  },
  hideImagesLabel: "Resimleri gizle",
  rememberImageChoice: true,
  icon: RiChat3Line,
}

// Hidrasyondan önce store boş; stabil referans (bkz. assistant-header-actions).
const EMPTY: ConversationListItem[] = []

/**
 * Sohbet başlığının yanındaki "Paylaş". Masaüstünde header'ın sağında,
 * mobilde avatarın yerinde (avatar menüsü kenar çubuğunda da var).
 */
export function ShareConversationButton({
  conversationId,
  title,
  className,
}: {
  conversationId: string
  title: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        Paylaş
      </Button>
      <ShareConversationDialog
        open={open}
        onOpenChange={setOpen}
        conversationId={conversationId}
        title={title}
      />
    </>
  )
}

export function ShareConversationDialog({
  open,
  onOpenChange,
  conversationId,
  title,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: string
  title: string
}) {
  // Yanıt akarken kopya yarım bir turu yakalardı (kullanıcı mesajı kayıtlı,
  // cevap henüz değil).
  const list = useAssistantConversations(EMPTY)
  const streaming = list.some((c) => c.id === conversationId && c.streaming)

  const adapter = React.useMemo<ShareDialogAdapter>(
    () => ({
      target: { kind: "conversation", id: conversationId },
      status: () => getConversationShareStatus(conversationId),
      share: (opts) => shareConversation({ conversationId, ...opts }),
      setAnonymous: (anonymous) =>
        setConversationShareAnonymous({ conversationId, anonymous }),
      setHideImages: (hideImages) =>
        setConversationShareHideImages({ conversationId, hideImages }),
      revoke: () => unshareConversation(conversationId),
      path: (token) => sharePath("conversation", token),
    }),
    [conversationId]
  )

  return (
    <ShareDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      adapter={adapter}
      copy={COPY}
      // Sohbette görsel olup olmadığı mesajlar okunmadan bilinmez; kutu
      // hep görünür, görselsiz sohbette etkisizdir.
      hasImages
      blockedLabel={streaming ? "Yanıt tamamlanınca paylaşabilirsin" : null}
    />
  )
}
