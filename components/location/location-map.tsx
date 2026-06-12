"use client"

import "@maptiler/sdk/dist/maptiler-sdk.css"

import * as React from "react"
import type * as MaptilerSdk from "@maptiler/sdk"

import { loadMaptiler, MAPTILER_STYLE_URL } from "@/lib/maptiler"
import { getMarketInitial, getMarketLogo } from "@/lib/markets/registry"

type LngLat = { lat: number; lng: number }

/** Haritada gösterilecek tek bir şube (koordinatı kesinleşmiş). */
export type DepotPin = { id: string; market: string; lat: number; lng: number }

type Props = {
  /** Başlangıç + dış kaynaklı (arama/geolocation) merkez. */
  center: LngLat
  /** Kullanıcı pin'i sürükleyince / haritaya tıklayınca / geolocate kontrolü. */
  onMove: (lat: number, lng: number) => void
  /** Listedeki marketler — haritada logolu nokta olarak işaretlenir. */
  depots?: DepotPin[]
}

const EPS = 1e-6

// MapLibre marker'ı bir DOM element ister. Market logosunu (yoksa baş-harf
// fallback'i) içeren dairesel bir rozet üretiyoruz — listedeki MarketLogo ile
// aynı görsel dil.
function createDepotElement(market: string): HTMLElement {
  const el = document.createElement("div")
  el.title = market
  el.style.cssText =
    "width:26px;height:26px;border-radius:9999px;background:#fff;" +
    "border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);overflow:hidden;" +
    "display:flex;align-items:center;justify-content:center;line-height:1;"

  const logo = getMarketLogo(market)
  if (logo) {
    const img = document.createElement("img")
    img.src = logo
    img.alt = market
    img.style.cssText = "width:100%;height:100%;object-fit:contain;"
    // Logo dosyası yoksa/yüklenmezse baş-harf fallback'ine düş (kırık görsel yok).
    img.onerror = () => {
      img.remove()
      renderInitial(el, market)
    }
    el.appendChild(img)
  } else {
    renderInitial(el, market)
  }
  return el
}

function renderInitial(el: HTMLElement, market: string) {
  el.textContent = getMarketInitial(market)
  el.style.fontSize = "11px"
  el.style.fontWeight = "600"
  el.style.color = "#6D4530"
}

/**
 * Kontrollü MapTiler haritası: `center` prop'una göre marker'ı senkronize eder,
 * kullanıcı etkileşiminde (sürükle / tıkla / geolocate) `onMove` yayar. Reverse
 * geocode ve depo getirme modal tarafında merkez değişimine bağlı yapılır —
 * harita yalnız ham koordinat üretir. SDK dinamik yüklenir (SSR-safe).
 */
