import type {
  LayerSpecification,
  Map as MapLibreMap,
  StyleSpecification,
} from "maplibre-gl"

import { BASIC_LAYERS } from "./basic-style"

export type MapTheme = "light" | "dark"

// OpenFreeMap: OpenMapTiles şemasında ücretsiz vektör döşeme + yazı tipi.
const TILES_URL = "https://tiles.openfreemap.org/planet"
const GLYPHS_URL = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf"

// Kaynağın atfı TileJSON'dakini (OpenFreeMap · OpenMapTiles · OpenStreetMap)
// ezer: haritada yalnız OpenStreetMap atfı gösterilir.
export const BASEMAP_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright">&copy; OpenStreetMap contributors</a>'

/**
 * Leaflet 256 px döşeme ölçeğiyle çalışıyordu; MapLibre 512 px ölçekte. Aynı
 * görüntü için MapLibre zoom'u bir eksik olmalı (Leaflet 13 ≙ MapLibre 12).
 */
export const LEAFLET_ZOOM_OFFSET = 1
export const MAX_ZOOM = 19 - LEAFLET_ZOOM_OFFSET

type Paint = Record<string, unknown>

// Gece paleti: uygulamanın koyu yüzeyleri (--background #1a130e, --card
// #221a14) üstünde aynı sıcak tonlarda. Yalnız renkler değişir; katman
// sırası, filtreler ve genişlikler Basic'te nasılsa öyle.
const BG = "hsl(26, 24%, 11%)"
const ROAD = "hsl(28, 14%, 23%)"
const ROAD_MAJOR = "hsl(30, 16%, 29%)"
const WATER = "hsl(207, 24%, 19%)"
const GREEN = "hsl(82, 18%, 22%)"
const RAIL = "hsl(30, 9%, 34%)"
const ADMIN = "hsl(30, 10%, 40%)"
const LABEL_HALO = "hsla(26, 24%, 11%, 0.85)"

export const BASIC_DARK_PAINT: Record<string, Paint> = {
  background: { "background-color": BG },
  "landuse-residential": { "fill-color": "hsl(27, 18%, 13%)" },
  landcover_grass: { "fill-color": GREEN },
  landcover_wood: { "fill-color": GREEN },
  water: { "fill-color": WATER },
  water_intermittent: { "fill-color": WATER },
  "landcover-ice-shelf": { "fill-color": BG },
  "landcover-glacier": { "fill-color": "hsl(30, 10%, 20%)" },
  landcover_sand: { "fill-color": "hsl(48, 40%, 28%)" },
  landuse: { "fill-color": "hsl(30, 18%, 14%)" },
  landuse_overlay_national_park: { "fill-color": "hsl(75, 20%, 18%)" },
  "waterway-tunnel": { "line-color": WATER },
  waterway: { "line-color": WATER },
  waterway_intermittent: { "line-color": WATER },
  tunnel_railway_transit: { "line-color": RAIL },
  building: {
    "fill-color": "hsl(28, 15%, 17%)",
    "fill-outline-color": [
      "interpolate",
      ["linear"],
      ["zoom"],
      15,
      "hsla(30, 18%, 26%, 0)",
      16,
      "hsla(30, 18%, 26%, 0.6)",
    ],
  },
  housenumber: { "text-color": "hsl(30, 22%, 46%)" },
  road_area_pier: { "fill-color": BG },
  road_pier: { "line-color": BG },
  road_bridge_area: { "fill-color": BG },
  road_path: { "line-color": ROAD },
  road_minor: { "line-color": ROAD },
  tunnel_minor: { "line-color": "hsl(28, 12%, 20%)" },
  tunnel_major: { "line-color": "hsl(30, 14%, 25%)" },
  "aeroway-area": { "fill-color": ROAD },
  "aeroway-taxiway": { "line-color": ROAD },
  "aeroway-runway": { "line-color": ROAD },
  road_trunk_primary: { "line-color": ROAD_MAJOR },
  road_secondary_tertiary: { "line-color": ROAD_MAJOR },
  road_major_motorway: { "line-color": "hsl(32, 18%, 33%)" },
  "railway-transit": { "line-color": RAIL },
  railway: { "line-color": RAIL },
  "waterway-bridge-case": { "line-color": "hsl(26, 20%, 8%)" },
  "waterway-bridge": { "line-color": WATER },
  "bridge_minor case": { "line-color": "hsl(26, 20%, 8%)" },
  "bridge_major case": { "line-color": "hsl(26, 20%, 8%)" },
  bridge_minor: { "line-color": ROAD },
  bridge_major: { "line-color": ROAD_MAJOR },
  admin_sub: { "line-color": "hsla(30, 10%, 40%, 0.5)" },
  "admin_country_z0-4": { "line-color": ADMIN },
  "admin_country_z5-": { "line-color": ADMIN },
  poi_label: {
    "text-color": "hsl(31, 26%, 60%)",
    "text-halo-color": LABEL_HALO,
  },
  "airport-label": {
    "text-color": "hsl(31, 26%, 60%)",
    "text-halo-color": LABEL_HALO,
  },
  road_major_label: {
    "text-color": "hsl(32, 32%, 78%)",
    "text-halo-color": BG,
  },
  place_label_other: {
    "text-color": "hsl(32, 28%, 72%)",
    "text-halo-color": BG,
  },
  place_label_city: {
    "text-color": "hsl(32, 45%, 90%)",
    "text-halo-color": LABEL_HALO,
  },
  "country_label-other": {
    "text-color": "hsl(32, 40%, 85%)",
    "text-halo-color": LABEL_HALO,
  },
  country_label: {
    "text-color": "hsl(32, 40%, 85%)",
    "text-halo-color": LABEL_HALO,
  },
}

function themedLayer(layer: LayerSpecification, theme: MapTheme) {
  const dark = BASIC_DARK_PAINT[layer.id]
  if (theme === "light" || !dark || !("paint" in layer)) return layer
  return { ...layer, paint: { ...layer.paint, ...dark } } as LayerSpecification
}

/** Basic stili, istenen temanın renkleriyle. */
export function basicStyle(theme: MapTheme): StyleSpecification {
  return {
    version: 8,
    name: "Basic",
    sources: {
      openmaptiles: {
        type: "vector",
        url: TILES_URL,
        attribution: BASEMAP_ATTRIBUTION,
      },
    },
    glyphs: GLYPHS_URL,
    layers: BASIC_LAYERS.map((layer) => themedLayer(layer, theme)),
  }
}

/**
 * Kurulu haritanın temasını değiştirir. `setStyle` yerine yalnız renkler
 * yazılır: üstteki rota katmanları/kaynakları ve işaretçiler yerinde kalır,
 * döşemeler yeniden indirilmez.
 */
export function applyBasicTheme(map: MapLibreMap, theme: MapTheme) {
  for (const layer of BASIC_LAYERS) {
    const dark = BASIC_DARK_PAINT[layer.id]
    if (!dark || !("paint" in layer) || !map.getLayer(layer.id)) continue
    const paint = themedLayer(layer, theme) as { paint: Paint }
    for (const key of Object.keys(dark)) {
      // Anahtarlar Basic'in kendi paint özellikleri; tür, katmana göre değişir.
      map.setPaintProperty(layer.id, key as never, paint.paint[key] as never)
    }
  }
}
