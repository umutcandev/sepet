"use client"

import * as React from "react"
import { Warp } from "@paper-design/shaders-react"
import { useReducedMotion } from "motion/react"

import { useDocumentTheme } from "@/hooks/use-document-theme"
import { useMediaQuery } from "@/hooks/use-media-query"

const GEOMETRY = {
  shape: "checks",
  shapeScale: 0,
  proportion: 0.50,
  softness: 1,
  distortion: 0.30,
  swirl: 0.80,
  swirlIterations: 3,
  rotation: 64,
  offsetX: 0,
  offsetY: 0,
  // cover + world: kadraj mutlak piksele değil kutuya oranlı, dar ekranda
  // kompozisyonun dikey bir dilimi kırpılıyor (playground tuvali 884×502).
  fit: "cover",
  worldWidth: 884,
  worldHeight: 502,
} as const

const SPEED = 5

// cover'ın bulduğu ölçeğin üstüne binen çarpan: küçültmek daha çok mermer
// gösterir. Dar ekranda kadraj zaten kırpık, 1.04 orada iri ve detaysız kalıyor.
const SCALE_WIDE = 1.04
const SCALE_NARROW = 0.8
const NARROW_QUERY = "(max-width: 768px)"

/* Palet. Warp'ta colors[0..1] geniş alanlara, colors[2] dar bir vurguya düşüyor.
   Baskın ton = --background (header kenarı dikişsiz kapansın diye).
   Ölçü h1: shader üstünde kendi zemini olmayan tek eleman. */

// Üçü de açık temanın rampasından (hue 30–37°): --background, --accent'in bir
// tık doygun hâli, --chart-4. En kötü hâl --foreground/#D4A574 = 6.4:1.
// (Denendi, geri alındı: koyu vurgu #61390e h1'i 1.48:1'e düşürüyordu.)
const LIGHT = {
  colors: ["#FFF8F0", "#F6DDB6", "#D4A574"],
} as const

// En kötü hâl --foreground/#A96A3A = 3.22:1; h1 her kırılımda ≥30px, büyük
// metin eşiğinin üstünde. Tepeyi açan bu ölçüyü tekrarlamalı.
const DARK = {
  colors: ["#1A130E", "#5C3A24", "#A96A3A"],
} as const

/* Canvas gelene (ve WebGL hiç gelmezse sonsuza) kadar duran statik zemin.
   Sunucuda render ediliyor, JS beklemiyor: shader zinciri (bundle + hidrasyon +
   context + derleme) ilk boyamadan geç bittiği için hero eskiden o boşlukta düz
   --background kalıyordu. Temayı `dark:` varyantı seçiyor, palet tek kaynak.
   Saydam uç `transparent` değil `…00`: düz transparent saydam SİYAH. */
function staticBackdrop([base, mid, accent]: readonly string[]) {
  return [
    `radial-gradient(78% 62% at 82% 16%, ${accent} 0%, ${accent}00 62%)`,
    `radial-gradient(92% 78% at 16% 74%, ${mid} 0%, ${mid}00 70%)`,
    `linear-gradient(154deg, ${mid} 0%, ${base} 50%, ${mid} 100%)`,
  ].join(", ")
}

const LIGHT_BACKDROP = staticBackdrop(LIGHT.colors)
const DARK_BACKDROP = staticBackdrop(DARK.colors)

const HANDOFF_MS = 600

// maxPixelCount = alan × cap². Telefonda native 3x ~2.96M fragment demekti;
// 1.5 ile ~0.74M. Sinyal `pointer: coarse` (pil/tile GPU), genişlik değil.
const RENDER_SCALE_CAP_COARSE = 1.5
const RENDER_SCALE_CAP_FINE = 2
const ABSOLUTE_MAX_PIXEL_COUNT = 1920 * 1080 * 2

// Fullscreen dörtgen: kenar yok (MSAA gereksiz), derinlik/stencil kullanılmıyor.
const WEBGL_CONTEXT = {
  antialias: false,
  depth: false,
  stencil: false,
} as const satisfies WebGLContextAttributes

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

type Props = {
  /* Zemin tamamen kapandığında app-shell true'ya çeker, animasyon donar. Katman
     <main>'in dışında olduğu için kendi IntersectionObserver'ı bunu göremez. */
  covered?: boolean
}

