"use client"

// Leaflet yalnız tarayıcıda çalışır (window/DOM bağımlı). Bu yüzden modül üst
// seviyesinde import ETMEYİZ — ilk ihtiyaçta dinamik import edip promise'i
// cache'leriz (tek yükleme, SSR-safe).

import type * as LeafletNs from "leaflet"

type Leaflet = typeof LeafletNs

let leafletPromise: Promise<Leaflet> | null = null

export function loadLeaflet(): Promise<Leaflet> {
  if (!leafletPromise) {
    leafletPromise = import("leaflet").then(
      // Leaflet CJS modülü: namespace bazen default'un altında gelir.
      (m) => ((m as { default?: Leaflet }).default ?? m) as Leaflet,
    )
  }
  return leafletPromise
}

export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
