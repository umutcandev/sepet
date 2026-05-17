"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
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
import { assistantConversations } from "@/lib/stores/assistant-conversations"
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
  const params = useParams<{ id?: string }>()
  const activeId = typeof params?.id === "string" ? params.id : null
  const { isMobile, setOpenMobile } = useSidebar()

  // Sidebar listesini lokal state'te tutuyoruz: navigasyonda parent yeni
  // server data ile bizi re-render eder (prop sync); stream/dialog
  // mutasyonları ise store üzerinden inject edilir. router.refresh() yok —
  // o, /asistan ↔ /asistan/[id] segment swap'ı yüzünden AssistantChat'i
  // remount edip StickToBottom'ın "yukarıdan aşağı" smooth scroll'unu
  // tetikliyordu.
  // Render-phase sync: parent prop'u değişirse (sayfa değişimi / cold load)
  // lokal state'i yenile. React'in resmi pattern'ı; useEffect'siz sync için
  // tek render fazlası harcar — bkz. react.dev "storing information from
  // previous renders".
  const [list, setList] = React.useState<ConversationListItem[]>(conversations)
  const [lastProp, setLastProp] = React.useState(conversations)
  if (lastProp !== conversations) {
    setLastProp(conversations)
    setList(conversations)
  }

  // Mid-stream / dialog mutasyonlarını uygula.
  React.useEffect(() => {
    return assistantConversations.subscribe((mutator) => {
      setList((current) => mutator(current))
    })
  }, [])

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
