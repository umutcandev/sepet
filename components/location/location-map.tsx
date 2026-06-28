"use client"

import "leaflet/dist/leaflet.css"

import * as React from "react"
import type * as LeafletNs from "leaflet"
import { LocateFixedIcon, MinusIcon, PlusIcon } from "lucide-react"

import { loadLeaflet, TILE_ATTRIBUTION, TILE_URL } from "@/lib/leaflet"
import { getMarketInitial, getMarketLogo } from "@/lib/markets/registry"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// Kahverengi damla pin (kullanıcı konumu) — marker rengi #6D4530 (uygulamanın
// kahverengi vurgu rengi). iconAnchor damlanın ucu olduğu için [13, 36].
function userPinIcon(L: typeof LeafletNs): LeafletNs.DivIcon {
  const html =
    '<svg width="26" height="36" viewBox="0 0 26 36" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 23 13 23s13-13.25 13-23C26 5.82 20.18 0 13 0z" fill="#6D4530"/>' +
    '<circle cx="13" cy="13" r="5" fill="#fff"/></svg>'
  return L.divIcon({
    html,
    className: "",
    iconSize: [26, 36],
    iconAnchor: [13, 36],
  })
}

// Listedeki şubeler için logolu (yoksa baş-harf) dairesel rozet — listedeki
// MarketLogo ile aynı görsel dil. CSP altında inline onerror çalışmadığından
// fallback registry'deki logo varlığına göre seçilir (kırık görsel yok).
function depotIcon(L: typeof LeafletNs, market: string): LeafletNs.DivIcon {
  const logo = getMarketLogo(market)
  const inner = logo
    ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(market)}" style="width:100%;height:100%;object-fit:contain;" />`
    : `<span style="font-size:11px;font-weight:600;color:#6D4530;">${escapeHtml(getMarketInitial(market))}</span>`
  const html =
    `<div title="${escapeHtml(market)}" style="width:26px;height:26px;border-radius:9999px;` +
    "background:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);" +
    "overflow:hidden;display:flex;align-items:center;justify-content:center;line-height:1;\">" +
    `${inner}</div>`
  return L.divIcon({
    html,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

/**
 * Kontrollü Leaflet haritası: `center` prop'una göre marker'ı senkronize eder,
 * kullanıcı etkileşiminde (sürükle / tıkla) `onMove` yayar. Reverse geocode artık
 * yok — harita yalnız ham koordinat üretir. Leaflet dinamik yüklenir (SSR-safe).
 */
export function LocationMap({ center, onMove, depots = [] }: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<LeafletNs.Map | null>(null)
  const markerRef = React.useRef<LeafletNs.Marker | null>(null)
  const LRef = React.useRef<typeof LeafletNs | null>(null)
  // Harita + Leaflet hazır olunca true → depo marker effect'i bunu bekleyip çalışır.
  const [ready, setReady] = React.useState(false)
  const [locating, setLocating] = React.useState(false)

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
    let map: LeafletNs.Map | null = null

    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current) return
      LRef.current = L
      const start = centerRef.current

      map = L.map(containerRef.current, {
        center: [start.lat, start.lng],
        zoom: 13,
        // Leaflet'in kendi zoom kontrolü tarayıcı-default görünür; kapatıp
        // uygulamanın Button'larıyla kendi kontrollerimizi overlay basıyoruz.
        zoomControl: false,
        attributionControl: true,
      })
      mapRef.current = map

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map)

      const marker = L.marker([start.lat, start.lng], {
        draggable: true,
        icon: userPinIcon(L),
        autoPan: true,
      }).addTo(map)
      markerRef.current = marker

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng()
        onMoveRef.current(lat, lng)
      })

      map.on("click", (e: LeafletNs.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng)
        onMoveRef.current(e.latlng.lat, e.latlng.lng)
      })

      // Modal açılış animasyonu sırasında container boyutu geç oturabilir; harita
      // 0 ölçüyle başlarsa tile'lar gelmez. Bir frame sonra yeniden ölçtür.
      requestAnimationFrame(() => {
        if (!cancelled) map?.invalidateSize()
      })

      if (!cancelled) setReady(true)
    })

    return () => {
      cancelled = true
      setReady(false)
      markerRef.current = null
      LRef.current = null
      mapRef.current = null
      if (map) map.remove()
    }
  }, [])

  // Dış kaynaklı merkez değişimi (il seçimi / geolocation) → marker + harita taşı.
  // Kullanıcı sürüklemesinde marker zaten merkezde olduğundan eşitlik kontrolü
  // flyTo döngüsünü engeller.
  React.useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return
    const cur = marker.getLatLng()
    if (
      Math.abs(cur.lng - center.lng) < EPS &&
      Math.abs(cur.lat - center.lat) < EPS
    ) {
      return
    }
    marker.setLatLng([center.lat, center.lng])
    map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 13))
    // `ready`: merkez harita kurulmadan değiştiyse effect map null diye erken
    // döner; harita hazır olunca tekrar çalışıp pini doğru yere taşır.
  }, [center.lat, center.lng, ready])

  // ─── Listedeki şubeleri logolu nokta olarak işaretle ───
  // `ready` bağımlılığı sayesinde harita asenkron kurulduğunda effect yeniden
  // çalışır; depo listesi (mesafe/filtre) değişince marker'lar yeniden kurulur.
  React.useEffect(() => {
    const map = mapRef.current
    const L = LRef.current
    if (!ready || !map || !L) return
    const markers = depots.map((d) =>
      L.marker([d.lat, d.lng], {
        icon: depotIcon(L, d.market),
        interactive: false,
        keyboard: false,
      }).addTo(map),
    )

    // Konuma sıkı zoom yerine: kullanıcı pini + tüm işaretli marketleri tek
    // görünüme sığdır. Şube yoksa center-sync'in konuma zoom'u devrede kalır.
    if (depots.length > 0) {
      const me = centerRef.current
      const bounds = L.latLngBounds([[me.lat, me.lng]])
      for (const d of depots) bounds.extend([d.lat, d.lng])
      map.fitBounds(bounds, { padding: [5, 5] })
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

  // Opak arka plan + net border: harita döşemeleri üstünde saydam buton berbat
  // göründüğü için bg-background'ı her iki temada da zorluyoruz.
  const controlClass =
    "size-7 border-border bg-background text-foreground shadow-sm hover:bg-muted dark:bg-background dark:border-border dark:hover:bg-muted"

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-1.5">
        <Button
          type="button"
          size="icon-sm"
          className={controlClass}
          aria-label="Yakınlaştır"
          onClick={() => mapRef.current?.zoomIn()}
        >
          <PlusIcon />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          className={controlClass}
          aria-label="Uzaklaştır"
          onClick={() => mapRef.current?.zoomOut()}
        >
          <MinusIcon />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          className={cn(controlClass, "mt-1")}
          aria-label="Konumumu bul"
          disabled={locating}
          onClick={handleLocate}
        >
          {locating ? <Spinner className="size-3.5" /> : <LocateFixedIcon />}
        </Button>
      </div>
    </div>
  )
}
