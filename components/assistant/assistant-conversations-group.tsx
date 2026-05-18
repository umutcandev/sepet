"use client"

import * as React from "react"
import Link from "next/link"
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"

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
  ConversationDeleteDialog,
  ConversationRenameDialog,
} from "@/components/assistant/conversation-action-dialogs"
import { useAssistantConversations } from "@/lib/stores/assistant-conversations"
import { useAssistantTitle } from "@/lib/stores/assistant-title"
import { Skeleton } from "@/components/ui/skeleton"

function ConversationIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      opacity="0.5"
    >
      <circle
        cx="8"
        cy="8"
        r="7.25"
        stroke="currentColor"
        fill="none"
        strokeWidth="1.5"
        strokeDasharray="3 3.4"
      />
    </svg>
  )
}

export type ConversationListItem = {
  id: string
  title: string
  updatedAt: Date | string
  pending?: boolean
}

type Props = {
  conversations: ConversationListItem[]
}

export function AssistantConversationsGroup({ conversations }: Props) {
  // Aktif id'yi router'dan değil assistant-title store'undan okuyoruz:
  // AssistantChat yeni sohbet başlatınca URL'yi `window.history.replaceState`
  // ile değiştiriyor (SSE stream'ini koparmamak için) → Next router bunu
  // görmediğinden `useParams().id` undefined kalıyor. Store, conversationId'yi
  // stream'in `data-conversation-id` event'inde ve sayfa cold-load'da
  // güncelliyor; replaceState URL'leriyle de uyumlu.
  const { conversationId } = useAssistantTitle()
  const activeId = conversationId
  const { isMobile, setOpenMobile } = useSidebar()

  // Stateful store. Mobilde sidebar `Sheet` içinde, kapalıyken DOM'dan
  // unmount oluyor → subscribe da unmount oluyor. Mutasyonları store kendisi
  // tutuyor (listener yokken state hâlâ güncelleniyor), sidebar tekrar
  // açıldığında snapshot olduğu gibi okunuyor. Hidrasyon AppShell
  // useEffect'inde yapılıyor — bkz. app-shell.tsx.
  const list = useAssistantConversations(conversations)

  const [renameTarget, setRenameTarget] = React.useState<ConversationListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ConversationListItem | null>(null)

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  if (list.length === 0) {
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
            {list.map((c) => {
              const isActive = c.id === activeId
              return (
                <SidebarMenuItem key={c.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={c.pending ? undefined : c.title}
                  >
                    <Link
                      href={`/asistan/${c.id}`}
                      onClick={handleNavClick}
                    >
                      <ConversationIcon />
                      {c.pending ? (
                        <Skeleton className="h-4 w-32" />
                      ) : (
                        <span className="truncate">{c.title}</span>
                      )}
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
                      className="w-auto min-w-40"
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

      <ConversationRenameDialog
        target={renameTarget}
        onClose={() => setRenameTarget(null)}
      />
      <ConversationDeleteDialog
        target={deleteTarget}
        activeId={activeId}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}
