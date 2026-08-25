"use client"

import * as React from "react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  RiBankCardLine,
  RiBarChartLine,
  RiLogoutBoxLine,
  RiSettings3Line,
} from "@remixicon/react"
import { useCurrentUser } from "@/components/providers/session-provider"
import { ThemeMenuItems } from "@/components/theme-toggle"
import { SettingsDialog } from "@/components/settings/settings-dialog"
import type { TabKey } from "@/components/settings/search-registry"
import { cn } from "@/lib/utils"

export function HeaderUserMenu({
  user,
  className,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
  className?: string
}) {
  // Çıkış provider üzerinden: önce istemci oturumunu temizler (bkz.
  // SessionProvider.signOut), sonra server action cookie'yi siler.
  const { signOut } = useCurrentUser()
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [settingsTab, setSettingsTab] = React.useState<TabKey>("genel")

  const openSettings = (tab: TabKey) => {
    setSettingsTab(tab)
    setSettingsOpen(true)
  }

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Hesap menüsü"
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted/40 p-0.5 transition-colors hover:bg-muted focus-visible:bg-muted",
          className,
        )}
      >
        <Avatar className="size-6 shrink-0 rounded-full">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="rounded-full text-[0.625rem]">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg bg-popover/70! backdrop-blur-xl backdrop-saturate-150 supports-[not(backdrop-filter:blur(0))]:bg-popover!"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-lg">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              openSettings("genel")
            }}
          >
            <RiSettings3Line />
            Ayarlar
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              openSettings("abonelik")
            }}
          >
            <RiBankCardLine />
            Abonelik
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              openSettings("kullanim")
            }}
          >
            <RiBarChartLine />
            Kullanım
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <ThemeMenuItems />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            void signOut()
          }}
        >
          <RiLogoutBoxLine />
          Çıkış yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <SettingsDialog
      open={settingsOpen}
      onOpenChange={setSettingsOpen}
      initialTab={settingsTab}
    />
    </>
  )
}
