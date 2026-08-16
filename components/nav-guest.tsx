"use client"



import { LogInIcon } from "lucide-react"

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { loginDialog } from "@/lib/stores/login-dialog"

export function NavGuest() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="default"
          variant="outline"
          tooltip="Oturum Açın"
          onClick={() => loginDialog.open()}
          // `my-0.5`: rayda h-9 (36px) düğme size-8'e (32px) iniyor; 2+2 piksel
          // marj kutuyu 36'da tutar, yani düğme açılıp kapanırken yerinden
          // oynamaz (bkz. nav-user.tsx'teki aynı hesap).
          className="h-9 justify-center font-medium group-data-[collapsible=icon]:my-0.5"
        >
          {/* Daraltılmış rayda düğme 32 piksele iner ve metin kırpılır → ikon
              devreye girer, adı tooltip söyler. Genişken tam tersi: ortalanmış
              metnin yanında bir ikon dengeyi bozardı. */}
          <LogInIcon className="hidden group-data-[collapsible=icon]:block" />
          <span className="group-data-[collapsible=icon]:hidden">
            Oturum Açın
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

