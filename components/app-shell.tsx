"use client"

import * as React from "react"
import Image from "next/image"


import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import type { CurrentUser } from "@/lib/auth/session"
import { loginDialog } from "@/lib/stores/login-dialog"

type Props = {
  user: CurrentUser | null
  children: React.ReactNode
}

export function AppShell({ user, children }: Props) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Image
              src="/sepet-dark.svg"
              alt="Sepet"
              width={846}
              height={178}
              priority
              className="h-5 w-auto md:hidden"
            />
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
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
