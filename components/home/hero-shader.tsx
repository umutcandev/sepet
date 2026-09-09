"use client"

import * as React from "react"
import { Warp } from "@paper-design/shaders-react"
import { useReducedMotion } from "motion/react"

import { useMediaQuery } from "@/hooks/use-media-query"

/* ---------------------------------------------------------------------------
   Hero zemini: Paper "Warp" (shaders.paper.design/warp)

   Önceki zemin "Grain Gradient / Wave" idi: ÜÇ KATLI dikey bir kompozisyon
   (üstte düz gökyüzü, ortada dalgalı ufuk, altta koyu zemin). Yerine akışkan,
   yönsüz bir mermer geldi: renk alanları swirl ile birbirine dolanıyor, dikey
   bir "ufuk" yok.

   BU FARK KENAR SÖZLEŞMESİNİ DEĞİŞTİRDİ, o yüzden aşağıdaki iki madde eskisiyle
   birebir aynı değil:

   1. ÜST KENAR — Warp'ın `colorBack`i YOK: tuvalin tamamı renkle doluyor, yani
      eski "üst plato = --background" numarası mümkün değil. Ana sayfada header
      hero'nun ÜSTÜNDE ayrı bir şerit; zemini düz --background olduğu sürece
      tepede sayfayı boydan boya kesen bir renk BASAMAĞI kalıyor.

      İKİ DENEME BAŞARISIZ OLDU, ikisi de aynı yanlıştan: basamağı gizlemeye
      çalışmak. (a) Canvas'ın tepesini --background'a söndüren 9rem'lik bir
      maske — shader'ın en yoğun bölgesini yıkayıp düz, ölü bir bant bıraktı.
      (b) Paletin baskın tonunu --background'a eşitlemek — basamağı küçülttü
      ama <main>'in tepesindeki 48px'lik sticky `home-header-fade` zaten düz
      `bg-background` boyadığı için soluk bant yerinde durdu.

      ÇÖZÜM BASAMAĞI YOK ETMEK. Bu bileşen artık hero'nun içinde değil:
      app-shell'de, header ile <main>'in ALTINDA duran tek bir katman. Header
      ve sticky fade ana sayfada kendi zeminlerini scroll'a bağlı kazanıyor
      (`HOME_HEADER_SOLID_RANGE`), yani sayfa tepedeyken shader ikisinin de
      arkasından kesintisiz akıyor — gizlenecek bir kenar kalmıyor.

      Paletlerin baskın tonu yine de --background'ın kendisi. Artık zorunluluk
      değil ama ucuz bir emniyet: header zemini geldiği anda geçiş fark
      edilmiyor.
   2. ALT KENAR — eskiden colors[2] = --home-base idi, yani dipteki
      `.home-hero-fade` aynı rengi kendine bağlıyordu ve teknik olarak görünmez
      bir rampaydı. Warp'ta dip diye bir bölge yok; geçişin TAMAMINI artık o
      rampa taşıyor ve YERİ DEĞİŞTİ: opak taban artık logo şeridinin altında
      (8 → 6.5 → 1.5rem), rampa şeridin arkasından geçiyor (toplam 13.5rem).
      Karartı hero'nun dibinde bir blok olmaktan çıkıp şeridin arkasında
      başlayan bir geçişe döndü. Ayrıntısı ve şeridin logo rengine etkisi
      globals.css'te `.home-hero-fade` notunda.
   3. Geometri her iki temada AYNI. Tema yalnızca paleti değiştirir.

   app-shell'deki scroll rampası (header'ın --home-base'e akması), --logo-swap
   ve `data-home-dark-start` nişanı yine hiç etkilenmiyor: onlar shader'ı değil
   token'ları okuyor.
   --------------------------------------------------------------------------- */

