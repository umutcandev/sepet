"use client"

import * as React from "react"
import { GrainGradient } from "@paper-design/shaders-react"
import { useReducedMotion } from "motion/react"
import { useTheme } from "next-themes"

import { useMediaQuery } from "@/hooks/use-media-query"
import { useMounted } from "@/hooks/use-mounted"

/* ---------------------------------------------------------------------------
   Hero zemini: Paper "Grain Gradient / Wave" (shaders.paper.design/grain-gradient)

   Eskiden burada iki AVIF/WebP manzara görseli vardı (gündüz/gece), maskeyle
   yukarı doğru söndürülüyordu. Yerine aynı kompozisyonu ÜRETEN bir shader
   geldi: üstte düz gökyüzü, ortada dalgalı sıcak ufuk, altta koyu zemin.

   ÜÇ KENAR SÖZLEŞMESİ — bu üçü tutarsa hero'nun etrafındaki hiçbir mekanizmaya
   dokunmak gerekmez:

   1. `colorBack` = --background. Shader'ın üst platosu sayfanın kendi zemini
      ile BİREBİR aynı renk. Görselde şart olan üst maske bu yüzden tamamen
      kalktı: söndürülecek bir fark yok. (Renkler shader'a sRGB olarak giriyor,
      arada renk uzayı dönüşümü yok — hex ne ise ekranda o.)
   2. `colors[2]` = --home-base. Alt plato, hero'nun dibindeki `.home-hero-fade`
      ile aynı renk. Fade'in 17rem'lik rampası artık iki farklı şeyi değil aynı
      rengi birbirine bağlıyor; dikiş görünmez.
   3. Geometri her iki temada AYNI. Tema yalnızca paleti değiştirir.

   Böylece app-shell'deki scroll rampası (header'ın --home-base'e akması),
   --logo-swap ve `data-home-dark-start` nişanı hiç etkilenmez: onlar zaten
   shader'ı değil token'ları okuyor.
   --------------------------------------------------------------------------- */

/* Kompozisyon (geometri) — iki temada ortak.

   Dikey yerleşimin matematiği (vertex + fragment shader'dan türetildi):

     shape_uv.y = 0.005 * (uv.y + offsetY) * heroYüksekliği(css px) / scale

   `uv.y` üstte +0.5, altta -0.5. Geçiş bandı `shape_uv.y + wave ∈ [-1, 1]`
   aralığı; `wave` zamanla ±0.85 salınıyor, yani ufuk sabit durmaz, süzülür.

   DİKKAT — formülde hero YÜKSEKLİĞİ var. `scale` sabit bir sayı olsaydı
   kompozisyon pencere boyuna göre kayardı: kısa pencerede bant genişler ve
   koyu uç yukarı, metnin arkasına tırmanır. Ölçüldü (offsetY=0.10,
   softness=0.70): sabit scale=1 ile gündüz başlık kontrastı 1000px'lik hero'da
   4.82:1 iken 764px'te 2.49:1, 480px'te 1.82:1'e düşüyordu — okunmuyor.

   Bu yüzden `scale` yüksekliğe ORANLI (aşağıda REFERENCE_HERO_HEIGHT).
   Katsayı her pencerede sabit kalır, kompozisyon her ekranda birebir aynı
   görünür ve kontrast yükseklikten bağımsız hâle gelir. Referans yükseklikte
   çarpan 1'dir, yani buradaki değerler doğrudan playground'daki karşılıkları.

   `scale`in yalnız dalgayı taşıması tesadüf değil: tanecik UV'si shader'da
   önce scale'e bölünüp sonra scale ile çarpılıyor, yani grain ekrana kilitli.
   Ölçek oynatmak dokunun inceliğini DEĞİŞTİRMEZ, sadece dalgayı ölçekler.

   offsetY'yi büyütmek kompozisyonu aşağı iter (metin bölgesi daha güvenli,
   dalga fade'in içinde kaybolur), küçültmek yukarı çeker (dalga başlığa
   yaklaşır ve kontrast riski başlar). softness'ı büyütmek geçişi yumuşatır. */
