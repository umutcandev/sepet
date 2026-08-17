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
} from "@/components/ui/sidebar"
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
  ChartColumnIcon,
  ChevronsUpDownIcon,
  CreditCardIcon,
  LogOutIcon,
  SettingsIcon,
} from "lucide-react"
import { useCurrentUser } from "@/components/providers/session-provider"
import { ThemeMenuItems } from "@/components/theme-toggle"
import { SettingsDialog } from "@/components/settings/settings-dialog"
import type { TabKey } from "@/components/settings/search-registry"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  // Çıkış server action'ı doğrudan değil provider üzerinden: oturum istemcide
  // tutulduğu için önce istemci durumu temizlenmeli, yoksa redirect sonrası
  // avatar/nav ekranda kalır (bkz. SessionProvider.signOut).
  const { signOut } = useCurrentUser()
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [settingsTab, setSettingsTab] = React.useState<TabKey>("genel")

  const openSettings = (tab: TabKey) => {
    setSettingsTab(tab)
    setSettingsOpen(true)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* Radix DropdownMenu: menü rolü/adı, ok tuşlarıyla gezinme, focus'un
            menüye girip kapanışta tetikleyiciye dönmesi ve Escape buradan
            geliyor. Aynı menünün üst bardaki eşi (header-user-menu) da bunu
            kullanıyor; elle kurulmuş bir kopya iki yerde ayrışmaya yol açıyordu. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              // `my-2`: rayda düğme h-12'den size-8'e iniyor. Footer alttan
              // hizalı olduğu için kısalma avatarı 8 piksel AŞAĞI kaydırıyordu.
              // Dikey marj kutuyu yine 48 piksele tamamlar → avatar açılıp
              // kapanırken tam olarak yerinde kalır.
              //
              // `p-1!`: rayda taban stil dolguyu sıfırlıyor, avatar 32 piksellik
              // düğmeyi kenardan kenara dolduruyordu — rayın 8 piksellik iç
              // payını tek başına deliyordu. 4 piksel dolgu + 24 piksel avatar
              // aynı kutuyu ortalı doldurur ve dikey konumu genişken duruma
              // birebir eşitler (8+4 = 12 piksel üstten, iki durumda da).
              className="group-data-[collapsible=icon]:my-2 group-data-[collapsible=icon]:p-1! data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {/* Tetikleyicideki avatar iki durumda da 24 piksel (`size="sm"`,
                  yedek harfi de küçültür). Menü içindeki kopyası 32'de kalıyor:
                  orası geniş bir yüzey ve kimliği tanıtan asıl yer. */}
              <Avatar size="sm" className="rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDownIcon className="ms-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg bg-popover/70! backdrop-blur-xl backdrop-saturate-150 supports-[not(backdrop-filter:blur(0))]:bg-popover!"
            side="top"
            align="start"
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
                <SettingsIcon />
                Ayarlar
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  openSettings("abonelik")
                }}
              >
                <CreditCardIcon />
                Abonelik
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  openSettings("kullanim")
                }}
              >
                <ChartColumnIcon />
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
              <LogOutIcon />
              Çıkış yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          initialTab={settingsTab}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
