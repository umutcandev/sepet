"use client"

import "maplibre-gl/dist/maplibre-gl.css"

import * as React from "react"
import type * as MapLibreNs from "maplibre-gl"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  RiAddLine,
  RiCarLine,
  RiSubtractLine,
  RiWalkLine,
} from "@remixicon/react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  createBasicMap,
  loadMapLibre,
  toLngLat,
  useBasicMapTheme,
} from "@/lib/map/maplibre"
import {
  depotIcon,
  escapeHtml,
  markerElement,
  markerZIndex,
  userDotIcon,
  wireBrokenThumbs,
  type MarkerIcon,
} from "@/lib/map/markers"
import { LEAFLET_ZOOM_OFFSET } from "@/lib/map/style"
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

// Eve dönüş bacağı market rengi taşımaz.
const RETURN_COLOR = "#6B7280"

// Kontrollerin ve işaretçilerin payı kadar dar güvenli alan; ondalıklı zoom ile en yakın görünüm.
const FIT: MapLibreNs.FitBoundsOptions = {
  padding: { top: 40, left: 24, right: 40, bottom: 52 },
  maxZoom: 17 - LEAFLET_ZOOM_OFFSET,
}

// Dönüş normalde renkli bacakların altında; çizilirken üste çıkar ve
// bacaklar soluklaşır.
const DIMMED = 0.3
const DIM_MS = 300

// Ev noktası şubelerin, bacak kutuları her şeyin üstünde.
const Z_HOME = 1_000_000
const Z_LABEL = 2_000_000

const START_DELAY_MS = 350
const ROUTE_MS = 3600
const LEG_MIN_MS = 550
const LEG_MAX_MS = 1400
const LEG_PAUSE_MS = 220
const HOLD_MS = 700
const ROTATE_MS = 4000

const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)

// Aynı rota oturumda bir kez istenir; harita kapanıp açılınca yeniden gitmez.
// Ev sunucuya gönderilmez (kayıtlı konum kullanılır) ama anahtarda: konum
// değişince eski evden çizilmiş rota dönmesin.
const routeCache = new Map<string, Promise<RouteResult | null>>()