const REFERENCE_HERO_HEIGHT = 764

const GEOMETRY = {
  shape: "wave",
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  /* softness/intensity/noise Paper'ın "Wave" preset'inden birebir alındı —
     shader'ın imzası bu üçlü. `noise` tanecikleri `shape`i İLERİ iter, yani
     sıradaki renge doğru: gece gökyüzünde amber noktalara (yıldız), gündüz krem
     gökyüzünde sıcak toz zerrelerine dönüşüyorlar. Fazla "kirli" gelirse ilk
     kısılacak değer bu. */
  softness: 0.70,
  intensity: 0.15,
  noise: 0.10,
} as const

/* Palet — geometri sabit, tema yalnızca RENKLERİ değiştiriyor.

   İkisi de aynı sahnenin farklı saati: sıcak amber bant her iki temada da AYNI
   yerde duruyor, değişen tek şey üstündeki gökyüzü.

   Gündüz — alacakaranlık: aydınlık gökyüzü, ufukta sıcak sis, altta koyu zemin.
   Rampa monoton koyulaşıyor.

   ARA TON KONTRASTLA SEÇİLDİ. Burada önce --chart-3 (#8C5A3C) vardı; dalga tepe
   yaptığında başlığın (koyu kahve --foreground) arkası tam o tona oturuyor ve
   kontrast 2.49:1'e düşüyordu — büyük metin eşiği bile 3:1. --chart-1'e
   (#C08552) çıkınca en kötü hâl 4.59:1 oluyor, yani normal metin eşiğinin de
   üstünde. Buradaki tonu koyulaştırırken bu ölçüyü tekrar yapmak gerekir. */
const LIGHT = {
  colorBack: "#FFF8F0", // --background
  colors: [
    "#D4A574", // --chart-4 · sıcak ten, ufuk sisi
    "#C08552", // --chart-1 · amber ara ton
    "#0d0f0c", // --home-base · zemin
  ],
} as const

/* Gece — kutup ışığı: koyu gökyüzü, ufukta parlayan amber şerit, altta koyu
   zemin. Rampa monoton DEĞİL (koyu → parlak → koyu); parlak bant ince kalıyor
   çünkü shader'da colors[0] dar, colors[1] geniş bir aralığa düşüyor. Ekteki
   gece görselindeki aurora okuması tam olarak bu. */
const DARK = {
  colorBack: "#1A130E", // --background
  colors: [
    "#C08552", // --chart-2 · aurora tepesi
    "#3D2D1F", // --sidebar-accent · derin kahve düşüş
    "#1b0e08", // --home-base · zemin
  ],
} as const

/* ÖRNEKLEME TAVANI — CSS pikseli başına kaç GPU pikseli boyanacak.

   Kütüphane `maxPixelCount`i mutlak bir piksel sayısı olarak alıyor ve tek
   başına yeterli değil: tavan yalnız BÜYÜK ekranlarda devreye giriyor, telefon
   hiçbir zaman ona değmiyor. Varsayılan yol şuydu — minPixelRatio 2, dpr 3 olan
   bir telefonda kütüphane NATIVE 3x'te boyuyor: 390×844'lük bir hero'da
   1170×2532 ≈ 2.96M piksel, saniyede 60 kez, her piksel için 3 oktav fbm +
   birkaç simplex. Mobilde kastırmasının sebebi bu. Shader'ın pahalı olması
   "doğal", ölçeğin cihaza göre ayarlanmamış olması değil.

   Tavanı ölçekten türetiyoruz: maxPixelCount = genişlik × yükseklik × kare.

   BUNU YAPABİLMEMİZİN SEBEBİ, kompozisyonun çözünürlükten BAĞIMSIZ olması.
   Vertex shader'da `v_patternUV /= u_pixelRatio` var, yani hem dalga hem tanecik
   CSS pikseline kilitli. Tavanı düşürmek resmi DEĞİŞTİRMEZ, aynı resmi daha
   seyrek örnekler: yumuşak bir gradyanda fark görünmez, tanecikte biraz daha
   iri bir doku bırakır — grain'de bu zaten kabul edilebilir bir takas.

   1.5 telefonda ~4x daha az fragment işi demek (2.96M → 0.74M). Dokunmatik
   sinyali `pointer: coarse`; ekran genişliği değil, çünkü mesele boy değil
   pil + tile GPU + termal sınır (tabletler de bu tarafta doğru yere düşüyor). */
