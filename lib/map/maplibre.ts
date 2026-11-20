"use client"

import * as React from "react"
import type { Map as MapLibreMap, MapOptions } from "maplibre-gl"

import {
  applyBasicTheme,
  BASEMAP_ATTRIBUTION,
  basicStyle,
  MAX_ZOOM,
  type MapTheme,
} from "./style"
import { useMapTheme } from "./use-map-theme"

// MapLibre yalnız tarayıcıda çalışır (WebGL + worker). Modül üst seviyesinde
// import ETMEYİZ — ilk ihtiyaçta dinamik import edip promise'i cache'leriz
// (tek yükleme, SSR-safe).

type MapLibre = typeof import("maplibre-gl")

let maplibrePromise: Promise<MapLibre> | null = null

export function loadMapLibre(): Promise<MapLibre> {
  if (!maplibrePromise) {
    maplibrePromise = import("maplibre-gl").then((ml) => {
      // v6 worker'ı ayrı bir dosyadan yükler ve adresini kendi modülünün
      // yanında arar; bundle'da o dosya o adreste yok. Bundler'ın kopyaladığı
      // aynı origin'deki dosyayı göstermek yüklemeyi de CSP'yi de çözer
      // (worker-src → script-src 'self').
      ml.setWorkerUrl(
        new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href
      )
      return ml
    })
  }
  return maplibrePromise
}

/** [lat, lng] → MapLibre'nin beklediği [lng, lat]. */
export const toLngLat = ([lat, lng]: [number, number]): [number, number] => [
  lng,
  lat,
]

type BasicMapOptions = Omit<MapOptions, "style" | "attributionControl">

/**
 * Basic stilli harita. Döndürme ve eğme kapalı: haritalar kuzey yukarı, düz
 * kullanılıyor. Atıf bandı dar haritada da açık kalır (ikona katlanmaz).
 *
 * MapLibre WebGL2 ister; desteklemeyen tarayıcıda harita kurulamaz ve null
 * döner (alan boş kalır, haritanın dışındaki arayüz çalışmaya devam eder).
 */
export function createBasicMap(
  ml: MapLibre,
  theme: React.RefObject<MapTheme>,
  options: BasicMapOptions
): MapLibreMap | null {
  try {
    return setupBasicMap(ml, theme, options)
  } catch (error) {
    console.error("Harita kurulamadı", error)
    return null
  }
}

function setupBasicMap(
  ml: MapLibre,
  theme: React.RefObject<MapTheme>,
  options: BasicMapOptions
): MapLibreMap {
  const map = new ml.Map({
    maxZoom: MAX_ZOOM,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    ...options,
    style: basicStyle(theme.current),
    // Tuvalin ekran okuyucu etiketi (varsayılanı İngilizce "Map").
    locale: { "Map.Title": "Harita" },
    // Atıf kaynakta da var; burada da verilince bant ilk karede çizilir
    // (kaynağınki TileJSON inince gelirdi), MapLibre aynı metni ikinci kez
    // yazmaz. MapLibre'nin kendi "MapLibre" bağlantısı eklenmez.
    attributionControl: {
      compact: false,
      customAttribution: BASEMAP_ATTRIBUTION,
    },
  })
  map.touchZoomRotate.disableRotation()
  map.keyboard.disableRotation()
  // Tema, stil yüklenirken değişmiş olabilir; yüklenince güncel olan uygulanır.
  map.on("style.load", () => applyBasicTheme(map, theme.current))
  return map
}

/**
 * Uygulama teması değişince kurulu haritanın renklerini günceller. Dönen ref
 * haritayı kurarken başlangıç temasını okumak içindir.
 */
export function useBasicMapTheme(
  mapRef: React.RefObject<MapLibreMap | null>,
  ready: boolean
): React.RefObject<MapTheme> {
  const theme = useMapTheme()
  const themeRef = React.useRef(theme)
  React.useEffect(() => {
    themeRef.current = theme
    // Stil henüz yüklenmediyse katman yoktur, applyBasicTheme bir şey yapmaz;
    // `style.load` dinleyicisi güncel temayı o an uygular.
    const map = mapRef.current
    if (ready && map) applyBasicTheme(map, theme)
  }, [mapRef, ready, theme])
  return themeRef
}
