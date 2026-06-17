"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  HomeIcon,
  MessagesSquareIcon,
  PlusIcon,
  ReceiptIcon,
  ShoppingBasketIcon,
  SparklesIcon,
  SearchIcon,
} from "lucide-react"

import { NavGuest } from "@/components/nav-guest"
import { NavGuestInfo } from "@/components/nav-guest-info"
import { NavUser } from "@/components/nav-user"
import { Button } from "@/components/ui/button"
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
  { title: "Sohbetler", url: "/sohbetler", icon: MessagesSquareIcon },
  { title: "Ürün Ara", url: "/urun-ara", icon: SearchIcon },
  {
    title: "Sepetlerim",
    url: "/sepetlerim",
    icon: ShoppingBasketIcon,
  },
  {
    title: "Fişlerim",
    url: "/fis-gecmisi",
    icon: ReceiptIcon,
  },
  {
    title: "Asistan",
    url: "/asistan",
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

  // Yeni sohbet başlatıldığında assistant-chat URL'yi history.replaceState ile
  // /asistan/[id]'ye günceller (SSE stream'i koparmamak için). URL bar
  // /asistan/[id] gösterse de Next bunu hâlâ /asistan segment'i olarak işler →
  // Link href="/asistan" tıklaması aynı segment'e gider, AssistantChat remount
  // olmaz ve useChat client state'i (mesajlar, conversationId) korunur.
  // Gerçek /asistan/[id] sayfasında da aynı segment durumu olmadığı için
  // SPA çalışıyor; ama drift case'i SPA ile çözmek mümkün değil. Bu yüzden
  // /asistan/* altındaki her durumda tam reload ile fresh mount sağlıyoruz.
  const handleNewChatClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    handleNavClick()
    if (
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/asistan/")
    ) {
      e.preventDefault()
      window.location.assign("/asistan")
    }
  }

  const showAssistantConversations = !!user

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-between gap-2">
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent active:bg-transparent">
              <Link href="/">
                <Image
                  src="/sepet-dark.svg"
                  alt="Sepet"
                  width={846}
                  height={178}
                  priority
                  className="h-6 w-auto dark:hidden"
                />
                <Image
                  src="/sepet-light.svg"
                  alt=""
                  aria-hidden
                  width={846}
                  height={178}
                  className="hidden h-6 w-auto dark:block"
                />
              </Link>
            </SidebarMenuButton>
            <Button
              variant="outline"
              size="icon"
              asChild
              aria-label="GitHub deposunu aç"
            >
              <a
                href="https://github.com/umutcandev/sepet"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12.001 2C6.47598 2 2.00098 6.475 2.00098 12C2.00098 16.425 4.86348 20.1625 8.83848 21.4875C9.33848 21.575 9.52598 21.275 9.52598 21.0125C9.52598 20.775 9.51348 19.9875 9.51348 19.15C7.00098 19.6125 6.35098 18.5375 6.15098 17.975C6.03848 17.6875 5.55098 16.8 5.12598 16.5625C4.77598 16.375 4.27598 15.9125 5.11348 15.9C5.90098 15.8875 6.46348 16.625 6.65098 16.925C7.55098 18.4375 8.98848 18.0125 9.56348 17.75C9.65098 17.1 9.91348 16.6625 10.201 16.4125C7.97598 16.1625 5.65098 15.3 5.65098 11.475C5.65098 10.3875 6.03848 9.4875 6.67598 8.7875C6.57598 8.5375 6.22598 7.5125 6.77598 6.1375C6.77598 6.1375 7.61348 5.875 9.52598 7.1625C10.326 6.9375 11.176 6.825 12.026 6.825C12.876 6.825 13.726 6.9375 14.526 7.1625C16.4385 5.8625 17.276 6.1375 17.276 6.1375C17.826 7.5125 17.476 8.5375 17.376 8.7875C18.0135 9.4875 18.401 10.375 18.401 11.475C18.401 15.3125 16.0635 16.1625 13.8385 16.4125C14.201 16.725 14.5135 17.325 14.5135 18.2625C14.5135 19.6 14.501 20.675 14.501 21.0125C14.501 21.275 14.6885 21.5875 15.1885 21.4875C19.259 20.1133 21.9999 16.2963 22.001 12C22.001 6.475 17.526 2 12.001 2Z" />
                </svg>
              </a>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden">
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
                    <Link href="/asistan" onClick={handleNewChatClick}>
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
                const isAssistant = item.url === "/asistan"
                const isActive = isAssistant
                  ? pathname === "/asistan"
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
        {user ? (
          <NavUser user={user} />
        ) : (
          <>
            <NavGuestInfo />
            <NavGuest />
          </>
        )}
        <div className="flex items-center justify-center gap-1.5 px-2 pb-0.5 text-[11px] text-muted-foreground/60 group-data-[collapsible=icon]:hidden">
          <Link
            href="/gizlilik"
            onClick={handleNavClick}
            className="transition-colors hover:text-foreground"
          >
            Gizlilik Politikası
          </Link>
          <span aria-hidden>·</span>
          <Link
            href="/kullanim-sartlari"
            onClick={handleNavClick}
            className="transition-colors hover:text-foreground"
          >
            Kullanım Şartları
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