const RENDER_SCALE_CAP_COARSE = 1.5
const RENDER_SCALE_CAP_FINE = 2

/* Ölçekten bağımsız MUTLAK tavan; geniş monitörlerde ikinci bir emniyet.
   ~4.1M piksel 1440p ölçeğinde bir kareye denk. */
const ABSOLUTE_MAX_PIXEL_COUNT = 1920 * 1080 * 2

/* Fullscreen bir dörtgen boyuyoruz: kenar yok, yani MSAA'nın düzelteceği hiçbir
   şey yok — sadece tile GPU'larda bellek bant genişliği yakıyor. Derinlik ve
   stencil de kullanılmıyor (kütüphane yalnız COLOR_BUFFER_BIT temizliyor ve
   derinlik testi hiç açmıyor). Üçünü de kapatmak bedava kazanç. */
const WEBGL_CONTEXT = {
  antialias: false,
  depth: false,
  stencil: false,
} as const satisfies WebGLContextAttributes

/* GİRİŞTE YAPAY GECİKME YOK. Burada bir zamanlar hero'nun kademe dizisine
   (rozet 0.10, başlık 0.22, prompt 0.34...) eklenen 0.18s'lik bir gecikme
   vardı. Sorun şu ki bu gecikme MOUNT anına biniyordu: canvas zaten hidrasyon
   sonrası geliyor, yani doğal bir bekleme var ve gecikme onun ÜSTÜNE ekleniyor.
   Sonuç, zemin sayfanın geri kalanının gerisine düşüyordu. Animasyon mount olur
   olmaz başlar; hidrasyonun kendisi zaten dizideki yerini veriyor. */

