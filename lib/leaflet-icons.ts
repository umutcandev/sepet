"use client"

import type * as LeafletNs from "leaflet"

import { getMarketInitial, getMarketLogo } from "@/lib/markets/registry"

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// Kahverengi damla pin (kullanıcı konumu) — marker rengi #6D4530 (uygulamanın
// kahverengi vurgu rengi). iconAnchor damlanın ucu olduğu için [13, 36].
export function userPinIcon(L: typeof LeafletNs): LeafletNs.DivIcon {
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

// Haritalardaki alışılmış mavi konum noktası; halka nabız gibi atar.
export function userDotIcon(L: typeof LeafletNs): LeafletNs.DivIcon {
  const html =
    '<span class="relative flex size-4 -translate-x-1/2 -translate-y-1/2">' +
    '<span class="absolute inset-0 rounded-full bg-[#1a73e8]/50 motion-safe:animate-ping"></span>' +
    '<span class="relative size-4 rounded-full border-2 border-white bg-[#1a73e8] shadow-[0_1px_3px_rgb(0_0_0/0.35)]"></span>' +
    "</span>"
  return L.divIcon({ html, className: "", iconSize: [0, 0], iconAnchor: [0, 0] })
}

// Şubeler için logolu (yoksa baş-harf) dairesel rozet — listedeki MarketLogo
// ile aynı görsel dil. CSP altında inline onerror çalışmadığından fallback
// registry'deki logo varlığına göre seçilir (kırık görsel yok).
export function depotIcon(L: typeof LeafletNs, market: string): LeafletNs.DivIcon {
  const logo = getMarketLogo(market)
  const inner = logo
    ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(market)}" style="width:100%;height:100%;object-fit:contain;" />`
    : `<span style="font-size:11px;font-weight:500;color:#6D4530;">${escapeHtml(getMarketInitial(market))}</span>`
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
