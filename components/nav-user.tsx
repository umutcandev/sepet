"use client"

import * as React from "react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  ChartColumnIcon,
  ChevronsUpDownIcon,
  CreditCardIcon,
  LogOutIcon,
  SettingsIcon,
} from "lucide-react"
import { signOutAction } from "@/lib/actions/auth"
import { ThemeMenuItems } from "@/components/theme-toggle"
import { SettingsDialog } from "@/components/settings/settings-dialog"
import type { TabKey } from "@/components/settings/search-registry"
import { AnimatePresence, motion } from "framer-motion"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile: _isMobile } = useSidebar()
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [settingsTab, setSettingsTab] = React.useState<TabKey>("genel")
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  const openSettings = (tab: TabKey) => {
    setSettingsTab(tab)
    setSettingsOpen(true)
    setMenuOpen(false)
  }

  // Dışarı tıklanınca menüyü kapat
  React.useEffect(() => {
    if (!menuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false)
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [menuOpen])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="relative">
          <SidebarMenuButton
            ref={triggerRef}
            size="lg"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            data-state={menuOpen ? "open" : "closed"}
          >
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
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </SidebarMenuButton>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute bottom-full left-0 z-50 mb-2 w-full min-w-56 origin-bottom overflow-hidden rounded-lg bg-popover/70 p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 backdrop-blur-xl backdrop-saturate-150 supports-[not(backdrop-filter:blur(0))]:bg-popover!"
              >
                {/* Kullanıcı bilgisi */}
                <div className="p-0 font-normal">
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
                </div>
                <NavMenuSeparator />
                {/* Ayarlar grubu */}
                <div>
                  <NavMenuItem onClick={() => openSettings("genel")}>
                    <SettingsIcon />
                    Ayarlar
                  </NavMenuItem>
                  <NavMenuItem onClick={() => openSettings("abonelik")}>
                    <CreditCardIcon />
                    Abonelik
                  </NavMenuItem>
                  <NavMenuItem onClick={() => openSettings("kullanim")}>
                    <ChartColumnIcon />
                    Kullanım
                  </NavMenuItem>
                </div>
                <NavMenuSeparator />
                <ThemeMenuItems />
                <NavMenuSeparator />
                <NavMenuItem
                  onClick={() => {
                    setMenuOpen(false)
                    void signOutAction()
                  }}
                >
                  <LogOutIcon />
                  Çıkış yap
                </NavMenuItem>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          initialTab={settingsTab}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

/* ------------------------------------------------------------------ */
/*  İç yardımcı bileşenler – Radix DropdownMenuItem stillerini korur  */
/* ------------------------------------------------------------------ */

function NavMenuItem({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg]:opacity-60"
    >
      {children}
    </button>
  )
}

function NavMenuSeparator() {
  return <div className="-mx-1 my-1 h-px bg-border" />
}
