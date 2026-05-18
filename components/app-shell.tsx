"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CommandIcon, PanelLeftIcon, PlusIcon } from "lucide-react"


import { AppSidebar } from "@/components/app-sidebar"
import { AssistantHeaderActions } from "@/components/assistant/assistant-header-actions"
import type { ConversationListItem } from "@/components/assistant/assistant-conversations-group"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { HeaderUserMenu } from "@/components/header-user-menu"
import { ThemeToggleButton } from "@/components/theme-toggle"
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"
import type { CurrentUser } from "@/lib/auth/session"
import { loginDialog } from "@/lib/stores/login-dialog"
import { useAssistantTitle } from "@/lib/stores/assistant-title"
import { assistantConversations } from "@/lib/stores/assistant-conversations"

type Props = {
  user: CurrentUser | null
  conversations?: ConversationListItem[]
  children: React.ReactNode
}

function SidebarToggleButton() {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={toggleSidebar}
      aria-label="Kenar çubuğunu aç/kapat"
      className="-ml-1 h-8 gap-2 px-2 md:pr-2.5"
    >
      <PanelLeftIcon className="cn-rtl-flip size-4" />
      <span className="hidden items-center gap-0.5 font-mono text-[11px] font-medium leading-none text-muted-foreground/60 md:inline-flex">
        <CommandIcon className="size-3 shrink-0" />
        <span className="inline-flex h-3 items-center leading-none">B</span>
      </span>
    </Button>
  )
}

function NewConversationButton() {
  // Drift case: assistant-chat URL'yi history.replaceState ile /asistan/[id]'ye
  // günceller ama Next içsel olarak hâlâ /asistan segment'inde olduğunu sanır.
  // Link href="/asistan" tıklaması aynı segment'e düşer → AssistantChat remount
  // olmaz, useChat client state'i (mesajlar, conversationId) korunur.
  // /asistan/* altındaki her durumda tam reload ile fresh mount sağlıyoruz.
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/asistan/")
    ) {
      e.preventDefault()
      window.location.assign("/asistan")
    }
  }

  return (
    <>
      <Button
        asChild
        size="sm"
        className="hidden h-7 gap-1.5 md:inline-flex"
      >
        <Link href="/asistan" onClick={handleClick}>
          <PlusIcon className="size-3.5" />
          Yeni Sohbet
        </Link>
      </Button>
      <Button
        asChild
        size="icon-sm"
        className="md:hidden"
        aria-label="Yeni Sohbet"
      >
        <Link href="/asistan" onClick={handleClick}>
          <PlusIcon className="size-4" />
        </Link>
      </Button>
    </>
  )
}

export function AppShell({ user, conversations, children }: Props) {
  const pathname = usePathname()
  const { title, loading, conversationId } = useAssistantTitle()
  const isAssistantRoute = pathname?.startsWith("/asistan") ?? false

  // Sidebar listesi (AssistantConversationsGroup) mobilde Sheet kapalıyken
  // unmount oluyor; o yüzden hidrasyonu burada — her zaman mount olan
  // AppShell'de — yapıyoruz. Böylece stream sırasında store'a yazılan
  // upsert/setTitle mutasyonları sidebar kapalıyken de korunur ve menü
  // açılınca listede görünür.
  React.useEffect(() => {
    assistantConversations.hydrate(conversations ?? [])
  }, [conversations])

  return (
    <SidebarProvider>
      <AppSidebar user={user} conversations={conversations} />
      <SidebarInset className="min-h-0 overflow-hidden">
        <header className="grid h-16 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex min-w-0 items-center gap-2 px-4">
            <SidebarToggleButton />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            {isAssistantRoute ? (
              <NewConversationButton />
            ) : (
              <>
                <Image
                  src="/sepet-dark.svg"
                  alt="Sepet"
                  width={846}
                  height={178}
                  priority
                  className="h-5 w-auto md:hidden dark:hidden"
                />
                <Image
                  src="/sepet-light.svg"
                  alt=""
                  aria-hidden
                  width={846}
                  height={178}
                  className="hidden h-5 w-auto dark:max-md:block"
                />
              </>
            )}
          </div>
          <div className="flex min-w-0 items-center justify-center">
            {isAssistantRoute ? (
              loading && !title ? (
                <Skeleton className="h-4 w-40 rounded-md" />
              ) : title ? (
                <div className="flex min-w-0 items-center">
                  <span className="truncate text-sm font-medium text-foreground">
                    {title}
                  </span>
                  {conversationId ? (
                    <AssistantHeaderActions
                      conversationId={conversationId}
                      title={title}
                    />
                  ) : null}
                </div>
              ) : null
            ) : null}
          </div>
          <div className="flex items-center justify-end gap-1 px-4">
            <ThemeToggleButton />
            {user ? (
              <div className="md:hidden">
                <HeaderUserMenu user={user} />
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => loginDialog.open()}
              >
                Giriş Yap
              </Button>
            )}
          </div>
        </header>
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
