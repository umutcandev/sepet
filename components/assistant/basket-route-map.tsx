"use client"

import "leaflet/dist/leaflet.css"

import * as React from "react"
import type * as LeafletNs from "leaflet"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  RiAddLine,
  RiCarLine,
  RiSubtractLine,
  RiWalkLine,
} from "@remixicon/react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { loadLeaflet, TILE_ATTRIBUTION, TILE_URL } from "@/lib/leaflet"
import {
  depotIcon,
  escapeHtml,
  userDotIcon,
  wireBrokenThumbs,
} from "@/lib/leaflet-icons"
import { placeLabel, type Rect } from "@/lib/geo/label-placement"
import {
  cumulativeLengths,
  curveBetween,
  pathUntil,
  pointAt,
  type LatLngTuple,
} from "@/lib/geo/path"
import { getMarketColor } from "@/lib/markets/registry"
import { EASE_OUT_EXPO } from "@/lib/motion"
import { cn } from "@/lib/utils"
import {
  compareDuration,
  formatDistance,
  formatDuration,
  haversineKm,
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

// Kontrollerin ve işaretçilerin payı kadar dar güvenli alan; ondalıklı zoom ile en yakın görünüm.
const FIT: LeafletNs.FitBoundsOptions = {
  paddingTopLeft: [24, 40],
  paddingBottomRight: [40, 52],
  maxZoom: 17,
}

// Dönüş normalde renkli bacakların altında; çizilirken üste çıkar.
const PANE_LEGS = "routeLegs"
const PANE_RETURN = "routeReturn"
const Z_LEGS = "420"
const Z_RETURN = "410"
const Z_RETURN_TOP = "430"
const DIMMED = "0.3"

const START_DELAY_MS = 350
const ROUTE_MS = 3600
const LEG_MIN_MS = 550
const LEG_MAX_MS = 1400
const LEG_PAUSE_MS = 220
const HOLD_MS = 700
const ROTATE_MS = 4000

const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)

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

/** Dış kutu yerleşimi taşır, iç kutu belirir; renkli çizgi rotaya bakan kenarda. */
function legLabelIcon(L: typeof LeafletNs, text: string, color: string) {
  const html =
    '<div class="w-max">' +
    '<div class="flex items-center gap-[3px] rounded-[4px] bg-background py-px px-[3px] font-sans text-[9px] leading-3 font-medium tabular-nums whitespace-nowrap text-foreground smooth-shadow-ring-sm opacity-0 scale-90 transition-[opacity,scale] duration-300 ease-out data-shown:opacity-100 data-shown:scale-100 motion-reduce:transition-none">' +
    `<span class="h-2 w-[2px] shrink-0 rounded-full" style="background:${escapeHtml(color)}"></span>` +
    `<span>${escapeHtml(text)}</span></div></div>`
  return L.divIcon({ html, className: "", iconSize: [0, 0], iconAnchor: [0, 0] })
}

// İşaretçilerin çevresi kutuya kapatılmaz.
const PIN_CLEARANCE = 16

type LabelItem = { marker: LeafletNs.Marker; path: LatLngTuple[]; shown: boolean }

/** Görünür kutuları sırayla pikselde yerleştirir; sıra sabit olduğundan önceki kutular kaymaz. */
function placeLabels(
  map: LeafletNs.Map,
  items: LabelItem[],
  allPaths: LatLngTuple[][],
  pins: LatLngTuple[],
  overlays: (Element | null | undefined)[],
) {
  const size = map.getSize()
  const base = map.getContainer().getBoundingClientRect()
  const px = (ll: LatLngTuple) => map.latLngToContainerPoint(ll)
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

  for (const { marker, path, shown } of items) {
    if (!shown) continue
    const el = marker.getElement()?.firstElementChild as HTMLElement | null
    const box = el?.firstElementChild as HTMLElement | null
    if (!el || !box) continue
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
    box.style.flexDirection = placement.barRight ? "row-reverse" : "row"
    box.dataset.shown = ""
    blocked.push(placement.rect)
  }
}

