"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  HomeIcon,
  PlusIcon,
  ReceiptIcon,
  SparklesIcon,
  SearchIcon,
} from "lucide-react"

import { NavGuest } from "@/components/nav-guest"
import { NavUser } from "@/components/nav-user"
import {
  AssistantConversationsGroup,
  type ConversationListItem,
} from "@/components/assistant/assistant-conversations-group"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { CurrentUser } from "@/lib/auth/session"

type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  soon?: boolean
}

const nav: NavItem[] = [
  { title: "Ana Sayfa", url: "/", icon: HomeIcon },
  { title: "Ürün Ara", url: "/search", icon: SearchIcon },
  {
    title: "Fiş Geçmişi",
    url: "/fis-gecmisi",
    icon: ReceiptIcon,
  },
  {
    title: "Asistan",
    url: "/assistant",
    icon: SparklesIcon,
  },
]

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: CurrentUser | null
  conversations?: ConversationListItem[]
}

export function AppSidebar({
  user,
  conversations,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  const showAssistantConversations = !!user

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent active:bg-transparent">
              <Link href="/">
                <Image
                  src="/sepet-dark.svg"
                  alt="Sepet"
                  width={846}
                  height={178}
                  priority
                  className="h-6 w-auto"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {user ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    size="default"
                    variant="outline"
                    tooltip="Yeni Sohbet"
                    asChild
                    className="h-9 justify-center font-medium"
                  >
                    <Link href="/assistant" onClick={handleNavClick}>
                      <PlusIcon />
                      <span>Yeni Sohbet</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const Icon = item.icon
                const isAssistant = item.url === "/assistant"
                const isActive = isAssistant
                  ? pathname === "/assistant"
                  : pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={!item.soon}
                      disabled={item.soon}
                      isActive={isActive}
                      aria-disabled={item.soon || undefined}
                      tooltip={item.title}
                      className={item.soon ? "cursor-not-allowed opacity-40" : undefined}
                    >
                      {item.soon ? (
                        <span className="flex items-center gap-2">
                          <Icon />
                          <span>{item.title}</span>
                        </span>
                      ) : (
                        <Link href={item.url} onClick={handleNavClick}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showAssistantConversations ? (
          <AssistantConversationsGroup
            conversations={conversations ?? []}
          />
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        {user ? <NavUser user={user} /> : <NavGuest />}
      </SidebarFooter>
    </Sidebar>
  )
}
