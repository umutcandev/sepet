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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DEFAULT_CONVERSATION_STATUS,
  type ConversationStatus,
} from "@/lib/assistant/conversation-status"
import { cn } from "@/lib/utils"

// "Onay bekliyor" — kullanıcının bir aksiyonunu (Onayla) bekleyen, henüz
// tamamlanmamış sohbet. Kesik çizgili daire (draft).
function AwaitingIcon({ className }: { className?: string }) {
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

// "Tamamlandı" — karşılaştırma/optimizasyon çalışmış, terminal sonuca ulaşmış
// sohbet. Sabit #666666 yerine currentColor + opacity ile temaya/aktif duruma
// uyum sağlar (AwaitingIcon ile aynı görsel ağırlık).
function CompletedIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      opacity="0.5"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.98327 10.6318L2.8914 10.4028L2.73103 10.2153C1.94229 9.29322 1.5 8.18175 1.5 7C1.5 4.14431 4.21574 1.5 8 1.5C11.7843 1.5 14.5 4.14431 14.5 7C14.5 9.85569 11.7843 12.5 8 12.5C7.61994 12.5 7.24851 12.4724 6.88809 12.4196L6.22471 12.3226L5.70994 12.7521C5.33961 13.0611 4.87888 13.3835 4.32918 13.6584C4.01409 13.8159 3.69637 13.9446 3.38773 14.0495C3.4564 13.7131 3.5 13.3588 3.5 13C3.5 12.1045 3.22909 11.2445 2.98327 10.6318ZM1 16C1 16 1.76096 16 2.8135 15.7653C3.46733 15.6195 4.23366 15.3832 5 15C5.66881 14.6656 6.22579 14.2753 6.67094 13.9038C7.10321 13.9671 7.54721 14 8 14C12.4183 14 16 10.866 16 7C16 3.13401 12.4183 0 8 0C3.58172 0 0 3.13401 0 7C0 8.57152 0.591845 10.0221 1.59114 11.1903C1.80733 11.7292 2 12.3826 2 13C2 13.4808 1.88317 13.9834 1.72937 14.4367C1.43322 15.3097 1 16 1 16ZM4.5 8C3.94772 8 3.5 7.55228 3.5 7C3.5 6.44772 3.94772 6 4.5 6C5.05228 6 5.5 6.44772 5.5 7C5.5 7.55228 5.05228 8 4.5 8ZM7 7C7 7.55228 7.44772 8 8 8C8.55228 8 9 7.55228 9 7C9 6.44772 8.55229 6 8 6C7.44772 6 7 6.44772 7 7ZM11.5 8C10.9477 8 10.5 7.55228 10.5 7C10.5 6.44772 10.9477 6 11.5 6C12.0523 6 12.5 6.44772 12.5 7C12.5 7.55228 12.0523 8 11.5 8Z"
        fill="currentColor"
      />
    </svg>
  )
}

// "İşleniyor" — prompt gönderildi, title/araştırma stream ediliyor. Üç noktanın
// sırayla yanıp söndüğü typing animasyonu. 16x16 ikon kutusuna ortalanır.
function TypingDots({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-4 items-center justify-center gap-[2px]",
        className
      )}
      aria-hidden="true"
    >
      <span className="conv-typing-dot size-[3px] rounded-full bg-current" />
      <span className="conv-typing-dot size-[3px] rounded-full bg-current" />
      <span className="conv-typing-dot size-[3px] rounded-full bg-current" />
    </span>
  )
}

function ConversationStateIcon({
  status,
  streaming,
}: {
  status: ConversationStatus
  streaming?: boolean
}) {
  const { icon, label } = streaming
    ? { icon: <TypingDots />, label: "İşleniyor…" }
    : status === "completed"
      ? { icon: <CompletedIcon />, label: "Tamamlanmış sohbet" }
      : { icon: <AwaitingIcon />, label: "Onay bekliyor" }

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="flex shrink-0 items-center justify-center">
          {icon}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

export type ConversationListItem = {
  id: string
  title: string
  updatedAt: Date | string
  pending?: boolean
  // Kalıcı sidebar durumu (server'dan gelir). Eksikse "awaiting" varsayılır.
  status?: ConversationStatus
  // Yalnızca istemci tarafı: bu sohbet şu an bu sekmede stream ediliyor mu?
  // (üç nokta animasyonu). Server'a gönderilmez, kalıcı değildir.
  streaming?: boolean
}

type Props = {
  conversations: ConversationListItem[]
}

/**
 * Kaydırma kabını ölçer ve yalnızca gerçekten kaydırılabilir olduğunda hangi
 * kenarın fade'leneceğini bildirir: top → yukarı, bottom → aşağı kaydırılacak
 * içerik varsa. İçerik kab'ı (firstElementChild) ve kabın kendisi
 * ResizeObserver ile izlenir; öğe ekle/çıkar veya sidebar yeniden boyutlanınca
 * otomatik yeniden ölçülür.
 */
function useScrollFade() {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [fade, setFade] = React.useState({ top: false, bottom: false })

  const measure = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const max = scrollHeight - clientHeight
    const canScroll = max > 1
    const top = canScroll && scrollTop > 1
    const bottom = canScroll && scrollTop < max - 1
    setFade((prev) =>
      prev.top === top && prev.bottom === bottom ? prev : { top, bottom }
    )
  }, [])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    measure()
    el.addEventListener("scroll", measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => {
      el.removeEventListener("scroll", measure)
      ro.disconnect()
    }
  }, [measure])

  return { scrollRef, measure, fade }
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

  const { scrollRef, measure, fade } = useScrollFade()
  // Liste uzunluğu değişince (yeni sohbet, silme, stream upsert) yeniden ölç —
  // ResizeObserver içerik yüksekliği değişimini yakalar, bu ek güvenliktir.
  React.useEffect(() => {
    measure()
  }, [list.length, measure])

  const [renameTarget, setRenameTarget] =
    React.useState<ConversationListItem | null>(null)
  const [deleteTarget, setDeleteTarget] =
    React.useState<ConversationListItem | null>(null)

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
      <SidebarGroup className="flex min-h-0 flex-1 flex-col">
        <SidebarGroupLabel>Geçmiş Sohbetler</SidebarGroupLabel>
        <div className="relative min-h-0 flex-1">
          <div ref={scrollRef} className="no-scrollbar h-full overflow-y-auto">
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
                          <ConversationStateIcon
                            status={c.status ?? DEFAULT_CONVERSATION_STATUS}
                            streaming={c.streaming}
                          />
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
          </div>
          {/* Kenar fade overlay'leri: metni maskelemeden (mask/opacity yazıyı
              GPU katmanına alıp scroll sırasında "bold" gösteriyordu) sidebar
              arka planından şeffafa geçen ince gradient şeritler. Yalnızca o
              yönde kaydırılacak içerik varken görünür. */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-sidebar to-transparent transition-opacity duration-200",
              fade.top ? "opacity-100" : "opacity-0"
            )}
          />
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-sidebar to-transparent transition-opacity duration-200",
              fade.bottom ? "opacity-100" : "opacity-0"
            )}
          />
        </div>
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