/* Kompozisyon (geometri) — iki temada ortak, playground'daki ayarların birebir
   karşılığı:

   shaders.paper.design/warp#proportion=0.44&softness=1&distortion=0.03
     &swirl=0.68&swirlIterations=6&shape=checks&shapeScale=0&speed=5
     &scale=1.04&rotation=64

   `shapeScale: 0` yüzünden `shape: "checks"` pratikte hiçbir şey çizmiyor —
   taban desen tamamen sönük, görüntüyü swirl + distortion kuruyor. Yine de
   playground'daki değerle bırakıldı: shapeScale büyütüldüğünde hangi desenin
   ortaya çıkacağı buradan okunsun.

   `fit: "cover"` + `worldWidth/Height` PLAYGROUND'DA YOK, burada ŞART.

   Warp varsayılanı `defaultPatternSizing`, yani `fit: "none"`: desen CSS
   pikseline kilitli, ölçek MUTLAK. Playground'un ~884×502'lik tuvalinde
   kompozisyon tam oturuyor ama boy değişince kadraj değişiyor, resim değil.
   Telefonda (390px genişlik) mermerin yalnızca küçük bir parçası kalıyordu —
   swirl'ün dönüşü kadraja hiç girmediği için ekranda düz, ölü bir gradyan gibi
   görünüyordu. "Mobilde berbat" tam olarak bu.

   `cover` bunu düzeltir: dünya kutusu (aşağıdaki WORLD) tuvali kaplayacak
   şekilde ölçekleniyor, yani kompozisyon KUTUYA ORANLI. Hangi ekranda olursak
   olalım playground'daki kadrajın aynısını görüyoruz, sadece dar ekranda dikey
   bir dilimi kırpılmış hâli. Kutu ölçüleri playground tuvalinin ölçüleri:
   ayarlar orada bu kadrajda seçildi, referans o.

   `scale` yine 1.04 — playground'daki değer. Artık mutlak bir piksel ölçeği
   değil, `cover`in bulduğu ölçeğin üstüne binen bir çarpan; büyütmek dokuyu
   iriltir, küçültmek daha çok mermer gösterir. */
const WORLD = { worldWidth: 884, worldHeight: 502 } as const

const GEOMETRY = {
  shape: "checks",
  shapeScale: 0,
  proportion: 0.44,
  softness: 1,
  distortion: 0.03,
  swirl: 0.68,
  swirlIterations: 6,
  scale: 1.04,
  rotation: 64,
  offsetX: 0,
  offsetY: 0,
  fit: "cover",
  ...WORLD,
} as const

/* Playground'daki hız. Eski zeminde 1'di; Warp'ın swirl'ü çok daha yavaş
   ilerleyen bir deformasyon olduğu için 5 burada "hızlı" değil, canlı duruyor. */
const SPEED = 5

/* TEMA, next-themes'in `resolvedTheme`inden DEĞİL <html>'in sınıfından okunuyor.

   Zemin ancak paleti bilince mount edilebilir (yanlış paletle tek kare bile
   boyanmamalı), yani "shader ne zaman gelir" sorusunun cevabı doğrudan "tema ne
   zaman belli olur". `resolvedTheme` bunu geç veriyordu: kullanıcı "Sistem"
   temasındaysa next-themes değeri bir EFFECT içinde matchMedia okuyup
   yerleştiriyor, yani hidrasyondan sonra fazladan bir render turu.

   Oysa doğru cevap o anda ZATEN DOM'da: next-themes'in <head>'e koyduğu bloke
   edici script, `dark` sınıfını daha ilk boyamadan önce <html>'e yazıyor.
   Buradan okumak bir tur kazandırıyor — shader hidrasyonla aynı commit'te
   mount oluyor.

   `useSyncExternalStore` tam da bunun için: sunucu anlık görüntüsü null (SSR'da
   sınıf okunamaz, zemin render edilmez), istemci anlık görüntüsü ilk render'dan
   itibaren gerçek değer, MutationObserver da tema anahtarını yakalıyor.

   BUNUN ÖTESİNDEKİ GECİKME BURADAN ÇÖZÜLMEZ: shaders paketi client bundle'ın
   parçası, yani indirilip ayrıştırılması ve sayfanın hidrate olması gerekiyor;
   sonra WebGL context'i kuruluyor, fragment shader derleniyor ve kütüphane
   noise dokusunu (data URI) çözmeyi bekliyor. Bunlar canvas'ın doğal maliyeti;
   `dynamic import` ile ertelemek işi daha da geciktirirdi. */
