"use client"

import * as React from "react"
import { SmoothCorners } from "@lisse/react"

/**
 * Lisse'in (@lisse/react) TEK giriş noktası. Kütüphaneyi başka hiçbir yerden
 * import etme; eğri, yarıçap ve efekt kararları burada tek yerde dursun.
 *
 * Neden clip-path: Lisse köşeyi `clip-path: path(...)` ile kesiyor. Bu, ELEMANIN
 * KENDİ `box-shadow`/`outline`ını da siler — tarayıcı clip-path'i elemanın tüm
 * boyamasına uygular. Bu yüzden:
 *
 *   • Odak halkası (`focus-visible:ring-*`, `outline-*`) taşıyan bir elemana
 *     ASLA uygulama. Lisse box-shadow'u yalnız mount'ta bir kez okuyor
 *     (MutationObserver yok), `outline`ı ise hiç tanımıyor — odak göstergesi
 *     görünmez olur. Butonlar, inputlar, menü öğeleri kapsam dışı.
 *   • Çocuk elemanların odak halkaları etkilenmez (kesim yalnız kabın
 *     sınırında). Kart içindeki butonlar güvende.
 *
 * `effects` (Lisse'in `autoEffects`i) açıkken elemanın CSS `border` ve
 * `box-shadow`u sökülüp SVG olarak yeniden çizilir; bu bir sarmalayıcı `div`
 * doğurur ve o özelliklerdeki CSS transition'ları durdurur. Kenarı/gölgesi
 * olmayan yüzeylerde `effects={false}` bırak — hem daha ucuz hem DOM'u bozmaz.
 */

/**
 * Eğri ailesi. Tek sabit: görünen sonucun tamamı buna bağlı.
 *
 * `squircle` + 0.65 Figma/iOS ile matematiksel parite verir, ama sapması
 * yarıçapın yalnız %1,5'i kadardır — bizim token'larımızda (r = 10-18px)
 * 0,15-0,26 piksel, yani `border-radius`tan gözle ayırt edilemez.
 * Görünür bir squircle istenirse `{ curve: "superellipse", exponent: 4 }`
 * yap: sapma %18,9'a çıkar ve CSS `corner-shape: squircle` ile birebir aynı
 * şekli verir (ileride kütüphaneyi çıkarıp CSS'e geçmek serbest kalır).
 */
const CURVE = { curve: "squircle", smoothing: 0.65 } as const

/**
 * globals.css'teki `--radius` ölçeğinin piksel karşılığı. Lisse sayı istiyor,
 * CSS değişkeni okuyamıyor; çarpanlar `--radius-*` ile BİREBİR aynı tutulmalı.
 * Taban: `--radius: 0.625rem` × 16px kök = 10px.
 */
const RADIUS_BASE = 10

export const SQUIRCLE_RADIUS = {
  sm: RADIUS_BASE * 0.6, // 6px  — rounded-sm
  md: RADIUS_BASE * 0.8, // 8px  — rounded-md
  lg: RADIUS_BASE, // 10px — rounded-lg
  xl: RADIUS_BASE * 1.4, // 14px — rounded-xl
  "2xl": RADIUS_BASE * 1.8, // 18px — rounded-2xl
  "3xl": RADIUS_BASE * 2.2, // 22px — rounded-3xl
} as const

export type SquircleRadius = keyof typeof SQUIRCLE_RADIUS

type SquircleOwnProps = {
  /** Token adı (`--radius-*` ile aynı ölçek) ya da doğrudan piksel. */
  radius?: SquircleRadius | number
  /**
   * Elemanın CSS `border`/`box-shadow`unu SVG'ye taşı. Kenarı veya gölgesi
   * olan yüzeylerde ŞART (yoksa köşede kesilir), olmayanlarda kapalı bırak.
   * Varsayılan: `false` — Lisse'in kendi varsayılanının tersi, bilinçli.
   */
  effects?: boolean
}

type SmoothCornersProps<E extends React.ElementType> = React.ComponentProps<
  typeof SmoothCorners<E>
>

export type SquircleProps<E extends React.ElementType = "div"> =
  SquircleOwnProps &
    Omit<SmoothCornersProps<E>, keyof SquircleOwnProps | "corners" | "autoEffects">

export function Squircle<E extends React.ElementType = "div">({
  radius = "lg",
  effects = false,
  ...props
}: SquircleProps<E>) {
  const corners = React.useMemo(
    () => ({
      ...CURVE,
      radius: typeof radius === "number" ? radius : SQUIRCLE_RADIUS[radius],
    }),
    [radius]
  )

  // `SmoothCorners`ın polimorfik imzası çözülmemiş bir jenerik `E` ile
  // eşleşmiyor (TS `Omit<ComponentProps<E>, ...>`i daraltamıyor). Dışa açık
  // `SquircleProps<E>` zaten ondan türetildiği ve burada yalnız aynen
  // geçirildiği için tipleri gövde içinde tek noktada silmek güvenli.
  const Component = SmoothCorners as React.ComponentType<
    Record<string, unknown>
  >

  return (
    <Component
      corners={corners}
      autoEffects={effects}
      {...(props as Record<string, unknown>)}
    />
  )
}