function fetchRoute(
  mode: RouteMode,
  home: GeoPoint,
  stops: GeoPoint[],
): Promise<RouteResult | null> {
  const key = `${mode}:${home.lat},${home.lng}:${stops.map((s) => `${s.lat},${s.lng}`).join("|")}`
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
function legLabelIcon(text: string, color: string): MarkerIcon {
  const html =
    '<div class="w-max">' +
    '<div class="flex items-center gap-[3px] rounded-[4px] bg-background py-px px-[3px] font-sans text-[9px] leading-3 font-medium tabular-nums whitespace-nowrap text-foreground smooth-shadow-ring-sm opacity-0 scale-90 transition-[opacity,scale] duration-300 ease-out data-shown:opacity-100 data-shown:scale-100 motion-reduce:transition-none">' +
    `<span class="h-2 w-[2px] shrink-0 rounded-full" style="background:${escapeHtml(color)}"></span>` +
    `<span>${escapeHtml(text)}</span></div></div>`
  return { html, width: 0, height: 0, anchor: "top-left" }
}

// İşaretçilerin çevresi kutuya kapatılmaz.
const PIN_CLEARANCE = 16

type LabelItem = { marker: MapLibreNs.Marker; path: LatLngTuple[]; shown: boolean }

/** Görünür kutuları sırayla pikselde yerleştirir; sıra sabit olduğundan önceki kutular kaymaz. */
function placeLabels(
  map: MapLibreNs.Map,
  items: LabelItem[],
  allPaths: LatLngTuple[][],
  pins: LatLngTuple[],
  overlays: (Element | null | undefined)[],
) {
  const container = map.getContainer()
  const base = container.getBoundingClientRect()
  const px = (ll: LatLngTuple) => map.project(toLngLat(ll))
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
  const bounds = { x: 4, y: 4, w: container.clientWidth - 8, h: container.clientHeight - 8 }

  for (const { marker, path, shown } of items) {
    if (!shown) continue
    const el = marker.getElement().firstElementChild as HTMLElement | null
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
    const anchor = map.project(marker.getLngLat())
    el.style.transform = `translate(${placement.rect.x - anchor.x}px, ${placement.rect.y - anchor.y}px)`
    box.style.flexDirection = placement.barRight ? "row-reverse" : "row"
    box.dataset.shown = ""
    blocked.push(placement.rect)
  }
}

/** Tek bir çizgi katmanı; genişlik ve tire aralıkları piksel. */
type LineSpec = {
  color: string
  /** Çizgi kalınlığı; noktalıda noktanın çapı (piksel). */
  width: number
  opacity?: number
  /** Varsa çizgi yerine bu aralıkla (piksel) dizilmiş noktalar. */
  dots?: number
}

/** Araba: koyu ince kenar + ince beyaz kontur + renkli çekirdek. Yaya: beyaz halkalı noktalar. */
function legLines(color: string, mode: RouteMode): LineSpec[] {
  if (mode === "car") {
    return [
      { color: "#000", opacity: 0.18, width: 6.5 },
      { color: "#fff", width: 5.5 },
      { color, width: 4 },
    ]
  }
  return [
    { color: "#fff", width: 7, dots: 10 },
    { color, width: 5, dots: 10 },
  ]
}

/** Bir çizginin kendi GeoJSON kaynağı ve üst üste çizilen katmanları. */
type Stroke = {
  path: LatLngTuple[]
  cum: number[]
  source: string
  /** `core`: en üstteki renkli katman; altındakiler kontur/gölge. */
  layers: {
    id: string
    opacity: number
    prop: "line-opacity" | "circle-opacity"
    core: boolean
  }[]
  /** Gidiş bacakları (bağlantılarıyla) dönüş çizilirken soluklaşır. */
  dims: boolean
  /** Noktalıysa noktalar arası piksel; noktalar zoom değişince yeniden dizilir. */
  dots: number | null
  /** Şu an çizili kısım. */
  shown: LatLngTuple[]
}

/** `lead`/`tail`: gerçek nokta ile rotanın yola bağlandığı nokta arasındaki kavisli bağlantı. */
type Leg = Stroke & {
  label: LabelItem | null
  isReturn: boolean
  lead: Stroke | null
  tail: Stroke | null
}

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] }

function lineData(pts: LatLngTuple[]): GeoJSON.FeatureCollection | GeoJSON.Feature {
  if (pts.length < 2) return EMPTY
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: pts.map(toLngLat) },
  }
}

/**
 * Yolun başından itibaren ekranda her `pitch` pikselde bir nokta. MapLibre'nin
 * tire deseni ara zoom'larda çizgiyle birlikte uzuyor (nokta ovalleşir); noktalar
 * burada ekran pikseliyle dizildiği için her zoom'da yuvarlak ve eşit aralıklı.
 */
function dotsData(
  map: MapLibreNs.Map,
  pts: LatLngTuple[],
  pitch: number,
): GeoJSON.FeatureCollection | GeoJSON.Feature {
  if (pts.length < 2) return EMPTY
  const px = pts.map((p) => map.project(toLngLat(p)))
  const out: [number, number][] = []
  let next = 0
  let walked = 0
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(px[i].x - px[i - 1].x, px[i].y - px[i - 1].y)
    while (next <= walked + seg) {
      const t = seg ? (next - walked) / seg : 0
      const [a, b] = [pts[i - 1], pts[i]]
      out.push([a[1] + (b[1] - a[1]) * t, a[0] + (b[0] - a[0]) * t])
      next += pitch
    }
    walked += seg
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "MultiPoint", coordinates: out },
  }
}