export function LocationMap({ center, onMove, depots = [] }: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<MaptilerSdk.Map | null>(null)
  const markerRef = React.useRef<MaptilerSdk.Marker | null>(null)
  const sdkRef = React.useRef<typeof MaptilerSdk | null>(null)
  // Harita + SDK hazır olunca true → depo marker effect'i bunu bekleyip çalışır.
  const [ready, setReady] = React.useState(false)

  // onMove'u ref'te tut: event handler'lar mount'ta bir kez bağlanır, güncel
  // closure'a ref üzerinden ulaşır. Ref güncellemesi render'da değil effect'te.
  const onMoveRef = React.useRef(onMove)
  React.useEffect(() => {
    onMoveRef.current = onMove
  })
  // Merkez, async harita kurulumundan ÖNCE değişebilir (örn. browser geolocation
  // İstanbul fallback'inden gerçek konuma atlar). Marker'ı doğru noktada kurmak
  // ve fitBounds'a güncel konumu vermek için ref'i her render'da güncel tut.
  const centerRef = React.useRef(center)
  React.useEffect(() => {
    centerRef.current = center
  })

  React.useEffect(() => {
    let cancelled = false
    let map: MaptilerSdk.Map | null = null

    loadMaptiler().then((sdk) => {
      if (cancelled || !containerRef.current) return
      sdkRef.current = sdk
      const start = centerRef.current

      map = new sdk.Map({
        container: containerRef.current,
        style: MAPTILER_STYLE_URL || undefined,
        center: [start.lng, start.lat],
        zoom: 13,
        geolocateControl: false,
        navigationControl: false,
        scaleControl: false,
        fullscreenControl: false,
        terrainControl: false,
        projectionControl: false,
      })
      mapRef.current = map

      const marker = new sdk.Marker({ draggable: true, color: "#6D4530" })
        .setLngLat([start.lng, start.lat])
        .addTo(map)
      markerRef.current = marker

      marker.on("dragend", () => {
        const { lng, lat } = marker.getLngLat()
        onMoveRef.current(lat, lng)
      })

      map.on("click", (e) => {
        marker.setLngLat(e.lngLat)
        onMoveRef.current(e.lngLat.lat, e.lngLat.lng)
      })

      map.addControl(
        new sdk.NavigationControl({ showCompass: false }),
        "top-left"
      )

      const geo = new sdk.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      })
      map.addControl(geo, "top-right")
      geo.on("geolocate", (e) => {
        const lat = e.coords.latitude
        const lng = e.coords.longitude
        marker.setLngLat([lng, lat])
        onMoveRef.current(lat, lng)
      })

      // Modal açılış animasyonu sırasında container boyutu geç oturabilir; harita
      // 0 ölçüyle başlarsa tile'lar gelmez (yalnız marker görünür). Bir frame
      // sonra resize ile gerçek boyutu yeniden ölçtür.
      requestAnimationFrame(() => {
        if (!cancelled) map?.resize()
      })

      if (!cancelled) setReady(true)
    })

    return () => {
      cancelled = true
      setReady(false)
      markerRef.current = null
      mapRef.current = null
      sdkRef.current = null
      if (map) map.remove()
    }
  }, [])

  // Dış kaynaklı merkez değişimi (arama / browser geolocation) → marker + harita
  // taşı. Kullanıcı sürüklemesinde marker zaten merkezde olduğundan eşitlik
  // kontrolü flyTo döngüsünü engeller.
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
    map.flyTo({
      center: [center.lng, center.lat],
      zoom: Math.max(map.getZoom(), 13),
    })
    // `ready`: merkez harita kurulmadan değiştiyse (geolocation) effect map null
    // diye erken döner; harita hazır olunca tekrar çalışıp pini doğru yere taşır.
  }, [center.lat, center.lng, ready])

  // ─── Listedeki şubeleri logolu nokta olarak işaretle ───
  // `ready` bağımlılığı sayesinde harita asenkron kurulduğunda effect yeniden
  // çalışır; depo listesi (mesafe/filtre) değişince marker'lar yeniden kurulur.
  React.useEffect(() => {
    const map = mapRef.current
    const sdk = sdkRef.current
    if (!ready || !map || !sdk) return
    const markers = depots.map((d) =>
      new sdk.Marker({
        element: createDepotElement(d.market),
        anchor: "center",
      })
        .setLngLat([d.lng, d.lat])
        .addTo(map)
    )

    // Konuma sıkı zoom yerine: kullanıcı pini + tüm işaretli marketleri tek
    // görünüme sığdır (hepsini birden göster). Şube yoksa center-sync'in
    // konuma zoom'u devrede kalır.
    if (depots.length > 0) {
      const bounds = new sdk.LngLatBounds()
      const me = centerRef.current
      bounds.extend([me.lng, me.lat])
      for (const d of depots) bounds.extend([d.lng, d.lat])
      map.fitBounds(bounds, { padding: 40, maxZoom: 15, duration: 700 })
    }

    return () => {
      for (const m of markers) m.remove()
    }
  }, [depots, ready])

  return <div ref={containerRef} className="h-full w-full" />
}
