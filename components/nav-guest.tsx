"use client"



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
          className="h-9 justify-center font-medium"
        >
          <span>Oturum Açın</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