const themeStore = {
  subscribe(onStoreChange: () => void) {
    const observer = new MutationObserver(onStoreChange)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  },
  getSnapshot(): "dark" | "light" {
    return document.documentElement.classList.contains("dark")
      ? "dark"
      : "light"
  },
  getServerSnapshot(): null {
    return null
  },
}

function useDocumentTheme() {
  return React.useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    themeStore.getServerSnapshot
  )
}

/* Palet — geometri sabit, tema yalnızca RENKLERİ değiştiriyor.

   Playground'daki üçlü (#3c1515 → #944752 → #ffc085) koyu bir kompozisyon:
   gece tarafının şablonu o. Ama iki şeye uyarlandı:

   • MARKA HUE'SU. Ortadaki #944752 gül/mürdüm; sitenin bütün paleti sıcak
     kahve-amber. Aynı yerdeki renk kahveye çevrildi, kırmızıdaki sıcaklık
     korundu.
   • KONTRAST. Shader'ın üstünde kendi zemini OLMAYAN tek eleman h1; prompt,
     çipler ve rozet kendi yüzeylerini taşıyor. Yani palet seçilirken tek ölçü
     h1'in en kötü hâli. Aşağıdaki değerler bu yüzden hesaplandı, göz kararı
     seçilmedi.

   Gündüz — krem mermer. SIRALAMA GECEYLE AYNI YAPIDA, bu bir detay değil
   paletin çalışma biçimi: Warp'ta colors[0] ve colors[1] geniş alanlara,
   colors[2] dar bir vurguya düşüyor (playground referansında da öyle — iki
   büyük kütle + tek parlak köşe).

   Önceki deneme sıralamayı ters kurmuştu (#C08552 → #D4A574 → #FFF8F0): amber
   baskın, krem yalnızca vurgu. Sonuç ekranda turuncu bir alan; sayfanın kendi
   zemininden kopuk duruyordu ve header'ın dibinde kapatılacak fark en büyük
   hâlindeydi. Şimdi baskın ton doğrudan --background: hem sayfayla aynı krem,
   hem header kenarı sorunsuz (bkz. dosya başı, madde 1).

   İKİ RENK DOYGUNLAŞTIRILDI, açılıp koyulaşmadı. İlk sürüm (#EFD8BB / #C08552)
   ekranda soluk duruyordu; sebebi parlaklık değil KROMA — ikisi de token
   ailesinin en nötr uçlarıydı ve krem alanla aralarında ton farkı kalmıyordu.
   Aynı parlaklık bandında kalıp doygunluğu artırmak, kompozisyonu açıp
   kontrastı bozmadan canlandırıyor.

   En kötü hâl: --foreground (#3D2418) vurgu tonu #C8853F'nin üstünde 4.70:1 —
   normal metin eşiğinin de üstünde (eski #C08552 4.59:1'di, yani doygunlaşma
   kontrastı düşürmedi). Ara ton #F2D2A6'da 11.6:1. Vurgu tonunu koyulaştıran
   biri bu ölçüyü tekrar yapmalı. */
const LIGHT = {
  colors: [
    "#FFF8F0", // --background · krem alan (baskın, header kenarını kapatan ton)
    "#F2D2A6", // sıcak kum ara ton (--accent ailesi, belirgin şekilde daha doygun)
    "#C8853F", // amber vurgu (--chart-1 #C08552'nin doygun hâli)
  ],
} as const

