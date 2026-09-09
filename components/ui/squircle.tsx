"use client"

import * as React from "react"
import { SmoothCorners } from "@lisse/react"

import { useDocumentTheme } from "@/hooks/use-document-theme"

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

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

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

  /* Lisse CSS `border`/`box-shadow`u YALNIZ mount'ta okuyup SVG'ye taşıyor,
     MutationObserver'ı yok. Tema değişince SVG eski renkte kalıyor: gece→gündüz
     geçişinde kartların kenarında siyahımsı bir çerçeve olarak duruyor ve F5'e
     kadar gitmiyordu. Kütüphanede yeniden okutmanın kapısı yok, tek çare
     remount — `key` tema DEĞİŞİMİNDE artıyor (ilk yüklemede değil, yoksa her
     sayfa açılışı hidrasyondan sonra boşuna remount olurdu). Layout aşamasında
     olduğu için ekrana ara kare düşmüyor. `effects` kapalıyken okunan bir stil
     yok, o yüzden orada hiç tetiklenmiyor. */
  const theme = useDocumentTheme()
  const [themeGeneration, setThemeGeneration] = React.useState(0)
  const lastTheme = React.useRef<typeof theme>(null)

  useIsomorphicLayoutEffect(() => {
    const previous = lastTheme.current
    lastTheme.current = theme
    if (effects && theme && previous && previous !== theme) {
      setThemeGeneration((generation) => generation + 1)
    }
  }, [effects, theme])

  // `SmoothCorners`ın polimorfik imzası çözülmemiş bir jenerik `E` ile
  // eşleşmiyor (TS `Omit<ComponentProps<E>, ...>`i daraltamıyor). Dışa açık
  // `SquircleProps<E>` zaten ondan türetildiği ve burada yalnız aynen
  // geçirildiği için tipleri gövde içinde tek noktada silmek güvenli.
  const Component = SmoothCorners as React.ComponentType<
    Record<string, unknown>
  >

  return (
    <Component
      key={themeGeneration}
      corners={corners}
      autoEffects={effects}
      {...(props as Record<string, unknown>)}
    />
  )
}
