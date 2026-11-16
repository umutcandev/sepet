"use client"

import * as React from "react"
import dynamic from "next/dynamic"

import { Button } from "@/components/ui/button"

import type { RouteMapProps } from "./basket-route-map"

// Leaflet ve CSS'i ayrı chunk: haritayı açmayan kullanıcı indirmez.
const BasketRouteMap = dynamic(
  () => import("./basket-route-map").then((m) => m.BasketRouteMap),
  {
    ssr: false,
    loading: () => (
      <div aria-hidden="true" className="absolute inset-0 bg-muted motion-safe:animate-pulse" />
    ),
  },
)

/** Dökümün başındaki kesik kenarlı alan; buton haritayı aynı yerde açar. */
export function RouteMapSection(props: RouteMapProps) {
  const [shown, setShown] = React.useState(false)

  return (
    <div className="px-2 pt-2 pb-1">
      {shown ? (
        <div className="relative isolate h-64 overflow-hidden rounded-md outline outline-1 -outline-offset-1 outline-black/10 [clip-path:inset(0_round_var(--radius-md))] dark:outline-white/10 [&_.leaflet-control-attribution]:rounded-tl-md">
          {/* Pinler ve rozetler kurulumda çizilir; şube, ürün ya da ev değişince harita baştan kurulur. */}
          <BasketRouteMap key={JSON.stringify([props.home, props.stops])} {...props} />
        </div>
      ) : (
        <div className="flex w-full items-center justify-between gap-3 rounded-md border border-dashed border-muted-foreground/30 px-3 py-2.5 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:bg-muted/50 hover:text-foreground">
          <div className="flex min-w-0 flex-col text-left">
            <span className="text-xs font-medium text-foreground">Rotayı haritada gör</span>
            <span className="truncate text-[0.6875rem]">Konumundan marketlere sıralı rota</span>
          </div>
          <Button variant="outline" size="xs" onClick={() => setShown(true)}>
            Haritayı aç
          </Button>
        </div>
      )}
    </div>
  )
}
