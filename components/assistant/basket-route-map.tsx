"use client"

import "leaflet/dist/leaflet.css"

import * as React from "react"
import type * as LeafletNs from "leaflet"
import {
  RiAddLine,
  RiCarLine,
  RiSubtractLine,
  RiWalkLine,
} from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control"
import { Spinner } from "@/components/ui/spinner"
import { loadLeaflet, TILE_ATTRIBUTION, TILE_URL } from "@/lib/leaflet"
import { depotIcon, escapeHtml, userDotIcon } from "@/lib/leaflet-icons"
import { placeLabel, type Rect } from "@/lib/geo/label-placement"
import { getMarketColor } from "@/lib/markets/registry"
import { cn } from "@/lib/utils"
import {
  compareDuration,
  formatDistance,
  formatDuration,
  orderStops,
  type DepotStop,
  type GeoPoint,
  type RouteMode,
  type RouteResult,
} from "@/lib/geo/trip"

export type RouteMapProps = {
  home: GeoPoint
  stops: DepotStop[]
  /** Kombinasyonda tek market turunun şubeleri; süre farkı için. */
  compareStops?: GeoPoint[] | null
}

const ORS_ATTRIBUTION =
  '&copy; <a href="https://openrouteservice.org/">openrouteservice</a> by HeiGIT'

// Eve dönüş bacağı market rengi taşımaz.
const RETURN_COLOR = "#6B7280"

// Üstte kontroller, altta toplam kutusu ve atıf; rota bunların altında kalmasın.
const FIT: LeafletNs.FitBoundsOptions = {
  paddingTopLeft: [20, 44],
  paddingBottomRight: [20, 60],
  maxZoom: 16,
}

// Aynı rota oturumda bir kez istenir; harita kapanıp açılınca yeniden gitmez.
const routeCache = new Map<string, Promise<RouteResult | null>>()

function fetchRoute(mode: RouteMode, stops: GeoPoint[]): Promise<RouteResult | null> {
  const key = `${mode}:${stops.map((s) => `${s.lat},${s.lng}`).join("|")}`
  const hit = routeCache.get(key)
  if (hit) return hit
  const pending = fetch("/api/location/directions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, stops: stops.map(({ lat, lng }) => ({ lat, lng })) }),
  })
    .then((r) => (r.ok ? (r.json() as Promise<{ route?: RouteResult | null }>) : null))
    .then((d) => d?.route ?? null)
    .catch(() => null)
  routeCache.set(key, pending)
  // Başarısızlık kalıcı değil; bir sonraki açılışta yeniden denenir.
  void pending.then((r) => {
    if (!r) routeCache.delete(key)
  })
  return pending
}

/** Yolun `fraction` kadar ilerisindeki nokta. */
function pointAlong(path: [number, number][], fraction: number): [number, number] {
  const lengths = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]))
  let left = lengths.reduce((a, b) => a + b, 0) * fraction
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i]) {
      const t = lengths[i] ? left / lengths[i] : 0
      return [
        path[i][0] + (path[i + 1][0] - path[i][0]) * t,
        path[i][1] + (path[i + 1][1] - path[i][1]) * t,
      ]
    }
    left -= lengths[i]
  }
  return path[path.length - 1]
}

/**
 * Bacağın kutusu; renkli çizgi rotaya bakan kenara gelir. Yerleşene kadar
 * görünmez (bkz. placeLabels).
 */
function legLabelIcon(L: typeof LeafletNs, text: string, color: string) {
  const html =
    '<div class="flex w-max items-center gap-1.5 rounded-md bg-background py-1 px-1.5 font-sans text-[0.6875rem] leading-4 font-medium tabular-nums text-foreground opacity-0 smooth-shadow-ring-sm">' +
    `<span class="h-3.5 w-[3px] shrink-0 rounded-full" style="background:${escapeHtml(color)}"></span>` +
    `<span class="px-0.5">${escapeHtml(text)}</span></div>`
  return L.divIcon({ html, className: "", iconSize: [0, 0], iconAnchor: [0, 0] })
}

