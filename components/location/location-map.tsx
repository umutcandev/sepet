"use client"

import "maplibre-gl/dist/maplibre-gl.css"

import * as React from "react"
import type * as MapLibreNs from "maplibre-gl"
import { RiAddLine, RiFocus3Line, RiSubtractLine } from "@remixicon/react"

import {
  createBasicMap,
  loadMapLibre,
  useBasicMapTheme,
} from "@/lib/map/maplibre"
import {
  depotIcon,
  markerElement,
  markerZIndex,
  userPinIcon,
} from "@/lib/map/markers"
import { LEAFLET_ZOOM_OFFSET } from "@/lib/map/style"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type LngLat = { lat: number; lng: number }

/** Haritada gösterilecek tek bir şube (koordinatı kesinleşmiş). */
export type DepotPin = { id: string; market: string; lat: number; lng: number }

type Props = {
  /** Başlangıç + dış kaynaklı (arama/geolocation) merkez. */
  center: LngLat
  /** Kullanıcı pin'i sürükleyince / haritaya tıklayınca. */
  onMove: (lat: number, lng: number) => void
  /** Listedeki marketler — haritada logolu nokta olarak işaretlenir. */
  depots?: DepotPin[]
}

const EPS = 1e-6
const START_ZOOM = 13 - LEAFLET_ZOOM_OFFSET

// Pin kenara sürüklenince harita o yöne kayar: kenardan bu kadar içeride
// başlar, kenara yaklaştıkça kare başına en çok bu kadar piksel kayar.
const AUTO_PAN_PADDING = 50
const AUTO_PAN_SPEED = 10

/** Kenar payına girilen oran (0 = payın dışında, 1 = tam kenarda) × hız. */
function autoPanStep(p: number, size: number): number {
  const far = Math.max(p, size - AUTO_PAN_PADDING) - (size - AUTO_PAN_PADDING)
  const near = AUTO_PAN_PADDING - Math.min(p, AUTO_PAN_PADDING)
  return ((far - near) / AUTO_PAN_PADDING) * AUTO_PAN_SPEED
}

/**
 * Kontrollü MapLibre haritası: `center` prop'una göre marker'ı senkronize eder,
 * kullanıcı etkileşiminde (sürükle / tıkla) `onMove` yayar. Reverse geocode artık
 * yok — harita yalnız ham koordinat üretir. MapLibre dinamik yüklenir (SSR-safe).
 */