/* Gece — espresso → kahve → karamel. Playground'daki koyu→parlak dizilimi
   aynen duruyor, hue tamamen markanın eksenine çekildi.

   BİR ARA DENEME GERİ ALINDI: playground'ın kırmızısına sadık kalmaya çalışan
   #2A1410 / #6E3B2C / #A06848 üçlüsü ekranda tuğla kırmızısı, çamurlu bir alan
   veriyordu — sitenin hiçbir yerinde olmayan bir hue. Kırmızıyı taşımaya
   çalışmak yerine kompozisyonun YAPISI (baskın koyu alan + tek parlak köşe)
   korundu, renkler markanın kendi rampasından seçildi.

   Baskın ton doğrudan --background: üst kenarın header'la dikişsiz kapanması
   buna bağlı (bkz. dosya başı, madde 1).

   TEPE TONU BİLEREK #ffc085 DEĞİL, hatta --primary (#D4A574) bile değil.
   Ölçüldü: --foreground (#F5E8DA) o şeftali tonunun üstünde 1.6:1, #D4A574'ün
   üstünde 1.64:1 veriyor — başlık, parlak alan arkasına geldiği anda okunmuyor
   ve o alan duran bir şey değil, swirl ile geziniyor. #A96A3A ile en kötü hâl
   3.22:1: h1 her kırılımda ≥30px, yani büyük metin eşiğinin (3:1) üstünde.
   Marka amberinin canlılığı parlaklıktan değil DOYGUNLUKTAN geliyor — tepeyi
   açmak yerine kroması yüksek tutuldu. Daha parlak bir tepe isteyen, aynı
   ölçüyü tekrarlamak zorunda. */
const DARK = {
  colors: [
    "#1A130E", // --background · espresso alan (baskın, header kenarını kapatan ton)
    "#5C3A24", // koyu kahve ara ton
    "#A96A3A", // doygun karamel tepe
  ],
} as const

/* ÖRNEKLEME TAVANI — CSS pikseli başına kaç GPU pikseli boyanacak.

   Kütüphane `maxPixelCount`i mutlak bir piksel sayısı olarak alıyor ve tek
   başına yeterli değil: tavan yalnız BÜYÜK ekranlarda devreye giriyor, telefon
   hiçbir zaman ona değmiyor. Varsayılan yol şuydu — minPixelRatio 2, dpr 3 olan
   bir telefonda kütüphane NATIVE 3x'te boyuyor: 390×844'lük bir hero'da
   1170×2532 ≈ 2.96M piksel, saniyede 60 kez. Warp'ta her piksel için `swirl`
   döngüsü `swirlIterations` (6) kez dönüyor, üstüne noise dokusu okunuyor —
   yani fragment başına iş eski shader'dan az değil.

   Tavanı ölçekten türetiyoruz: maxPixelCount = genişlik × yükseklik × kare.

   BUNU YAPABİLMEMİZİN SEBEBİ, kompozisyonun çözünürlükten BAĞIMSIZ olması:
   desen CSS pikseline kilitli (fit: "none"), tavanı düşürmek resmi DEĞİŞTİRMEZ,
   aynı resmi daha seyrek örnekler. Warp yumuşak bir alan olduğu için (softness
   1, sert kenar yok) bu takas eski taneli zemindekinden bile ucuz.

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

type Props = {
  /* Zemin tamamen kapandığında (blog bölümü header'a dayandığında) app-shell
     bunu true'ya çeker ve animasyon donar.

     Eskiden bu kararı bileşenin kendi IntersectionObserver'ı veriyordu. Artık
     veremiyor: katman <main>'in dışında, yani kaydırma onu hiç oynatmıyor ve
     kesişim durumu asla değişmiyor. Kapanmayı bilen tek yer scroll rampasını
     zaten ölçen app-shell. */
  covered?: boolean
}

