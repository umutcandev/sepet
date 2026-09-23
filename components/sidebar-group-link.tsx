"use client"

import Link from "next/link"
import { RiArrowRightUpLine } from "@remixicon/react"

import { SidebarGroupAction } from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Grup etiketinin sağ ucundaki "tümünü gör" linki. Masaüstünde grup hover'ında
// belirir (SidebarGroup'a `group/section` verilmeli), mobilde hep görünür.
export function SidebarGroupLink({
  href,
  label,
  onNavigate,
  className,
}: {
  href: string
  label: string
  onNavigate?: () => void
  className?: string
}) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <SidebarGroupAction
          asChild
          className={cn(
            "top-2.5 text-sidebar-foreground/70 transition-opacity duration-200 hover:text-sidebar-foreground md:opacity-0 md:group-hover/section:opacity-100 md:focus-visible:opacity-100 [&>svg]:size-3.5",
            className
          )}
        >
          <Link href={href} onClick={onNavigate}>
            <RiArrowRightUpLine />
            <span className="sr-only">{label}</span>
          </Link>
        </SidebarGroupAction>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}