/** Araba: koyu ince kenar + ince beyaz kontur + renkli çekirdek. Yaya: beyaz halkalı noktalar. */
function legLines(
  L: typeof LeafletNs,
  color: string,
  mode: RouteMode,
  pane: string,
): LeafletNs.Polyline[] {
  const base = { interactive: false, lineCap: "round", lineJoin: "round", pane } as const
  if (mode === "car") {
    return [
      L.polyline([], { ...base, color: "#000", opacity: 0.18, weight: 6.5 }),
      L.polyline([], { ...base, color: "#fff", weight: 5.5 }),
      L.polyline([], { ...base, color, weight: 4 }),
    ]
  }
  // Sıfır uzunluklu tire + yuvarlak uç = nokta.
  const dots = { ...base, dashArray: "0.1 10" }
  return [
    L.polyline([], { ...dots, color: "#fff", weight: 7 }),
    L.polyline([], { ...dots, color, weight: 5 }),
  ]
}

type Stroke = {
  path: LatLngTuple[]
  cum: number[]
  layers: LeafletNs.Polyline[]
}

/** `lead`/`tail`: gerçek nokta ile rotanın yola bağlandığı nokta arasındaki kavisli bağlantı. */
type Leg = Stroke & {
  label: LabelItem | null
  isReturn: boolean
  lead: Stroke | null
  tail: Stroke | null
}

// Bundan kısa sapmalar çizilmez.
const LINK_MIN_M = 12
const LINK_MS = 260

/** Ev veya şube rotadan uzaktaysa ince gri noktalı kavis; değilse null. */
function linkStroke(
  L: typeof LeafletNs,
  from: LatLngTuple,
  to: LatLngTuple,
  pane: string,
): Stroke | null {
  const gap = haversineKm({ lat: from[0], lng: from[1] }, { lat: to[0], lng: to[1] }) * 1000
  if (gap < LINK_MIN_M) return null
  const path = curveBetween(from, to)
  const base = { interactive: false, lineCap: "round", dashArray: "0.1 5", pane } as const
  return {
    path,
    cum: cumulativeLengths(path),
    layers: [
      L.polyline([], { ...base, color: "#fff", weight: 5 }),
      L.polyline([], { ...base, color: RETURN_COLOR, weight: 3 }),
    ],
  }
}

type RouteState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; route: RouteResult; note?: string }

const MODES = [
  { value: "car", label: "Sürüş", Icon: RiCarLine },
  { value: "walk", label: "Yaya", Icon: RiWalkLine },
] as const

const MODE_PHRASE: Record<RouteMode, string> = { car: "Arabayla", walk: "Yürüyerek" }