export function HomeHeroBackdrop({ covered = false }: Props) {
  const theme = useDocumentTheme()
  const reduceMotion = useReducedMotion()
  const containerRef = React.useRef<HTMLDivElement>(null)

  /* Kabın ölçüsü örnekleme tavanını veriyor. Kabı ölçmek pencereyi ölçmekten
     iyi: yükseklik `--hero-vh` ile zaten donduruluyor (mobil klavye onu
     oynatmasın diye) ve kap o donmuş değeri taşıyor — yani klavye açılınca
     canvas yeniden boyutlanmıyor. */
  const [heroSize, setHeroSize] = React.useState({ width: 0, height: 0 })

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

    return () => resizeObserver.disconnect()
  }, [])

  /* Tema okunana kadar (yalnız SSR) zemin mount edilmiyor: yanlış paletle tek
     kare bile boyanmasın. O ana dek hero düz --background kalır.

     JS kapalıysa bu zemin hiç gelmez: hero düz --background kalır ve logo
     şeridi kendi sert kenarıyla başlar. Yumuşatma kaybolur ama düzen bozulmaz. */
  const themeReady = theme !== null
  const palette = theme === "dark" ? DARK : LIGHT

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
      /* Katman SidebarInset'in tepesine yapışık ve tam bir viewport boyu:
         header (4rem) + hero (calc(--hero-vh - 4rem)) = --hero-vh, yani dibi
         hero'nun dibiyle çakışıyor. `--hero-vh` home-hero.tsx'te donduruluyor;
         JS çalışmazsa 100svh fallback'i devrede. */
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[var(--hero-vh,100svh)] overflow-hidden"
    >
      {themeReady ? (
        /* GİRİŞ ANİMASYONU YOK — zemin mount olduğu karede tam görünür.
           Burada bir zamanlar `hero-shader-fx` vardı (40px yükselme + 0.9s
           sönümleme); yukarıdaki "yapay gecikme yok" notunun aynı gerekçesi
           ona da işliyordu: canvas hidrasyon + tema çözümünden sonra geldiği
           için zaten doğal bir bekleme var, animasyon onun ÜSTÜNE biniyor ve
           zemin sayfanın geri kalanının gerisine düşüyordu.

           Sarmalayıcı yine de duruyor: canvas ile dipteki fade rampasını tek
           konumlandırma bağlamında topluyor.

           Tema değişiminde renkler anında takas oluyor, çapraz sönümleme yok:
           sayfanın geri kalanındaki token'lar da anında flip ediyor, shader'a
           özel bir gecikme onu diğer her şeyin gerisine düşürürdü. */
        <div className="relative size-full">
          <Warp
            {...GEOMETRY}
            colors={[...palette.colors]}
            // reduce-motion: hız 0 → tek, deterministik kare. Kompozisyon
            // duruyor, yalnızca akış kalkıyor. `covered` de aynı kapıyı
            // kullanıyor: kütüphanede speed=0, rAF döngüsünü tamamen iptal
            // ediyor (zaman korunur), yani kullanıcı aşağıdaki bölümlerde
            // gezerken boşuna GPU yakılmıyor.
            speed={reduceMotion || covered ? 0 : SPEED}
            maxPixelCount={maxPixelCount}
            webGlContextAttributes={WEBGL_CONTEXT}
            style={{ width: "100%", height: "100%" }}
          />
          {/* Dibi blog bölümünün rengine (--home-base) bağlayan rampa. Gradient
              detayları `.home-hero-fade` içinde (globals.css).

              SARMALAYICININ İÇİNDE, canvas'ın hemen ÜSTÜNDE duruyor: ikisi tek
              cisim, birlikte belirir. Dışarıda ayrı bir kardeş olsaydı tema
              çözülmeden de boyanır, karartı ufuksuz kalır ve logo şeridinin
              arkasında gerekçesiz bir bant gibi görünürdü.

              Yükseklik YÜZDE DEĞİL sabit: gradient durakları rem cinsinden ve
              üstüne binen blog bölümünün bindirmesi de sabit piksel (96/112px).
              `h-[22%]` iken kısa pencerelerde tam opak bölge bindirmeden kısa
              kalıyor, bölümün sert üst kenarı çizgi olarak görünüyordu.
              13.5rem = 1.5rem opak dip + 12rem rampa. Opak taban logo şeridinin
              ALTINDA: rampa şeridin arkasından geçiyor, karartı orada başlayıp
              şeridi geçince kapanıyor. Alfa dağılımı ((1-u)⁵) ve şeridin logo
              renginin buna bağlı değişimi globals.css'te. */}
          <div className="home-hero-fade absolute inset-x-0 bottom-0 h-[13.5rem]" />
        </div>
      ) : null}
    </div>
  )
}
