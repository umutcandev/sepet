"use client"

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
import { Badge } from "@/components/ui/badge"
import {
  SparklesIcon,
  BadgeCheckIcon,
  CreditCardIcon,
  BellIcon,
  LogOutIcon,
} from "lucide-react"
import { signOutAction } from "@/lib/actions/auth"

export function HeaderUserMenu({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Hesap menüsü"
        className="rounded-full bg-muted/40 p-0.5 transition-colors hover:bg-muted focus-visible:bg-muted"
      >
        <Avatar className="h-6 w-6 rounded-[6px]">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="rounded-[6px] text-[10px]">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg border bg-popover"
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
          <DropdownMenuItem disabled>
            <SparklesIcon />
            Pro&apos;ya Yükselt
            <Badge variant="secondary" className="ml-auto text-[10px]">
              YAKINDA
            </Badge>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            <BadgeCheckIcon />
            Hesap
            <Badge variant="secondary" className="ml-auto text-[10px]">
              YAKINDA
            </Badge>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <CreditCardIcon />
            Faturalandırma
            <Badge variant="secondary" className="ml-auto text-[10px]">
              YAKINDA
            </Badge>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <BellIcon />
            Bildirimler
            <Badge variant="secondary" className="ml-auto text-[10px]">
              YAKINDA
            </Badge>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            void signOutAction()
          }}
        >
          <LogOutIcon />
          Çıkış yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
