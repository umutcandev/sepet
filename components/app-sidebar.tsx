"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  HomeIcon,
  ShoppingBasketIcon,
  ReceiptIcon,
  SparklesIcon,
  ShoppingCartIcon,
  SearchIcon,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import { Badge } from "@/components/ui/badge"
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
} from "@/components/ui/sidebar"

type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  soon?: boolean
}

const nav: NavItem[] = [
  { title: "Ana Sayfa", url: "/dashboard", icon: HomeIcon },
  { title: "Ürün Ara", url: "/dashboard/search", icon: SearchIcon },
  {
    title: "Sepetlerim",
    url: "/dashboard/baskets",
    icon: ShoppingBasketIcon,
    soon: true,
  },
  {
    title: "Fiş Geçmişi",
    url: "/dashboard/purchases",
    icon: ReceiptIcon,
    soon: true,
  },
  {
    title: "Asistan",
    url: "/dashboard/assistant",
    icon: SparklesIcon,
    soon: true,
  },
]

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
    avatar: string
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <ShoppingCartIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">SepetIQ</span>
                  <span className="truncate text-xs">Akıllı Sepet</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={!item.soon}
                      disabled={item.soon}
                      isActive={isActive}
                      aria-disabled={item.soon || undefined}
                      tooltip={item.title}
                      className={item.soon ? "cursor-not-allowed" : undefined}
                    >
                      {item.soon ? (
                        <span>
                          <Icon />
                          <span>{item.title}</span>
                          <Badge
                            variant="outline"
                            className="ml-auto h-4 px-1 text-[10px] font-normal"
                          >
                            yakında
                          </Badge>
                        </span>
                      ) : (
                        <Link href={item.url}>
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
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
