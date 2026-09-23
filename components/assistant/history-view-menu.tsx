"use client"

import * as React from "react"
import { RiEqualizerLine } from "@remixicon/react"

import { SidebarGroupAction } from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  HISTORY_VIEW_OPTIONS,
  isDefaultHistoryView,
  type HistoryView,
} from "@/lib/assistant/history-view"
import { historyView, useHistoryView } from "@/lib/stores/history-view"

const LABEL = "Filtrele ve grupla"

const MENU: { key: keyof HistoryView; label: string }[][] = [
  [
    { key: "status", label: "Durum" },
    { key: "activity", label: "Son etkinlik" },
  ],
  [
    { key: "groupBy", label: "Grupla" },
    { key: "sort", label: "Sırala" },
  ],
]

// "Geçmiş Sohbetler" başlığının sağ ucundaki, her zaman görünen araç menüsü.
export function HistoryViewMenu() {
  const view = useHistoryView()
  const active = !isDefaultHistoryView(view)
  const [tipOpen, setTipOpen] = React.useState(false)
  // Menü kapanınca odak butona döner; o odak tooltip'i açmasın.
  const muteTip = React.useRef(false)

  return (
    <DropdownMenu>
      <Tooltip
        delayDuration={300}
        open={tipOpen}
        onOpenChange={(open) => setTipOpen(open && !muteTip.current)}
      >
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <SidebarGroupAction className="top-2.5 text-sidebar-foreground/70 hover:text-sidebar-foreground aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground [&>svg]:size-3.5">
              <RiEqualizerLine />
              {active ? (
                <span
                  aria-hidden
                  className="absolute -top-px -right-px size-1.5 rounded-full bg-primary ring-2 ring-sidebar"
                />
              ) : null}
              <span className="sr-only">{LABEL}</span>
            </SidebarGroupAction>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">{LABEL}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        side="bottom"
        align="end"
        className="w-auto min-w-52"
        onCloseAutoFocus={() => {
          muteTip.current = true
          queueMicrotask(() => (muteTip.current = false))
        }}
      >
        {MENU.map((group, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <DropdownMenuSeparator /> : null}
            {group.map(({ key, label }) => (
              <DropdownMenuSub key={key}>
                <DropdownMenuSubTrigger className="[&>svg:last-child]:ml-0">
                  {label}
                  <span className="ms-auto ps-6 text-muted-foreground">
                    {
                      HISTORY_VIEW_OPTIONS[key].find((o) => o.value === view[key])
                        ?.label
                    }
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="min-w-40">
                    <DropdownMenuRadioGroup
                      value={view[key]}
                      onValueChange={(v) =>
                        historyView.set(key, v as HistoryView[typeof key])
                      }
                    >
                      {HISTORY_VIEW_OPTIONS[key].map((o) => (
                        <React.Fragment key={o.value}>
                          {o.value === "none" ? <DropdownMenuSeparator /> : null}
                          <DropdownMenuRadioItem value={o.value}>
                            {o.label}
                          </DropdownMenuRadioItem>
                        </React.Fragment>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            ))}
          </React.Fragment>
        ))}
        {active ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => historyView.reset()}>
              Sıfırla
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