export function HeroShader() {
  const mounted = useMounted()
  const { resolvedTheme } = useTheme()
  const reduceMotion = useReducedMotion()
  const containerRef = React.useRef<HTMLDivElement>(null)

  /* Hero ekrandan çıkınca animasyon donuyor. speed=0 kütüphanede rAF döngüsünü
     tamamen iptal ediyor (zaman da korunuyor), yani kullanıcı fiyatlandırma /
     footer bölgesinde gezerken boşuna GPU yakılmıyor. */
  const [onScreen, setOnScreen] = React.useState(true)

  /* Kabın ölçüsü iki işe birden yarıyor: YÜKSEKLİK kompozisyonu pencere boyundan
     bağımsız kılan ölçeği veriyor (yukarıdaki geometri notuna bak), genişlikle
     birlikte de örnekleme tavanını.

     Kabı ölçmek pencereyi ölçmekten iyi: hero'nun yüksekliği `--hero-vh` ile
     zaten donduruluyor (mobil klavye onu oynatmasın diye) ve kap o donmuş değeri
     taşıyor — yani klavye açılınca ne kompozisyon zıplıyor ne de canvas yeniden
     boyutlanıyor. */
  const [heroSize, setHeroSize] = React.useState({
    width: 0,
    height: REFERENCE_HERO_HEIGHT,
  })

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const resizeObserver = new ResizeObserver(([entry]) => {
      const rect = entry?.contentRect
      if (!rect?.height) return
      // Aynı ölçüde yeni nesne üretme: canvas boyutu değişmediği hâlde her
      // gözlemde render tetiklenmesin.
      setHeroSize((prev) =>
        prev.width === rect.width && prev.height === rect.height
          ? prev
          : { width: rect.width, height: rect.height }
      )
    })
    resizeObserver.observe(el)

    // root: null → viewport. Hero kaydırılabilir bir <main> içinde olsa da
    // IntersectionObserver ara kapların kırpmasını hesaba katıyor.
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => setOnScreen(entry?.isIntersecting ?? true),
      { rootMargin: "128px" }
    )
    intersectionObserver.observe(el)

    return () => {
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
    }
  }, [])

  /* Tema çözülene kadar (SSR + ilk istemci render'ı) zemin hiç mount edilmiyor:
     yanlış paletle tek kare bile boyanmasın. O ana dek hero düz --background,
     yani shader'ın kendi gökyüzü platosuyla aynı renk; dipteki karartı da
     ortada yok. Sayfanın dibindeki koyu bölüm (logo şeridi) kendi kenarından
     başlar, hero'nun içine taşan gerekçesiz bir leke bırakmaz.

     JS kapalıysa bu zemin hiç gelmez: hero düz --background kalır ve logo
     şeridi kendi sert kenarıyla başlar. Yumuşatma kaybolur ama düzen bozulmaz. */
  const themeReady = mounted && Boolean(resolvedTheme)
  const palette = resolvedTheme === "dark" ? DARK : LIGHT

  /* Örnekleme tavanı (yukarıdaki nota bak). Kap henüz ölçülmediyse (ilk kare)
     mutlak tavana düşüyoruz; ResizeObserver boyamadan önce teslim ettiği için
     bu pencere pratikte tek karelik. */
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

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0"
    >
      {themeReady ? (
        /* Giriş animasyonu (`hero-shader-fx`, globals.css): zemin de hero'nun
           geri kalanı gibi aşağıdan yükselerek kuruluyor, patlayarak belirmiyor.
           Sarmalayıcı AYRI bir eleman: transform dıştaki kaba binseydi
           ResizeObserver'ın ölçtüğü yükseklik animasyon boyunca oynar ve
           `scale` her karede yeniden hesaplanırdı.

           Tema DEĞİŞİMİNDE ise renkler anında takas oluyor, çapraz sönümleme
           yok: sayfanın geri kalanındaki token'lar da anında flip ediyor,
           shader'a özel bir gecikme onu diğer her şeyin gerisine düşürürdü.
           Animasyon yalnızca İLK belirmede oynar (bileşen tema değişiminde
           yeniden mount olmuyor). */
        <div className="hero-shader-fx relative size-full">
          <GrainGradient
            {...GEOMETRY}
            scale={heroSize.height / REFERENCE_HERO_HEIGHT}
            colorBack={palette.colorBack}
            colors={[...palette.colors]}
            // reduce-motion: hız 0 → tek, deterministik kare. Kompozisyon
            // duruyor, yalnızca süzülme kalkıyor.
            speed={reduceMotion || !onScreen ? 0 : 1}
            maxPixelCount={maxPixelCount}
            webGlContextAttributes={WEBGL_CONTEXT}
            style={{ width: "100%", height: "100%" }}
          />
          {/* Dibi blog bölümünün rengine (--home-base) bağlayan rampa. Gradient
              detayları `.home-hero-fade` içinde (globals.css).

              SARMALAYICININ İÇİNDE, canvas'ın hemen ÜSTÜNDE duruyor. İkisi tek
              cisim: aynı gecikme, aynı 40px, aynı eğri. Dışarıda ayrı bir kardeş
              olsaydı ilk boyamada yerine oturur, shader ise sonradan altından
              yükselirdi; karartı ufuksuz kalır ve logo şeridinin arkasında
              gerekçesiz bir bant gibi görünürdü.

              Yükseklik YÜZDE DEĞİL sabit: gradient durakları rem cinsinden ve
              üstüne binen blog bölümünün bindirmesi de sabit piksel (96/112px).
              `h-[22%]` iken kısa pencerelerde tam opak bölge bindirmeden kısa
              kalıyor, bölümün sert üst kenarı çizgi olarak görünüyordu.
              17rem = 8rem opak dip + 9rem rampa. */}
          <div className="home-hero-fade absolute inset-x-0 bottom-0 h-[17rem]" />
        </div>
      ) : null}
    </div>
  )
}