export function LocationMap({ center, onMove, depots = [] }: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<MapLibreNs.Map | null>(null)
  const markerRef = React.useRef<MapLibreNs.Marker | null>(null)
  const mlRef = React.useRef<typeof MapLibreNs | null>(null)
  // Harita + MapLibre hazır olunca true → depo marker effect'i bunu bekleyip çalışır.
  const [ready, setReady] = React.useState(false)
  const [locating, setLocating] = React.useState(false)
  const themeRef = useBasicMapTheme(mapRef, ready)

  // onMove'u ref'te tut: event handler'lar mount'ta bir kez bağlanır, güncel
  // closure'a ref üzerinden ulaşır.
  const onMoveRef = React.useRef(onMove)
  React.useEffect(() => {
    onMoveRef.current = onMove
  })
  // Merkez, async harita kurulumundan ÖNCE değişebilir (örn. geolocation İstanbul
  // fallback'inden gerçek konuma atlar). Marker'ı doğru noktada kurmak ve
  // fitBounds'a güncel konumu vermek için ref'i her render'da güncel tut.
  const centerRef = React.useRef(center)
  React.useEffect(() => {
    centerRef.current = center
  })

  React.useEffect(() => {
    let cancelled = false
    let map: MapLibreNs.Map | null = null
    let panFrame = 0
    let releaseOutside: ((e: MouseEvent) => void) | null = null

    loadMapLibre().then((ml) => {
      if (cancelled || !containerRef.current) return
      mlRef.current = ml
      const start = centerRef.current
      const container = containerRef.current

      // Hazır zoom kontrolü eklenmez; uygulamanın Button'larıyla kendi
      // kontrollerimizi overlay basıyoruz.
      const m = createBasicMap(ml, themeRef, {
        container,
        center: [start.lng, start.lat],
        zoom: START_ZOOM,
        // Leaflet'in varsayılanı: şubeleri sığdırırken zoom tam sayıya
        // aşağı yuvarlanır, kenardaki rozetler kesilmez.
        zoomSnap: 1,
      })
      if (!m) return
      map = m
      mapRef.current = m

      const pin = markerElement(userPinIcon(), { interactive: true })
      pin.style.cursor = "pointer"
      pin.style.zIndex = markerZIndex(start.lat)
      const marker = new ml.Marker({
        element: pin,
        anchor: userPinIcon().anchor,
        draggable: true,
      })
        .setLngLat([start.lng, start.lat])
        .addTo(m)
      markerRef.current = marker

      // Pin kenara taşınırken harita o yöne kayar; pin imlecin altında kalır.
      let dragging = false
      const autoPan = () => {
        panFrame = 0
        if (!dragging) return
        const p = m.project(marker.getLngLat())
        const dx = autoPanStep(p.x, container.clientWidth)
        const dy = autoPanStep(p.y, container.clientHeight)
        if (!dx && !dy) return
        m.panBy([dx, dy], { animate: false })
        marker.setLngLat(m.unproject(p))
        panFrame = requestAnimationFrame(autoPan)
      }
      // MapLibre sürüklemeyi yalnız haritanın kendi mouseup'ıyla bitirir; fare
      // haritanın dışında (üstteki butonlarda, modalda) bırakılırsa sürükleme
      // açık kalır, pin tuşsuz imleci izlerdi. Leaflet'teki gibi her yerde bitir.
      const release = (e: MouseEvent) => {
        if (dragging) m.fire(new ml.MapMouseEvent("mouseup", m, e))
      }
      releaseOutside = release
      marker.on("dragstart", () => {
        dragging = true
        window.addEventListener("mouseup", release)
      })
      marker.on("drag", () => {
        if (!panFrame) panFrame = requestAnimationFrame(autoPan)
      })
      marker.on("dragend", () => {
        dragging = false
        window.removeEventListener("mouseup", release)
        cancelAnimationFrame(panFrame)
        panFrame = 0
        const { lat, lng } = marker.getLngLat()
        pin.style.zIndex = markerZIndex(lat)
        onMoveRef.current(lat, lng)
      })

      m.on("click", (e) => {
        // Pinin kendisine tıklamak onu yerinden oynatmaz.
        if (pin.contains(e.originalEvent.target as Node | null)) return
        marker.setLngLat(e.lngLat)
        pin.style.zIndex = markerZIndex(e.lngLat.lat)
        onMoveRef.current(e.lngLat.lat, e.lngLat.lng)
      })

      // Modal açılış animasyonu sırasında container boyutu geç oturabilir; harita
      // 0 ölçüyle başlarsa döşemeler gelmez. Bir frame sonra yeniden ölçtür.
      requestAnimationFrame(() => {
        if (!cancelled) map?.resize()
      })

      if (!cancelled) setReady(true)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(panFrame)
      if (releaseOutside) window.removeEventListener("mouseup", releaseOutside)
      setReady(false)
      markerRef.current = null
      mlRef.current = null
      mapRef.current = null
      if (map) map.remove()
    }
  }, [themeRef])

  // Dış kaynaklı merkez değişimi (il seçimi / geolocation) → marker + harita taşı.
  // Kullanıcı sürüklemesinde marker zaten merkezde olduğundan eşitlik kontrolü
  // flyTo döngüsünü engeller.
  React.useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return
    const cur = marker.getLngLat()
    if (
      Math.abs(cur.lng - center.lng) < EPS &&
      Math.abs(cur.lat - center.lat) < EPS
    ) {
      return
    }
    marker.setLngLat([center.lng, center.lat])
    marker.getElement().style.zIndex = markerZIndex(center.lat)
    map.flyTo({
      center: [center.lng, center.lat],
      zoom: Math.max(map.getZoom(), START_ZOOM),
    })
    // `ready`: merkez harita kurulmadan değiştiyse effect map null diye erken
    // döner; harita hazır olunca tekrar çalışıp pini doğru yere taşır.
  }, [center.lat, center.lng, ready])

  // ─── Listedeki şubeleri logolu nokta olarak işaretle ───
  // `ready` bağımlılığı sayesinde harita asenkron kurulduğunda effect yeniden
  // çalışır; depo listesi (mesafe/filtre) değişince marker'lar yeniden kurulur.
  React.useEffect(() => {
    const map = mapRef.current
    const ml = mlRef.current
    if (!ready || !map || !ml) return
    const markers = depots.map((d) => {
      const icon = depotIcon(d.market)
      const el = markerElement(icon)
      el.style.zIndex = markerZIndex(d.lat)
      return new ml.Marker({ element: el, anchor: icon.anchor })
        .setLngLat([d.lng, d.lat])
        .addTo(map)
    })

    // Konuma sıkı zoom yerine: kullanıcı pini + tüm işaretli marketleri tek
    // görünüme sığdır. Şube yoksa center-sync'in konuma zoom'u devrede kalır.
    if (depots.length > 0) {
      const me = centerRef.current
      const bounds = new ml.LngLatBounds([me.lng, me.lat], [me.lng, me.lat])
      for (const d of depots) bounds.extend([d.lng, d.lat])
      map.fitBounds(bounds, { padding: 5 })
    }

    return () => {
      for (const m of markers) m.remove()
    }
  }, [depots, ready])

  // Konum butonu: tarayıcı konumunu alıp merkezi oraya taşı (onMove → parent
  // center'ı günceller, harita flyTo ile gider). MapTiler GeolocateControl'ün yeri.
  const handleLocate = React.useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        onMoveRef.current(pos.coords.latitude, pos.coords.longitude)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }, [])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {/* Harita döşemelerinin üstünde düz `outline` yeterli: dolgusu iki
          temada da opak (`--surface-outline`), kenarı ve gölgesi o dolgudan
          türüyor. Eskiden dark'ta `bg-input/30` saydamdı ve burada zemin,
          taban ve hover ayrı ayrı eziliyordu. */}
      <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Yakınlaştır"
          onClick={() => mapRef.current?.zoomIn()}
        >
          <RiAddLine />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Uzaklaştır"
          onClick={() => mapRef.current?.zoomOut()}
        >
          <RiSubtractLine />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="mt-1"
          aria-label="Konumumu bul"
          disabled={locating}
          onClick={handleLocate}
        >
          {locating ? <Spinner className="size-3.5" /> : <RiFocus3Line />}
        </Button>
      </div>
    </div>
  )
}
