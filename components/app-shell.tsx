"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"


import { AppSidebar } from "@/components/app-sidebar"
import type { ConversationListItem } from "@/components/assistant/assistant-conversations-group"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import type { CurrentUser } from "@/lib/auth/session"
import { loginDialog } from "@/lib/stores/login-dialog"
import { useAssistantTitle } from "@/lib/stores/assistant-title"

type Props = {
  user: CurrentUser | null
  conversations?: ConversationListItem[]
  children: React.ReactNode
}

export function AppShell({ user, conversations, children }: Props) {
  const pathname = usePathname()
  const { title, loading } = useAssistantTitle()
  const isAssistantRoute = pathname?.startsWith("/asistan") ?? false

  return (
    <SidebarProvider>
      <AppSidebar user={user} conversations={conversations} />
      <SidebarInset className="min-h-0 overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            {isAssistantRoute ? (
              loading && !title ? (
                <Skeleton className="h-4 w-32" />
              ) : title ? (
                <span className="truncate text-sm font-medium text-foreground">
                  {title}
                </span>
              ) : null
            ) : (
              <Image
                src="/sepet-dark.svg"
                alt="Sepet"
                width={846}
                height={178}
                priority
                className="h-5 w-auto md:hidden"
              />
            )}
          </div>
          {!user && (
            <div className="px-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loginDialog.open()}
              >
                Giriş Yap
              </Button>
            </div>
          )}
        </header>
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
