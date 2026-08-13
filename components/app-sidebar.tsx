"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  HomeIcon,
  MessagesSquareIcon,
  ReceiptIcon,
  ShoppingBasketIcon,
  SparklesIcon,
  SearchIcon,
} from "lucide-react"

import { NavGuest } from "@/components/nav-guest"
import { NavGuestInfo } from "@/components/nav-guest-info"
import { NavUser } from "@/components/nav-user"
import { Button } from "@/components/ui/button"
import { AssistantConversationsGroup } from "@/components/assistant/assistant-conversations-group"
import {
  BlogPostsGroup,
  type BlogNavItem,
} from "@/components/blog/blog-posts-group"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentUser } from "@/components/providers/session-provider"

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
  blogPosts?: BlogNavItem[]
}

export function AppSidebar({ blogPosts, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  // Görüntü için displayUser (çözümlenmiş kullanıcı ya da localStorage
  // snapshot'ı): dönen ziyaretlerde ad/avatar hidrasyonla birlikte anında
  // görünür, /api/me beklenmez. İlk boyamada (hidrasyondan önce) hangi
  // varyantın görüneceğine <html data-session> ipucu üzerinden CSS karar
  // verir — aşağıdaki [data-session-*] sarmalayıcıları.
  const { displayUser, pendingAuth } = useCurrentUser()

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
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- fresh mount kasıtlı; router.push aynı segment'e düşüp remount etmez (yukarıdaki drift notu).
      window.location.assign("/asistan")
    }
  }

  const showAssistantConversations = !!displayUser

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-between gap-2">
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent active:bg-transparent">
              <Link href="/">
                <Image
                  src="/brand/sepet-dark.svg"
                  alt="Sepet"
                  width={846}
                  height={178}
                  priority
                  className="h-6 w-auto dark:hidden"
                />
                <Image
                  src="/brand/sepet-light.svg"
                  alt=""
                  aria-hidden
                  width={846}
                  height={178}
                  className="hidden h-6 w-auto dark:block"
                />
              </Link>
            </SidebarMenuButton>
            {/* Yeni Sohbet: logonun sağında, sidebar başlığında.
                Misafirlerde CSS gizler (data-session ipucu). */}
            <div data-session-authed className="ml-auto">
              <Button variant="outline" size="sm" asChild>
                <Link href="/asistan" onClick={handleNewChatClick}>
                  Yeni Sohbet
                </Link>
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent aria-label="Ana gezinme" className="overflow-hidden">
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
          // Liste assistantConversations store'undan okunur; store hidrasyonunu
          // SessionProvider `/api/me` sonrası yapar. Buradaki fallback yalnızca
          // hidrasyondan önceki ilk render için (boş).
          <AssistantConversationsGroup conversations={[]} />
        ) : null}

        <BlogPostsGroup posts={blogPosts ?? []} />
      </SidebarContent>

      <SidebarFooter>
        {/* Footer kimlik alanı: iki varyant da render edilir, ilk boyamada
            data-session ipucu üzerinden CSS doğru olanı gösterir. Oturumlu
            kullanıcı "Giriş Yap" flash'ı görmez; snapshot varsa ad/avatar
            hidrasyonla birlikte gelir, yoksa /api/me'ye kadar iskelet. */}
        <div data-session-guest>
          <NavGuestInfo />
          <NavGuest />
        </div>
        <div data-session-authed>
          {displayUser ? (
            <NavUser user={displayUser} />
          ) : pendingAuth ? (
            <NavUserSkeleton />
          ) : null}
        </div>
        <div className="flex items-center justify-center gap-1.5 px-2 pb-0.5 text-[0.6875rem] text-muted-foreground/60 group-data-[collapsible=icon]:hidden">
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

// NavUser'ın SidebarMenuButton size="lg" düzeniyle birebir aynı boyutlarda
// yer tutucu: snapshot henüz yokken (ör. OAuth dönüşündeki ilk yükleniş)
// /api/me çözülene kadar footer zıplamadan bekler.
function NavUserSkeleton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex h-12 items-center gap-2 rounded-md p-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="grid flex-1 gap-1">
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