/** Satırlar aynı yerde sırayla değişir; kutu en uzun satır kadar geniş kalır. */
function RotatingLine({ lines }: { lines: React.ReactNode[] }) {
  const [index, setIndex] = React.useState(0)
  const reduceMotion = useReducedMotion()
  React.useEffect(() => {
    if (lines.length < 2) return
    const id = window.setInterval(() => setIndex((i) => i + 1), ROTATE_MS)
    return () => window.clearInterval(id)
  }, [lines.length])
  const active = index % lines.length
  const shift = reduceMotion ? 0 : 8

  return (
    <div aria-hidden="true" className="grid overflow-hidden font-medium">
      {lines.map((line, i) => (
        <span key={i} className="invisible col-start-1 row-start-1 whitespace-nowrap">
          {line}
        </span>
      ))}
      <AnimatePresence initial={false}>
        <motion.span
          key={active}
          className="col-start-1 row-start-1 whitespace-nowrap"
          initial={{ opacity: 0, y: shift }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -shift }}
          transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
        >
          {lines[active]}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

/** Rotadaki marketlerin renkleri yan yana parçalı tek çubuk. */
function MarketSwatch({ colors }: { colors: string[] }) {
  return (
    <span className="flex h-[3px] w-3 shrink-0 overflow-hidden rounded-full">
      {(colors.length ? colors : [RETURN_COLOR]).map((c) => (
        <span key={c} className="flex-1" style={{ backgroundColor: c }} />
      ))}
    </span>
  )
}

export function BasketRouteMap({ home, stops, compareStops }: RouteMapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  // Kutuların kapatmaması gereken kontroller.
  const legendRef = React.useRef<HTMLDivElement>(null)
  const controlsRef = React.useRef<HTMLDivElement>(null)
  const statusRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<LeafletNs.Map | null>(null)
  const LRef = React.useRef<typeof LeafletNs | null>(null)
  const depotMarkersRef = React.useRef<LeafletNs.Marker[]>([])
  const [ready, setReady] = React.useState(false)
  const [mode, setMode] = React.useState<RouteMode>("car")
  const [loaded, setLoaded] = React.useState<{
    key: string
    route: RouteResult | null
    note?: string
  } | null>(null)
  const reduceMotion = useReducedMotion()

  // Çağıran her render'da yeni dizi verebilir; değer aynıysa rota ve animasyon yeniden başlamaz.
  const pointsKey = JSON.stringify([home, stops, compareStops ?? null])
  const { homePt, ordered, orderedCompare } = React.useMemo(() => {
    const [h, s, c] = JSON.parse(pointsKey) as [GeoPoint, DepotStop[], GeoPoint[] | null]
    // Bacak i, sıralı i. şubeye gider; son bacak eve döner.
    return { homePt: h, ordered: orderStops(h, s), orderedCompare: c ? orderStops(h, c) : null }
  }, [pointsKey])
  const legColors = React.useMemo(
    () => [...new Set(ordered.map((s) => getMarketColor(s.market)))],
    [ordered],
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

      const m = L.map(containerRef.current, {
        zoomControl: false,
        zoomSnap: 0.1,
        // Sohbet kaydırılırken tekerlek haritayı yakınlaştırmasın; dokunmatikte tek parmak haritayı kaydırır.
        scrollWheelZoom: false,
      })
      map = m
      mapRef.current = m
      map.attributionControl?.setPrefix(false)
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map)
      map.attributionControl?.addAttribution(ORS_ATTRIBUTION)

      const legsPane = map.createPane(PANE_LEGS)
      legsPane.style.zIndex = Z_LEGS
      legsPane.style.transition = "opacity 300ms ease-out"
      map.createPane(PANE_RETURN).style.zIndex = Z_RETURN

      depotMarkersRef.current = stops.map((s) => {
        const marker = L.marker([s.lat, s.lng], {
          icon: depotIcon(L, s.market, s.products),
          interactive: false,
          keyboard: false,
        }).addTo(m)
        wireBrokenThumbs(marker.getElement())
        return marker
      })
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
      depotMarkersRef.current = []
      map?.remove()
    }
  }, [])

  const requestKey = `${mode}|${pointsKey}`

  React.useEffect(() => {
    if (!ready) return
    let cancelled = false
    void Promise.all([
      fetchRoute(mode, ordered),
      orderedCompare ? fetchRoute(mode, orderedCompare) : Promise.resolve(null),
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
  }, [ready, mode, ordered, orderedCompare, requestKey])

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
    const legsPane = map?.getPane(PANE_LEGS)
    const returnPane = map?.getPane(PANE_RETURN)
    if (!map || !L || !route || !legsPane || !returnPane) return

    // Bacak bilgisi yoksa rota tek renkli bacak olarak çizilir.
    const hasLegs = route.legs.length > 0
    const home: LatLngTuple = [homePt.lat, homePt.lng]
    const spans = hasLegs ? route.legs : [{ start: 0, end: route.path.length - 1, durationS: 0, distanceM: 0 }]
    const legs: Leg[] = []
    for (const [i, span] of spans.entries()) {
      const path = route.path.slice(span.start, span.end + 1)
      if (path.length < 2) continue
      const stop = hasLegs ? ordered[i] : ordered[0]
      const isReturn = hasLegs && !stop
      const color = isReturn ? RETURN_COLOR : getMarketColor(stop?.market)
      const cum = cumulativeLengths(path)
      const label: LabelItem | null =
        hasLegs && !isReturn
          ? {
              marker: L.marker(pointAt(path, cum, 0.5), {
                icon: legLabelIcon(
                  L,
                  `${formatDuration(span.durationS)} · ${formatDistance(span.distanceM)}`,
                  color,
                ),
                interactive: false,
                keyboard: false,
                zIndexOffset: 1000,
              }),
              path,
              shown: false,
            }
          : null
      const pane = isReturn ? PANE_RETURN : PANE_LEGS
      // Rota yola bağlandığı noktadan başlar; ev ve şubeyle arası kavisle kapanır.
      const target: LatLngTuple | null = !hasLegs || isReturn ? home : stop ? [stop.lat, stop.lng] : null
      legs.push({
        path,
        cum,
        layers: legLines(L, color, mode, pane),
        label,
        isReturn,
        lead: legs.length === 0 && !isReturn ? linkStroke(L, home, path[0], pane) : null,
        tail: target ? linkStroke(L, path[path.length - 1], target, pane) : null,
      })
    }
    const outbound = legs.filter((l) => !l.isReturn)
    const back = legs.find((l) => l.isReturn) ?? null
    const totalLength = legs.reduce((sum, l) => sum + (l.cum.at(-1) ?? 0), 0) || 1
    const strokes = legs.flatMap((l) => [l.lead, l, l.tail].filter((s): s is Stroke => s !== null))

    for (const stroke of strokes) {
      for (const layer of stroke.layers) layer.addTo(map)
    }
    for (const leg of legs) leg.label?.marker.addTo(map)

    const labels = legs.flatMap((l) => (l.label ? [l.label] : []))
    const pins: LatLngTuple[] = [home, ...ordered.map((s): LatLngTuple => [s.lat, s.lng])]
    const linkPaths = legs.flatMap((l) => [l.lead, l.tail].flatMap((s) => (s ? [s.path] : [])))
    const place = () =>
      placeLabels(map, labels, [route.path, ...linkPaths], pins, [
        legendRef.current,
        controlsRef.current,
        statusRef.current,
        map.attributionControl?.getContainer(),
        ...depotMarkersRef.current.map((m) => m.getElement()?.querySelector("[data-badge]")),
      ])
    map.on("moveend resize", place)
    map.fitBounds(L.latLngBounds([...route.path, ...pins]), FIT)

    const show = (stroke: Stroke, pts: LatLngTuple[]) => {
      for (const layer of stroke.layers) layer.setLatLngs(pts)
    }
    const reveal = (leg: Leg) => {
      if (leg.label) leg.label.shown = true
    }
    const restore = () => {
      legsPane.style.opacity = ""
      returnPane.style.zIndex = Z_RETURN
    }

    let dead = false
    let raf = 0
    const timers: number[] = []
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, ms))
      })
    const animate = (stroke: Stroke, ms: number, onHalf?: () => void) =>
      new Promise<void>((resolve) => {
        const t0 = performance.now()
        const step = (now: number) => {
          const f = Math.min(1, (now - t0) / ms)
          const drawn = easeInOut(f)
          show(stroke, pathUntil(stroke.path, stroke.cum, drawn))
          if (onHalf && drawn >= 0.5) {
            onHalf()
            onHalf = undefined
          }
          if (f < 1) raf = requestAnimationFrame(step)
          else resolve()
        }
        raf = requestAnimationFrame(step)
      })
    const draw = async (leg: Leg) => {
      if (leg.lead) await animate(leg.lead, LINK_MS)
      const share = (leg.cum.at(-1) ?? 0) / totalLength
      // Kutu bacağın ortasında durur; çizgi oraya varınca belirir.
      await animate(leg, Math.min(LEG_MAX_MS, Math.max(LEG_MIN_MS, share * ROUTE_MS)), () => {
        reveal(leg)
        place()
      })
      if (leg.tail) await animate(leg.tail, LINK_MS)
    }

    if (reduceMotion) {
      for (const stroke of strokes) show(stroke, stroke.path)
      for (const leg of legs) reveal(leg)
      place()
    } else {
      // Bacaklar sırayla çizilir; dönüş en sonda öne çıkar.
      void (async () => {
        await wait(START_DELAY_MS)
        for (const leg of outbound) {
          if (dead) return
          await draw(leg)
          await wait(LEG_PAUSE_MS)
        }
        if (dead || !back) return
        legsPane.style.opacity = DIMMED
        returnPane.style.zIndex = Z_RETURN_TOP
        await draw(back)
        await wait(HOLD_MS)
        restore()
      })()
    }

    return () => {
      dead = true
      cancelAnimationFrame(raf)
      for (const t of timers) window.clearTimeout(t)
      restore()
      map.off("moveend resize", place)
      for (const stroke of strokes) {
        for (const layer of stroke.layers) layer.remove()
      }
      for (const leg of legs) leg.label?.marker.remove()
    }
  }, [current, mode, ordered, homePt, reduceMotion])

  const description =
    state.status === "ok"
      ? `${MODE_PHRASE[mode]} gidiş dönüş ${formatDuration(state.route.durationS)}, ${formatDistance(state.route.distanceM)}.${state.note ? ` ${state.note}.` : ""}`
      : "Evinden şubelere rota haritası."

  const lines: React.ReactNode[] =
    state.status === "ok"
      ? [
          `Gidiş dönüş ${formatDuration(state.route.durationS)} · ${formatDistance(state.route.distanceM)}`,
          ...(state.note ? [state.note] : []),
        ]
      : []

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} role="img" aria-label={description} className="size-full" />
      <div
        ref={legendRef}
        aria-hidden="true"
        className="absolute top-2 left-2 z-[1000] flex items-center gap-2 rounded-md bg-background px-1.5 py-1 text-[0.625rem] leading-3 font-medium text-foreground smooth-shadow-ring-sm"
      >
        <span className="flex items-center gap-1">
          <MarketSwatch colors={legColors} />
          Gidiş
        </span>
        <span className="flex items-center gap-1">
          <span className="h-[3px] w-3 shrink-0 rounded-full" style={{ backgroundColor: RETURN_COLOR }} />
          Dönüş
        </span>
      </div>
      <div ref={controlsRef} className="absolute top-2 right-2 z-[1000] flex flex-col gap-1">
        <Button type="button" variant="outline" size="icon-xs" aria-label="Yakınlaştır" onClick={() => mapRef.current?.zoomIn()}>
          <RiAddLine />
        </Button>
        <Button type="button" variant="outline" size="icon-xs" aria-label="Uzaklaştır" onClick={() => mapRef.current?.zoomOut()}>
          <RiSubtractLine />
        </Button>
        <div role="group" aria-label="Ulaşım şekli" className="mt-1.5 flex flex-col gap-1">
          {MODES.map(({ value, label, Icon }) => (
            <Button
              key={value}
              type="button"
              variant="outline"
              size="icon-xs"
              aria-label={label}
              aria-pressed={mode === value}
              title={label}
              className={cn(mode === value && "text-primary")}
              onClick={() => setMode(value)}
            >
              <Icon />
            </Button>
          ))}
        </div>
      </div>
      <div
        ref={statusRef}
        className={cn(
          "absolute bottom-6 left-2 z-[1000] flex gap-1.5 rounded-md bg-background py-1 pr-2 text-xs tabular-nums smooth-shadow-ring-sm",
          state.status === "ok" ? "pl-1.5" : "pl-2",
        )}
      >
        <span role="status" className="sr-only">
          {state.status === "ok"
            ? description
            : state.status === "loading"
              ? "Rota hesaplanıyor"
              : "Rota şu an hesaplanamadı"}
        </span>
        {state.status === "ok" ? (
          <>
            <span aria-hidden="true" className="my-0.5 w-[3px] shrink-0 self-stretch rounded-full bg-primary" />
            <RotatingLine key={requestKey} lines={lines} />
          </>
        ) : (
          <p aria-hidden="true" className="flex items-center gap-1.5 text-muted-foreground">
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
