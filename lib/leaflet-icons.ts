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

const MAX_THUMBS = 3
const BADGE_ITEM =
  "flex h-4 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-[0_0_0_1.5px_#fff,0_1px_2px_rgb(0_0_0/0.3)] not-first:-ml-1"
const EMPTY_THUMB = `${BADGE_ITEM} w-4 bg-neutral-200`

// Logonun sağ üstünde o şubeden alınan ürünler; sığmayanlar "+N".
function productBadge(products: (string | null)[]): string {
  if (products.length === 0) return ""
  const shown = [...products].sort((a, b) => Number(!a) - Number(!b)).slice(0, MAX_THUMBS)
  const thumbs = shown
    .map((src) =>
      src
        ? `<span data-thumb class="${BADGE_ITEM} w-4 bg-white"><img src="${escapeHtml(src)}" alt="" class="size-full object-contain" /></span>`
        : `<span class="${EMPTY_THUMB}"></span>`,
    )
    .join("")
  const rest = products.length - shown.length
  const more = rest
    ? `<span class="${BADGE_ITEM} min-w-4 bg-white px-[3px] font-sans text-[9px] leading-none font-semibold tabular-nums text-neutral-700">+${rest}</span>`
    : ""
  return `<div data-badge class="absolute -top-[7px] left-[15px] flex items-center">${thumbs}${more}</div>`
}

/** Yüklenemeyen ürün görseli boş daireye döner (CSP inline onerror'a izin vermez). */
export function wireBrokenThumbs(root: HTMLElement | undefined) {
  root?.querySelectorAll<HTMLImageElement>("[data-thumb] img").forEach((img) => {
    const drop = () => {
      if (img.parentElement) img.parentElement.className = EMPTY_THUMB
      img.remove()
    }
    if (img.complete && img.naturalWidth === 0) drop()
    else img.addEventListener("error", drop, { once: true })
  })
}

// Şubeler için logolu (yoksa baş-harf) dairesel rozet — listedeki MarketLogo
// ile aynı görsel dil. CSP altında inline onerror çalışmadığından fallback
// registry'deki logo varlığına göre seçilir (kırık görsel yok).
export function depotIcon(
  L: typeof LeafletNs,
  market: string,
  products: (string | null)[] = [],
): LeafletNs.DivIcon {
  const logo = getMarketLogo(market)
  const inner = logo
    ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(market)}" style="width:100%;height:100%;object-fit:contain;" />`
    : `<span style="font-size:11px;font-weight:500;color:#6D4530;">${escapeHtml(getMarketInitial(market))}</span>`
  const html =
    '<div style="position:relative;width:26px;height:26px;">' +
    `<div title="${escapeHtml(market)}" style="width:26px;height:26px;border-radius:9999px;` +
    "background:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);" +
    "overflow:hidden;display:flex;align-items:center;justify-content:center;line-height:1;\">" +
    `${inner}</div>${productBadge(products)}</div>`
  return L.divIcon({
    html,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}