/** Boş kaynak + katmanlar; çizgi `showStroke` ile görünür. Katmanlar en üste eklenir. */
function addStroke(
  map: MapLibreNs.Map,
  id: string,
  path: LatLngTuple[],
  lines: LineSpec[],
  dims: boolean,
): Stroke {
  map.addSource(id, { type: "geojson", data: EMPTY })
  const fade = { duration: dims ? DIM_MS : 0, delay: 0 }
  const layers = lines.map(({ color, width, opacity = 1, dots }, i) => {
    const layerId = `${id}-${i}`
    if (dots) {
      map.addLayer({
        id: layerId,
        type: "circle",
        source: id,
        paint: {
          "circle-color": color,
          "circle-radius": width / 2,
          "circle-opacity": opacity,
          "circle-opacity-transition": fade,
        },
      })
      return { id: layerId, opacity, prop: "circle-opacity" as const, core: i === lines.length - 1 }
    }
    map.addLayer({
      id: layerId,
      type: "line",
      source: id,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": color,
        "line-width": width,
        "line-opacity": opacity,
        "line-opacity-transition": fade,
      },
    })
    return { id: layerId, opacity, prop: "line-opacity" as const, core: i === lines.length - 1 }
  })
  return {
    path,
    cum: cumulativeLengths(path),
    source: id,
    layers,
    dims,
    dots: lines.find((l) => l.dots)?.dots ?? null,
    shown: [],
  }
}

function showStroke(map: MapLibreNs.Map, stroke: Stroke, pts: LatLngTuple[]) {
  stroke.shown = pts
  map
    .getSource<MapLibreNs.GeoJSONSource>(stroke.source)
    ?.setData(stroke.dots ? dotsData(map, pts, stroke.dots) : lineData(pts))
}

function removeStroke(map: MapLibreNs.Map, stroke: Stroke) {
  for (const { id } of stroke.layers) if (map.getLayer(id)) map.removeLayer(id)
  if (map.getSource(stroke.source)) map.removeSource(stroke.source)
}

// Bundan kısa sapmalar çizilmez.
const LINK_MIN_M = 12
const LINK_MS = 260