// İşaretçilerin çevresi kutuya kapatılmaz.
const PIN_CLEARANCE = 16

type LabelItem = { marker: LeafletNs.Marker; path: [number, number][] }

/** Kutuları pikselde yerleştirir; yakınlaştırma ve kaydırmadan sonra yeniden çağrılır. */
function placeLabels(
  map: LeafletNs.Map,
  items: LabelItem[],
  allPaths: [number, number][][],
  pins: [number, number][],
  overlays: (HTMLElement | null | undefined)[],
) {
  const size = map.getSize()
  const base = map.getContainer().getBoundingClientRect()
  const px = (ll: [number, number]) => map.latLngToContainerPoint(ll)
  const segments = allPaths.map((p) => p.map(px))
  const blocked: Rect[] = [
    ...pins.map((ll) => {
      const p = px(ll)
      return { x: p.x - PIN_CLEARANCE, y: p.y - PIN_CLEARANCE, w: PIN_CLEARANCE * 2, h: PIN_CLEARANCE * 2 }
    }),
    ...overlays.flatMap((el) => {
      if (!el) return []
      const r = el.getBoundingClientRect()
      return [{ x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }]
    }),
  ]
  const bounds = { x: 4, y: 4, w: size.x - 8, h: size.y - 8 }

  for (const { marker, path } of items) {
    const el = marker.getElement()?.firstElementChild as HTMLElement | null
    if (!el) continue
    const placement = placeLabel({
      path: path.map(px),
      size: { w: el.offsetWidth, h: el.offsetHeight },
      segments,
      blocked,
      bounds,
    })
    if (!placement) continue
    const anchor = px([marker.getLatLng().lat, marker.getLatLng().lng])
    el.style.transform = `translate(${placement.rect.x - anchor.x}px, ${placement.rect.y - anchor.y}px)`
    el.style.flexDirection = placement.barRight ? "row-reverse" : "row"
    el.style.opacity = "1"
    blocked.push(placement.rect)
  }
}

/** Araba: koyu ince kenar + beyaz kontur + renkli çekirdek. Yaya: beyaz halkalı noktalar. */
function legLines(
  L: typeof LeafletNs,
  path: [number, number][],
  color: string,
  mode: RouteMode,
): LeafletNs.Polyline[] {
  const base = { interactive: false, lineCap: "round", lineJoin: "round" } as const
  if (mode === "car") {
    return [
      L.polyline(path, { ...base, color: "#000", opacity: 0.18, weight: 8.5 }),
      L.polyline(path, { ...base, color: "#fff", weight: 7 }),
      L.polyline(path, { ...base, color, weight: 4 }),
    ]
  }
  // Sıfır uzunluklu tire + yuvarlak uç = nokta.
  const dots = { ...base, dashArray: "0.1 10" }
  return [
    L.polyline(path, { ...dots, color: "#fff", weight: 8 }),
    L.polyline(path, { ...dots, color, weight: 5 }),
  ]
}

type RouteState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; route: RouteResult; note?: string }

const MODE_LABEL: Record<RouteMode, string> = { car: "Araba", walk: "Yaya" }

