"use client"

import * as React from "react"
import { Slot, SmoothCorners } from "@lisse/react"

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
 *
 * DOKUNMATİK CİHAZLARDA LİSSE YOK. Köşe düz `border-radius`, kenar ve gölge
 * elemanın kendi CSS'i, içeriği köşeden kırpan iş `overflow: clip` (globals.css,
 * `[data-squircle]`). Ana sayfada 74 SVG `feGaussianBlur` ve 106 `clip-path`
 * vardı; Android'de kaydırırken raster işinin ~4/5'i bunlardı ve karolar
 * yetişmeyip boş görünüyordu. Görünen fark yok (aşağıda, CURVE). İşaretleme iki
 * modda birebir aynı: mod hidrasyonda değişmez, sunucuyla uyuşmazlık doğmaz.
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

// `hero-shader.tsx`teki işaretle aynı: dokunmatik = pil ve tile tabanlı GPU.
const PLAIN_QUERY = "(pointer: coarse)"

/* `useMediaQuery` DEĞİL: o hidrasyonda sunucu değerini (false) döndürüyor,
   yani telefonda Lisse önce kurulup SVG'lerini açar, bir sonraki render'da
   söker ve alt ağacı yeniden mount ederdi. Değer yalnız hangi yolun
   çalışacağını seçiyor, işaretlemeyi değiştirmiyor; ilk istemci render'ında
   gerçek değeri okumak bu yüzden güvenli. */
function usePlainCorners() {
  const [plain, setPlain] = React.useState(
    () =>
      typeof window !== "undefined" && window.matchMedia(PLAIN_QUERY).matches
  )
  React.useEffect(() => {
    const mql = window.matchMedia(PLAIN_QUERY)
    const onChange = (event: MediaQueryListEvent) => setPlain(event.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])
  return plain
}

type PlainCornersProps = {
  as?: React.ElementType
  asChild?: boolean
  style?: React.CSSProperties
} & Record<string, unknown>

/* `SmoothCorners`ın sunucuda ürettiği işaretlemenin aynısı: `effects`le
   `position: relative` bir sarmalayıcı, elemanda ilk boyamanın
   `border-radius`u. Lisse bunu hidrasyondan sonra clip-path ve SVG ile
   değiştiriyor; burada olduğu gibi kalıyor. */
function PlainCorners({
  radius,
  effects,
  props: { as: Tag = "div", asChild, style, ...rest },
}: {
  radius: number
  effects: boolean
  props: PlainCornersProps
}) {
  const own = { ...rest, style: { borderRadius: `${radius}px`, ...style } }
  const element = asChild ? <Slot {...own} /> : <Tag {...own} />
  return effects ? (
    <div style={{ position: "relative" }}>{element}</div>
  ) : (
    element
  )
}

export function Squircle<E extends React.ElementType = "div">({
  radius = "lg",
  effects = false,
  ...props
}: SquircleProps<E>) {
  const radiusPx = typeof radius === "number" ? radius : SQUIRCLE_RADIUS[radius]
  const corners = React.useMemo(
    () => ({ ...CURVE, radius: radiusPx }),
    [radiusPx]
  )
  const plain = usePlainCorners()

  /* Lisse CSS `border`/`box-shadow`u YALNIZ mount'ta okuyup SVG'ye taşıyor,
     MutationObserver'ı yok. Tema değişince SVG eski renkte kalıyor: gece→gündüz
     geçişinde kartların kenarında siyahımsı bir çerçeve olarak duruyor ve F5'e
     kadar gitmiyordu. Kütüphanede yeniden okutmanın kapısı yok, tek çare
     remount — `key` tema DEĞİŞİMİNDE artıyor (ilk yüklemede değil, yoksa her
     sayfa açılışı hidrasyondan sonra boşuna remount olurdu). Layout aşamasında
     olduğu için ekrana ara kare düşmüyor. `effects` kapalıyken okunan bir stil
     yok, o yüzden orada hiç tetiklenmiyor; dokunmatik modda da yok, kenar ve
     gölge zaten CSS'te kalıyor ve temayla kendiliğinden değişiyor. */
  const theme = useDocumentTheme()
  const [themeGeneration, setThemeGeneration] = React.useState(0)
  const lastTheme = React.useRef<typeof theme>(null)

  useIsomorphicLayoutEffect(() => {
    const previous = lastTheme.current
    lastTheme.current = theme
    if (effects && !plain && theme && previous && previous !== theme) {
      setThemeGeneration((generation) => generation + 1)
    }
  }, [effects, plain, theme])

  if (plain) {
    return (
      <PlainCorners
        radius={radiusPx}
        effects={effects}
        props={{ ...(props as PlainCornersProps), "data-squircle": "" }}
      />
    )
  }

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
      data-squircle=""
    />
  )
}