/** Ev veya şube rotadan uzaktaysa ince gri noktalı kavis; değilse null. */
function linkStroke(
  map: MapLibreNs.Map,
  id: string,
  from: LatLngTuple,
  to: LatLngTuple,
  dims: boolean,
): Stroke | null {
  const gap = haversineKm({ lat: from[0], lng: from[1] }, { lat: to[0], lng: to[1] }) * 1000
  if (gap < LINK_MIN_M) return null
  return addStroke(
    map,
    id,
    curveBetween(from, to),
    [
      { color: "#fff", width: 5, dots: 5 },
      { color: RETURN_COLOR, width: 3, dots: 5 },
    ],
    dims,
  )
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
  const mapRef = React.useRef<MapLibreNs.Map | null>(null)
  const mlRef = React.useRef<typeof MapLibreNs | null>(null)
  const depotMarkersRef = React.useRef<MapLibreNs.Marker[]>([])
  // Her `style.load`'da artar. WebGL bağlamı kaybolup geri gelince (mobilde
  // sekme arka plana atılınca olur) stil baştan kurulur ve rota katmanları
  // gider; sayaç değişince rota yeniden eklenir.
  const [styleLoads, setStyleLoads] = React.useState(0)
  const ready = styleLoads > 0
  const themeRef = useBasicMapTheme(mapRef, ready)
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
    let map: MapLibreNs.Map | null = null

    loadMapLibre().then((ml) => {
      if (cancelled || !containerRef.current) return
      mlRef.current = ml
      const { home, stops } = pointsRef.current

      const bounds = new ml.LngLatBounds([home.lng, home.lat], [home.lng, home.lat])
      for (const s of stops) bounds.extend([s.lng, s.lat])
      const m = createBasicMap(ml, themeRef, {
        container: containerRef.current,
        bounds,
        fitBoundsOptions: FIT,
        zoomSnap: 0.1,
        // Sohbet kaydırılırken tekerlek haritayı yakınlaştırmasın; dokunmatikte tek parmak haritayı kaydırır.
        scrollZoom: false,
      })
      if (!m) return
      map = m
      mapRef.current = m
      m.on("style.load", () => setStyleLoads((n) => n + 1))

      depotMarkersRef.current = stops.map((s) => {
        const icon = depotIcon(s.market, s.products)
        const el = markerElement(icon)
        el.style.zIndex = markerZIndex(s.lat)
        wireBrokenThumbs(el)
        return new ml.Marker({ element: el, anchor: icon.anchor })
          .setLngLat([s.lng, s.lat])
          .addTo(m)
      })
      const dot = userDotIcon()
      const dotEl = markerElement(dot)
      dotEl.style.zIndex = markerZIndex(home.lat, Z_HOME)
      new ml.Marker({ element: dotEl, anchor: dot.anchor })
        .setLngLat([home.lng, home.lat])
        .addTo(m)

      requestAnimationFrame(() => {
        if (!cancelled) map?.resize()
      })
    })

    return () => {
      cancelled = true
      mapRef.current = null
      mlRef.current = null
      depotMarkersRef.current = []
      map?.remove()
    }
  }, [themeRef])

  const requestKey = `${mode}|${pointsKey}`

  // Rota haritayı beklemez: harita kurulamasa da süre ve mesafe gösterilir.
  React.useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetchRoute(mode, homePt, ordered),
      orderedCompare ? fetchRoute(mode, homePt, orderedCompare) : Promise.resolve(null),
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
  }, [mode, homePt, ordered, orderedCompare, requestKey])

  // Araba/Yaya değişince eski sonuç gösterilmez; anahtar tutana kadar yükleniyor.
  const current = loaded?.key === requestKey ? loaded : null
  const state: RouteState = !current
    ? { status: "loading" }
    : current.route
      ? { status: "ok", route: current.route, note: current.note }
      : { status: "error" }

  // Bağlam kaybından sonraki yeniden kurulumda rota baştan oynatılmaz, olduğu
  // gibi yerine konur; kamera da kullanıcının bıraktığı yerde kalır.
  const drawnLoadsRef = React.useRef(0)

  React.useEffect(() => {
    const map = mapRef.current
    const ml = mlRef.current
    const route = current?.route
    if (!map || !ml || !route || !styleLoads) return
    const restored = drawnLoadsRef.current > 0 && drawnLoadsRef.current !== styleLoads
    drawnLoadsRef.current = styleLoads

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
      let label: LabelItem | null = null
      if (hasLegs && !isReturn) {
        const icon = legLabelIcon(
          `${formatDuration(span.durationS)} · ${formatDistance(span.distanceM)}`,
          color,
        )
        const at = pointAt(path, cum, 0.5)
        const el = markerElement(icon)
        el.style.zIndex = markerZIndex(at[0], Z_LABEL)
        label = {
          marker: new ml.Marker({ element: el, anchor: icon.anchor }).setLngLat(toLngLat(at)),
          path,
          shown: false,
        }
      }
      // Rota yola bağlandığı noktadan başlar; ev ve şubeyle arası kavisle kapanır.
      const target: LatLngTuple | null = !hasLegs || isReturn ? home : stop ? [stop.lat, stop.lng] : null
      const id = `route-${i}`
      const dims = !isReturn
      // Katmanlar çizim sırasıyla eklenir: bağlantı, bacak, bağlantı.
      const lead = legs.length === 0 && !isReturn ? linkStroke(map, `${id}-lead`, home, path[0], dims) : null
      const leg = addStroke(map, id, path, legLines(color, mode), dims)
      const tail = target ? linkStroke(map, `${id}-tail`, path[path.length - 1], target, dims) : null
      legs.push({ ...leg, label, isReturn, lead, tail })
    }
    const outbound = legs.filter((l) => !l.isReturn)
    const back = legs.find((l) => l.isReturn) ?? null
    const totalLength = legs.reduce((sum, l) => sum + (l.cum.at(-1) ?? 0), 0) || 1
    const strokes = legs.flatMap((l) => [l.lead, l, l.tail].filter((s): s is Stroke => s !== null))
    const outboundStrokes = strokes.filter((s) => s.dims)
    const returnStrokes = strokes.filter((s) => !s.dims)

    // Katmanlar bağlam kaybında stil ile birlikte gidebilir; yoksa dokunulmaz.
    const each = (group: Stroke[], fn: (layer: Stroke["layers"][number]) => void) => {
      for (const stroke of group) {
        for (const layer of stroke.layers) if (map.getLayer(layer.id)) fn(layer)
      }
    }
    // Grubu kendi sırasını bozmadan en üste taşır.
    const raise = (group: Stroke[]) => each(group, ({ id }) => map.moveLayer(id))
    // Leaflet bacakların panelini tek parça soldururdu. Burada katmanlar ayrı
    // soluyor; alttaki beyaz kontur aynı oranda solarsa renkli çekirdeğin
    // altından görünür ve çizgi beyazımsı kalır. Kontur/gölge daha çok solar.
    const dim = (factor: number) =>
      each(outboundStrokes, ({ id, prop, opacity, core }) =>
        map.setPaintProperty(id, prop, opacity * (core ? factor : factor * factor)),
      )
    // Dönüş normalde renkli bacakların altında.
    raise(outboundStrokes)
    for (const leg of legs) leg.label?.marker.addTo(map)

    const labels = legs.flatMap((l) => (l.label ? [l.label] : []))
    const pins: LatLngTuple[] = [home, ...ordered.map((s): LatLngTuple => [s.lat, s.lng])]
    const linkPaths = legs.flatMap((l) => [l.lead, l.tail].flatMap((s) => (s ? [s.path] : [])))
    const place = () =>
      placeLabels(map, labels, [route.path, ...linkPaths], pins, [
        legendRef.current,
        controlsRef.current,
        statusRef.current,
        map.getContainer().querySelector(".maplibregl-ctrl-attrib"),
        ...depotMarkersRef.current.map((m) => m.getElement().querySelector("[data-badge]")),
      ])
    map.on("moveend", place)
    map.on("resize", place)
    if (!restored) {
      const fit = new ml.LngLatBounds()
      for (const ll of [...route.path, ...pins]) fit.extend(toLngLat(ll))
      map.fitBounds(fit, FIT)
    }

    const show = (stroke: Stroke, pts: LatLngTuple[]) => showStroke(map, stroke, pts)
    // Noktalar ekran pikseliyle dizili; zoom bitince yeni ölçeğe göre yeniden dizilir.
    const redot = () => {
      for (const stroke of strokes) if (stroke.dots) show(stroke, stroke.shown)
    }
    map.on("zoomend", redot)
    const reveal = (leg: Leg) => {
      if (leg.label) leg.label.shown = true
    }
    const restore = () => {
      dim(1)
      raise(outboundStrokes)
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

    if (reduceMotion || restored) {
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
        dim(DIMMED)
        raise(returnStrokes)
        await draw(back)
        await wait(HOLD_MS)
        restore()
      })()
    }

    return () => {
      dead = true
      cancelAnimationFrame(raf)
      for (const t of timers) window.clearTimeout(t)
      map.off("moveend", place)
      map.off("resize", place)
      map.off("zoomend", redot)
      for (const stroke of strokes) removeStroke(map, stroke)
      for (const leg of legs) leg.label?.marker.remove()
    }
  }, [current, mode, ordered, homePt, reduceMotion, styleLoads])

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