export function BasketRouteMap({ home, stops, compareStops }: RouteMapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  // Kutuların kapatmaması gereken kontroller.
  const modeRef = React.useRef<HTMLDivElement>(null)
  const zoomRef = React.useRef<HTMLDivElement>(null)
  const statusRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<LeafletNs.Map | null>(null)
  const LRef = React.useRef<typeof LeafletNs | null>(null)
  const [ready, setReady] = React.useState(false)
  const [mode, setMode] = React.useState<RouteMode>("car")
  const [loaded, setLoaded] = React.useState<{
    key: string
    route: RouteResult | null
    note?: string
  } | null>(null)

  // Bacak i, sıralı i. şubeye gider; son bacak eve döner.
  const ordered = React.useMemo(() => orderStops(home, stops), [home, stops])
  const orderedCompare = React.useMemo(
    () => (compareStops ? orderStops(home, compareStops) : null),
    [home, compareStops],
  )

  // Kurulum bir kez çalışır; güncel noktalara ref üzerinden ulaşır.
  const pointsRef = React.useRef({ home, stops })
  React.useEffect(() => {
    pointsRef.current = { home, stops }
  })

  React.useEffect(() => {
    let cancelled = false
    let map: LeafletNs.Map | null = null

    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current) return
      LRef.current = L
      const { home, stops } = pointsRef.current

      map = L.map(containerRef.current, {
        zoomControl: false,
        // Sohbet kaydırılırken harita sayfayı yakalamasın.
        scrollWheelZoom: false,
        dragging: !L.Browser.mobile,
      })
      mapRef.current = map
      map.attributionControl?.setPrefix(false)
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map)
      map.attributionControl?.addAttribution(ORS_ATTRIBUTION)

      for (const s of stops) {
        L.marker([s.lat, s.lng], { icon: depotIcon(L, s.market), interactive: false, keyboard: false }).addTo(map)
      }
      L.marker([home.lat, home.lng], {
        icon: userDotIcon(L),
        interactive: false,
        keyboard: false,
        zIndexOffset: 500,
      }).addTo(map)
      const bounds = L.latLngBounds([[home.lat, home.lng]])
      for (const s of stops) bounds.extend([s.lat, s.lng])
      map.fitBounds(bounds, FIT)

      requestAnimationFrame(() => {
        if (!cancelled) map?.invalidateSize()
      })
      setReady(true)
    })

    return () => {
      cancelled = true
      mapRef.current = null
      LRef.current = null
      map?.remove()
    }
  }, [])

  const stopsKey = JSON.stringify(ordered)
  const compareKey = JSON.stringify(orderedCompare)
  const requestKey = `${mode}|${stopsKey}|${compareKey}`

  React.useEffect(() => {
    if (!ready) return
    let cancelled = false
    const compare = JSON.parse(compareKey) as GeoPoint[] | null
    void Promise.all([
      fetchRoute(mode, JSON.parse(stopsKey) as GeoPoint[]),
      compare ? fetchRoute(mode, compare) : Promise.resolve(null),
    ]).then(([route, single]) => {
      if (cancelled) return
      setLoaded({
        key: requestKey,
        route,
        note:
          route && single
            ? compareDuration(route.durationS, single.durationS)
            : undefined,
      })
    })
    return () => {
      cancelled = true
    }
  }, [ready, mode, stopsKey, compareKey, requestKey])

  // Araba/Yaya değişince eski sonuç gösterilmez; anahtar tutana kadar yükleniyor.
  const current = loaded?.key === requestKey ? loaded : null
  const state: RouteState = !current
    ? { status: "loading" }
    : current.route
      ? { status: "ok", route: current.route, note: current.note }
      : { status: "error" }

  React.useEffect(() => {
    const map = mapRef.current
    const L = LRef.current
    const route = current?.route
    if (!map || !L || !route) return
    const lines: LeafletNs.Layer[] = []
    const labels: LeafletNs.Layer[] = []

    // Bacak bilgisi yoksa rota yine de tek çizgi olarak çizilir.
    if (route.legs.length === 0) {
      lines.push(...legLines(L, route.path, getMarketColor(ordered[0]?.market), mode))
    }
    const items: LabelItem[] = []
    route.legs.forEach((leg, i) => {
      const path = route.path.slice(leg.start, leg.end + 1)
      if (path.length < 2) return
      const stop = ordered[i]
      const color = stop ? getMarketColor(stop.market) : RETURN_COLOR
      const layers = legLines(L, path, color, mode)
      // Dönüş en alta: gidişle aynı yoldan geçerse renkli bacak üstte kalır.
      if (stop) lines.push(...layers)
      else lines.unshift(...layers)
      if (!stop) return
      const marker = L.marker(pointAlong(path, 0.5), {
        icon: legLabelIcon(
          L,
          `${formatDuration(leg.durationS)} · ${formatDistance(leg.distanceM)}`,
          color,
        ),
        interactive: false,
        keyboard: false,
        zIndexOffset: 1000,
      })
      labels.push(marker)
      items.push({ marker, path })
    })
    for (const layer of [...lines, ...labels]) layer.addTo(map)

    const pins: [number, number][] = [
      [home.lat, home.lng],
      ...stops.map((s): [number, number] => [s.lat, s.lng]),
    ]
    const place = () =>
      placeLabels(map, items, [route.path], pins, [
        modeRef.current,
        zoomRef.current,
        statusRef.current,
        map.attributionControl?.getContainer(),
      ])
    map.on("moveend resize", place)
    map.fitBounds(L.latLngBounds(route.path), FIT)
    place()

    return () => {
      map.off("moveend resize", place)
      for (const layer of [...lines, ...labels]) layer.remove()
    }
  }, [current, mode, ordered, home, stops])

  const description =
    state.status === "ok"
      ? `${MODE_LABEL[mode]} ile gidiş dönüş ${formatDuration(state.route.durationS)}, ${formatDistance(state.route.distanceM)}.${state.note ? ` ${state.note}.` : ""}`
      : "Evinden şubelere rota haritası."

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} role="img" aria-label={description} className="size-full" />
      <div ref={modeRef} className="absolute top-2 left-2 z-[1000] rounded-[calc(var(--radius-lg)+2px)] bg-background p-0.5 smooth-shadow-ring-sm">
        <SegmentedControl size="xs" value={mode} onValueChange={setMode} aria-label="Ulaşım şekli">
          <SegmentedControlItem value="car">
            <RiCarLine aria-hidden="true" />
            {MODE_LABEL.car}
          </SegmentedControlItem>
          <SegmentedControlItem value="walk">
            <RiWalkLine aria-hidden="true" />
            {MODE_LABEL.walk}
          </SegmentedControlItem>
        </SegmentedControl>
      </div>
      <div ref={zoomRef} className="absolute top-2 right-2 z-[1000] flex flex-col gap-1">
        <Button type="button" variant="outline" size="icon-xs" aria-label="Yakınlaştır" onClick={() => mapRef.current?.zoomIn()}>
          <RiAddLine />
        </Button>
        <Button type="button" variant="outline" size="icon-xs" aria-label="Uzaklaştır" onClick={() => mapRef.current?.zoomOut()}>
          <RiSubtractLine />
        </Button>
      </div>
      <div
        ref={statusRef}
        role="status"
        className={cn(
          "absolute bottom-6 left-2 z-[1000] flex gap-1.5 rounded-md bg-background py-1 pr-2 smooth-shadow-ring-sm",
          state.status === "ok" ? "pl-1.5" : "pl-2",
        )}
      >
        {state.status === "ok" ? (
          <span aria-hidden="true" className="my-0.5 w-[3px] shrink-0 self-stretch rounded-full bg-[#1a73e8]" />
        ) : null}
        {state.status === "ok" ? (
          <div>
            <p className="text-xs font-medium tabular-nums">
              Gidiş dönüş {formatDuration(state.route.durationS)} · {formatDistance(state.route.distanceM)}
            </p>
            {state.note && (
              <p className="text-[0.6875rem] text-muted-foreground">{state.note}</p>
            )}
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {state.status === "loading" ? (
              <>
                <Spinner className="size-3" />
                Rota hesaplanıyor
              </>
            ) : (
              "Rota şu an hesaplanamadı"
            )}
          </p>
        )}
      </div>
    </div>
  )
}