export function HomeHeroBackdrop({ covered = false }: Props) {
  const theme = useDocumentTheme()
  const reduceMotion = useReducedMotion()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const canvasHostRef = React.useRef<HTMLDivElement>(null)

  // Kabın ölçüsü örnekleme tavanını veriyor (pencere değil: --hero-vh donmuş,
  // mobil klavye canvas'ı yeniden boyutlandırmıyor).
  const [heroSize, setHeroSize] = React.useState({ width: 0, height: 0 })

  // Senkron ölçüm + layout effect şart: ResizeObserver'ın ilk callback'i geç
  // geliyor, tavan o ana dek mutlak değere düşüyor ve canvas önce native
  // çözünürlükte kurulup sonra yeniden boyutlanıyordu (telefonda iki kat iş).
  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const commit = (width: number, height: number) =>
      setHeroSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      )

    const rect = el.getBoundingClientRect()
    if (rect.height) commit(rect.width, rect.height)

    const resizeObserver = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect
      if (box?.height) commit(box.width, box.height)
    })
    resizeObserver.observe(el)

    return () => resizeObserver.disconnect()
  }, [])

  const themeReady = theme !== null
  const palette = theme === "dark" ? DARK : LIGHT

  // Kütüphane, context + derleme + uniform'lar bittiğinde kabına
  // `data-paper-shader` yazıyor: devir nişanı bu. Hiç gelmezse (WebGL yok)
  // statik zemin kalıcı olarak yerinde kalır.
  const [canvasLive, setCanvasLive] = React.useState(false)

  React.useEffect(() => {
    if (!themeReady || canvasLive) return
    const host = canvasHostRef.current
    if (!host) return

    let raf = 0
    const announce = () => {
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => setCanvasLive(true))
      })
    }

    if (host.querySelector("[data-paper-shader]")) {
      announce()
      return () => cancelAnimationFrame(raf)
    }

    const observer = new MutationObserver(() => {
      if (!host.querySelector("[data-paper-shader]")) return
      observer.disconnect()
      announce()
    })
    observer.observe(host, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-paper-shader"],
    })

    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [themeReady, canvasLive])

  const scaleCap = useMediaQuery("(pointer: coarse)")
    ? RENDER_SCALE_CAP_COARSE
    : RENDER_SCALE_CAP_FINE
  const measuredArea = heroSize.width * heroSize.height
  const maxPixelCount = measuredArea
    ? Math.min(
        ABSOLUTE_MAX_PIXEL_COUNT,
        Math.ceil(measuredArea * scaleCap * scaleCap)
      )
    : ABSOLUTE_MAX_PIXEL_COUNT

  const scale = useMediaQuery(NARROW_QUERY) ? SCALE_NARROW : SCALE_WIDE

  return (
    <div
      ref={containerRef}
      aria-hidden
      // Mobilde header 4rem + hero, masaüstünde yalnız hero (header orada
      // akıştan çıkmış): iki halde de --hero-vh, yani katman SidebarInset'i
      // boydan boya dolduruyor. Dip kenarı viewport dibinde kaldığı için hiç
      // görünmez; kaydırınca bölümün saydam üst bölgesinden bu sabit zemin
      // görünür, opak bölgesi onu kapatır. --hero-vh home-hero.tsx'te donuyor.
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[var(--hero-vh,100svh)] overflow-hidden"
    >
      <div
        className="absolute inset-0 dark:hidden"
        style={{ background: LIGHT_BACKDROP }}
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{ background: DARK_BACKDROP }}
      />

      {themeReady ? (
        // Opaklık mount'a değil `canvasLive`e bağlı: mount ile ilk kare arasında
        // aralık var, mount'ta başlayan geçiş o aralığı boşa harcar ve devir
        // yine sıçrardı. Tema değişiminde renkler anında takas olur; alttaki
        // statik zemin de `dark:` ile aynı anda flip ettiği için ayrışmazlar.
        <div
          ref={canvasHostRef}
          className="absolute inset-0"
          style={{
            opacity: canvasLive ? 1 : 0,
            transition: `opacity ${reduceMotion ? 0 : HANDOFF_MS}ms ease-out`,
          }}
        >
          <Warp
            {...GEOMETRY}
            scale={scale}
            colors={[...palette.colors]}
            // speed=0 rAF döngüsünü tamamen iptal ediyor (zaman korunur).
            speed={reduceMotion || covered ? 0 : SPEED}
            maxPixelCount={maxPixelCount}
            webGlContextAttributes={WEBGL_CONTEXT}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      ) : null}

      {/* Dip rampası BURADA DEĞİL. Eskiden 13.5rem'lik `.home-hero-fade` vardı
          ve en alt 1.5rem'i tam opak --home-base'ti; logo şeridi hero dibinin
          4-92px üstünde durduğu için karartı tam şeridin arkasından başlıyordu.
          Geçişin tamamı artık bölümün kendi zemininde (`.home-dark-ground`),
          "Asistanla Tanışın" başlığının 24px üstünden başlıyor. Shader kendi
          dibine kadar temiz akıyor. */}
    </div>
  )
}
