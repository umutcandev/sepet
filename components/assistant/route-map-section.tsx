"use client"

import * as React from "react"
import dynamic from "next/dynamic"

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

/** Dökümün başındaki kesik kenarlı alan; tıklanınca harita aynı yerde açılır. */
export function RouteMapSection(props: RouteMapProps) {
  const [shown, setShown] = React.useState(false)

  return (
    <div className="px-2 pt-2 pb-1">
      {shown ? (
        <div className="relative isolate h-64 overflow-hidden rounded-lg outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
          <BasketRouteMap {...props} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShown(true)}
          className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 px-3 py-2.5 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:bg-muted/50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="text-xs font-medium text-foreground">Rotayı haritada gör</span>
          <span className="text-[0.6875rem]">
            Konumundan marketlere olan rotanı haritada gör.
          </span>
        </button>
      )}
    </div>
  )
}
