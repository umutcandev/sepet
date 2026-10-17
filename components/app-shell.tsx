"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { RiAddLine, RiLayoutLeftLine } from "@remixicon/react"
import { useTheme } from "next-themes"
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "motion/react"

import { EASE_OUT_SOFT } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { useMounted } from "@/hooks/use-mounted"
import { AppSidebar } from "@/components/app-sidebar"
import { AssistantHeaderActions } from "@/components/assistant/assistant-header-actions"
import { ConversationTitleEditor } from "@/components/assistant/conversation-title-editor"
import { ShareConversationButton } from "@/components/assistant/share-conversation-dialog"
import { HomeHeroBackdrop } from "@/components/home/hero-shader"
import type { BlogNavItem } from "@/components/blog/blog-posts-group"
import { Button } from "@/components/ui/button"
import { BrandContextMenu } from "@/components/brand/brand-context-menu"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { HeaderUserMenu } from "@/components/header-user-menu"
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"
import { useCurrentUser } from "@/components/providers/session-provider"
import { loginDialog } from "@/lib/stores/login-dialog"
import { useAssistantTitle } from "@/lib/stores/assistant-title"

type Props = {
  blogPosts?: BlogNavItem[]
  children: React.ReactNode
}

// Ana sayfada header'ın açık zeminden --home-base'e geçtiği scroll mesafesi (px).
// Büyütmek geçişi daha yumuşak/uzun, küçültmek daha keskin yapar.
const HOME_DARK_RANGE = 160

/* Ana sayfada header'ın ZEMİNİNİ kazandığı scroll mesafesi (px).
   Hero zemini (Warp shader) artık header'ın ARKASINDAN geçiyor: sayfa tepedeyken
   header'ın kendi zemini yok, shader kesintisiz akıyor. Aşağı inildiği anda
   zemin geliyor ki içerik saydam bir şeridin altından geçmesin.

   Neden gerekti: shader'ın `colorBack`i yok, tuvalin tamamı renkli. Header ayrı
   bir `bg-background` şeridi olduğu sürece hero'nun tepesinde sayfayı boydan
   boya kesen bir renk basamağı kalıyordu — hangi maske/fade denendiyse basamağı
   gizlemek yerine yerine soluk bir bant koydu. Tek gerçek çözüm basamağı
   ORTADAN KALDIRMAK: aynı shader ikisinin de arkasında.

   56px, header yüksekliğinin (64px) hemen altında: ilk tekerlek hareketinde
   zemin oturuyor ama sayfa tepedeyken hiçbir iz bırakmıyor.

   MASAÜSTÜNDE ANA SAYFADA KULLANILMIYOR: header orada akıştan çıkmış ve
   tamamen saydam, zemin katmanları `md:hidden`. */
const HOME_HEADER_SOLID_RANGE = 56

/* Hero zemininin çizimden çıkması için opak çizginin header'ı ne kadar geçmesi
   gerektiği (px). Sıfır yetmez: görünürlük React state'i ile bir kare geç
   geliyor ve hızlı bir yukarı fırlatmada katman, rampanın dibi göründüğü
   karede hâlâ gizli kalabilirdi. Pay bir karede kaydırılan mesafeden büyük. */
const HOME_HERO_OFFSCREEN_MARGIN = 200

/* MOBİLDE KAYDIRMA BELGEDE, MASAÜSTÜNDE <main>'DE.

   Uygulama eskiden her genişlikte ekran boyunda (`h-svh`) bir kutuydu ve
   kaydırma içerideki <main>'deydi; belge hiç kaymıyordu. iOS Safari 26 saat
   şeridinin ve alttaki yüzen araç çubuğunun arkasında BELGENİN kendi
   boyamasını gösteriyor: kutu çubuğun hemen üstünde bittiği için arkasında
   çizilecek bir şey kalmıyor, kanvas rengi düz bir bant olarak görünüyordu
   ("kesik" görünüm). Aynı sebeple çubuklar kaydırınca küçülmüyor, Android'de
   adres çubuğu gizlenmiyordu.

   Mobilde içerik sayfaları artık belgeyle kayıyor ve header `sticky`. Sohbet
   (`/asistan`) uygulama düzeninde kalıyor: yazma alanı ekranın dibine sabit,
   mesaj listesi kendi kabında kayıyor. Masaüstü değişmedi: `inset` kart düzeni
   iç kaydırmaya göre kurulu, Safari'nin sorunu da orada yok. */
const DESKTOP_QUERY = "(min-width: 48rem)"

// Yalnızca mobil. Masaüstünde anahtar artık kenar çubuğunun kendi başlığında
// (app-sidebar.tsx): genişken sağ üstteki düğme, daraltılmışken üstüne gelince
// anahtara dönüşen logo. Mobilde ise kenar çubuğu bir `Sheet` ve kapalıyken
// ekranda hiç yok — açacak tutamak dışarıda kalmak zorunda.
//
// Kalıcı "⌘B" etiketi de bu taşımayla birlikte düştü: kısayolun yeri, düğmenin
// yanındaki sabit bir rozet değil tooltip (mobilde zaten anlamsızdı).
function SidebarToggleButton() {
  const { toggleSidebar, openMobile } = useSidebar()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggleSidebar}
      aria-label={openMobile ? "Kenar çubuğunu kapat" : "Kenar çubuğunu aç"}
      className="-ml-1 md:hidden"
    >
      <RiLayoutLeftLine className="cn-rtl-flip size-4" />
    </Button>
  )
}

function NewConversationButton() {
  // Drift case: assistant-chat URL'yi history.replaceState ile /asistan/[id]'ye
  // günceller ama Next içsel olarak hâlâ /asistan segment'inde olduğunu sanır.
  // Link href="/asistan" tıklaması aynı segment'e düşer → AssistantChat remount
  // olmaz, useChat client state'i (mesajlar, conversationId) korunur.
  // /asistan/* altındaki her durumda tam reload ile fresh mount sağlıyoruz.
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/asistan/")
    ) {
      e.preventDefault()
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- fresh mount kasıtlı; router.push aynı segment'e düşüp remount etmez (yukarıdaki drift notu).
      window.location.assign("/asistan")
    }
  }

  return (
    <>
      <Button variant="default" asChild size="sm" className="hidden md:inline-flex">
        <Link href="/asistan" onClick={handleClick}>
          <RiAddLine className="size-3.5" />
          Yeni Sohbet
        </Link>
      </Button>
      <Button
        variant="default"
        asChild
        size="icon-sm"
        className="md:hidden"
        aria-label="Yeni Sohbet"
      >
        <Link href="/asistan" onClick={handleClick}>
          <RiAddLine className="size-4" />
        </Link>
      </Button>
    </>
  )
}

export function AppShell({ blogPosts, children }: Props) {
  const pathname = usePathname()
  const { title, loading, conversationId } = useAssistantTitle()
  const [editingTitle, setEditingTitle] = React.useState(false)
  // Kullanıcı/sohbet listesi artık kök layout prop'undan değil, istemci
  // tarafı SessionProvider'dan gelir (paylaşımlı rotalar statik cache'lenebilsin
  // diye). Sidebar sohbet listesi assistantConversations store'undan okunur ve
  // hidrasyonu SessionProvider `/api/me` sonrası bir kez yapar.
  // displayUser: çözümlenmiş kullanıcı, yoksa localStorage snapshot'ı —
  // dönen ziyaretlerde avatar hidrasyonla birlikte anında görünür.
  const { displayUser, pendingAuth } = useCurrentUser()
  const isAssistantRoute = pathname?.startsWith("/asistan") ?? false
  const isHome = pathname === "/"
  // Mobilde belge mi kayıyor (bkz. DESKTOP_QUERY notu). Rota sunucuda da belli,
  // sınıflar hidrasyonda değişmez.
  const docScroll = !isAssistantRoute

  // Ana sayfada blog bölümünden itibaren sayfanın tamamı --home-base zemininde
  // (blog → fiyatlandırma → CTA → footer). Header ve altındaki fade ise
  // --background kullanıyor; gündüz bembeyaz, gece farklı bir koyu ton olduğu
  // için o bölgeye gelince keskin bir renk kırılması oluşuyordu. Blog bölümünün
  // üst kenarı header'ın altına girdiği anda ikisini de --home-base'e çeviriyoruz.
  // Geçiş zamana değil scroll'a bağlı: nişan (blog bölümünün üst kenarı)
  // header'ın altına HOME_DARK_RANGE px kala renk kademeli olarak akmaya başlar,
  // nişan header'ın dibine değdiğinde tamamlanır. Zamanlı bir transition + delay
  // denendi ama iyi çalışmadı: sınıf anahtarı anlık olduğu için metin paleti
  // sıçrarken zemin gecikiyordu (kopuk his) ve gecikme boyunca açık header koyu
  // içeriğin üstünde kalıyordu. Scroll'a bağlı sürümde header rengi her an
  // altındaki içerikle tutarlı; scroll durursa renk de durur.
  const scrollRef = React.useRef<HTMLElement>(null)
  const headerRef = React.useRef<HTMLDivElement>(null)
  // Değer MotionValue'da tutulur: her scroll karesinde React re-render'ı
  // tetiklemeden doğrudan style'a yazılır.
  const darkness = useMotionValue(0)
  // Header'ın kendi zemininin opaklığı. Ana sayfada 0'dan başlar (shader
  // header'ın arkasından kesintisiz akar), ilk kaydırmada 1'e çıkar. Diğer
  // rotalarda header zemini düz CSS sınıfı, bu değer hiç kullanılmaz.
  const headerSolid = useMotionValue(0)
  /* Ana sayfada mobil header'ın zemini: --background'tan --home-base'e
     (`darkness`), saydamdan opağa (`headerSolid`). Eskiden opaklığı oynayan iki
     iç katmandı (compositor'da kalsın diye). Artık header'ın KENDİ
     `background-color`ı, çünkü iOS Safari 26 sticky header'ın zeminini saat
     şeridinin rengi olarak kullanıyor ve yalnız elemanın kendi düz zeminini
     okuyor; `absolute` çocuklara bakmıyor. Renk değişimi yalnız ilk ~160px'lik
     rampada oluyor ve 64px'lik bir şeridi yeniden boyuyor, maliyeti yok. */
  const headerBg = useTransform<number, string>(
    [headerSolid, darkness],
    ([solid, dark]) =>
      `color-mix(in srgb, color-mix(in srgb, var(--home-base) ${dark * 100}%, var(--background)) ${solid * 100}%, transparent)`
  )
  // Hero zemini iki adımda kapanıyor. darkness 1'e vardığında blog bölümünün
  // üst kenarı header'a dayanmıştır: katman artık yalnız bölümün saydam üst
  // rampasından (`.home-dark-ground`) görünür ve shader orada donar (bkz.
  // HomeHeroBackdrop `covered`). Rampanın bittiği yer de header'ın üstüne
  // çıkınca katmanın görünen pikseli kalmaz; o noktada çizimden de çıkar
  // (`offscreen`).
  const [heroCovered, setHeroCovered] = React.useState(false)

  useMotionValueEvent(darkness, "change", (v) => {
    setHeroCovered(v >= 1)
  })

  // Bölümün tam opak başladığı çizginin header'ın altına uzaklığı (px).
  const heroOpaqueTop = useMotionValue(Number.POSITIVE_INFINITY)
  const [heroOffscreen, setHeroOffscreen] = React.useState(false)

  useMotionValueEvent(heroOpaqueTop, "change", (v) => {
    setHeroOffscreen(v < -HOME_HERO_OFFSCREEN_MARGIN)
  })

  /* HEADER PALETİ ARTIK SCROLL'A BAĞLI DEĞİL.

     Burada bir zamanlar `paletteDark` vardı: ana sayfanın alt bandı her iki
     temada da KOYU olduğu için, header o banda girerken metin/ikon paletini
     `dark`a çeviriyordu (yoksa koyu zeminin üstünde koyu yazı kalırdı).
     Aynı gerekçeyle `--logo-swap` da scroll rampasından besleniyordu.

     O bant gündüz temasında artık koyu değil (bkz. --home-base, globals.css):
     zemin sıcak kum, metin koyu kahve. Yani header aşağı indikçe palet
     DEĞİŞMEMELİ — değişseydi açık zeminin üstüne açık yazı gelirdi. Gecede de
     bir şey değişmiyor, sayfanın tamamı zaten koyu.

     Geriye kalan tek scroll etkisi zemin RENGİ: header --background'tan
     --home-base'e akıyor (`headerBg`). O bu haliyle doğru,
     çünkü iki renk de aynı temanın kendi tonları. */
  const { resolvedTheme } = useTheme()
  const themeDark = resolvedTheme === "dark"
  const logoSwap = useMotionValue(0)

  // Mount olana kadar (SSR + ilk istemci render'ı) inline değer YAZILMAZ;
  // CSS varsayılanı (:root 0 / .dark 1) devrededir. Rampanın başında iki kaynak
  // aynı değeri verdiği için JS devreye girdiğinde sıçrama olmaz.
  //
  // `resolvedTheme`den türetmek YETMEZ: next-themes state'ini localStorage'ı
  // okuyan bir lazy initializer ile kuruyor, yani değer daha ilk istemci
  // render'ında dolu geliyor. O render sunucununkiyle karşılaştırıldığı için
  // `style={{"--logo-swap":0}}` vs `style={}` hidrasyon uyuşmazlığı çıkıyordu.
  const mounted = useMounted()
  const themeReady = mounted && Boolean(resolvedTheme)

  // İlk çalıştırmada animasyon YOK: değer CSS varsayılanıyla zaten aynı, üstüne
  // bir geçiş oynatmak sayfa açılışında logoyu boş yere soldurup geri getirirdi.
  const logoSwapPrimed = React.useRef(false)

  React.useEffect(() => {
    // Yalnızca GERÇEK TEMA belirler; ana sayfada da scroll rampası yok (üstteki
    // "header paleti scroll'a bağlı değil" notu). Logo iki görselin çapraz
    // sönümü olduğu için interpole edilebiliyor: tema değişimi yumuşak akar.
    const target = themeDark ? 1 : 0
    if (!logoSwapPrimed.current) {
      logoSwapPrimed.current = true
      logoSwap.set(target)
      return
    }
    const controls = animate(logoSwap, target, {
      duration: 0.3,
      ease: EASE_OUT_SOFT,
    })
    return () => controls.stop()
  }, [themeDark, logoSwap])

  React.useEffect(() => {
    if (!isHome) {
      darkness.set(0)
      heroOpaqueTop.set(Number.POSITIVE_INFINITY)
      return
    }
    const root = scrollRef.current
    const header = headerRef.current
    if (!root || !header) return
    // Nişan yoksa (blog bölümü hiç render edilmediyse) karartı rampası düşer ama
    // header zemini yine de sürülmeli — yoksa sayfa kaydırılırken içerik saydam
    // bir şeridin altından geçer.
    const target = root.querySelector("[data-home-dark-start]")
    const opaque = root.querySelector("[data-home-opaque-start]")
    const desktop = window.matchMedia(DESKTOP_QUERY)
    const html = document.documentElement

    let frame = 0
    const measure = () => {
      frame = 0
      // Mobilde belge, masaüstünde <main> kayıyor; öbürü 0'da duruyor. iOS'un
      // tepedeki esnemesi negatif scrollY veriyor, o sayılmaz.
      const scrolled = Math.max(0, window.scrollY) + root.scrollTop
      headerSolid.set(Math.min(1, scrolled / HOME_HEADER_SOLID_RANGE))
      /* Kanvas (html zemini) mobilde iki yerde görünüyor: tepedeyken saat
         şeridinde (header o an saydam, Safari şeridi kanvasla doldurur) ve
         sayfanın sonunda alttaki araç çubuğunun arkasında. Tepede shader'ın
         baskın tonu --background, dipte footer bandının rengi. Tek renk ikisine
         birden uymadığı için kaydırınca dibinkine geçiyor; o arada saat
         şeridini zaten sticky header'ın kendi rengi dolduruyor. */
      // Yalnız değişince yazılır: aynı değeri her karede yazmak bile stili
      // geçersiz kılar.
      const end = !desktop.matches && scrolled > HOME_HEADER_SOLID_RANGE
      if (end !== (html.dataset.canvas === "home-end")) {
        if (end) html.dataset.canvas = "home-end"
        else delete html.dataset.canvas
      }
      if (!target) return
      // İçeriğin header'ın altına girdiği çizgi. Mobilde sticky header'ın alt
      // kenarı; masaüstünde header akıştan çıkmış ve saydam, yani <main>'in
      // üst kenarı. d, nişanın o çizgiye uzaklığı.
      const edge = desktop.matches
        ? root.getBoundingClientRect().top
        : header.getBoundingClientRect().bottom
      const d = target.getBoundingClientRect().top - edge
      const p = 1 - d / HOME_DARK_RANGE
      darkness.set(p < 0 ? 0 : p > 1 ? 1 : p)
      if (opaque) {
        heroOpaqueTop.set(opaque.getBoundingClientRect().top - edge)
      }
    }
    const schedule = () => {
      // Kare başına tek layout okuması: scroll olayları rAF ile birleştirilir.
      if (!frame) frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener("scroll", schedule, { passive: true })
    root.addEventListener("scroll", schedule, { passive: true })
    desktop.addEventListener("change", schedule)
    // Görsel yüklenmesi / viewport değişimi hero yüksekliğini oynatabilir.
    const resizeObserver = new ResizeObserver(schedule)
    resizeObserver.observe(root)
    if (target) resizeObserver.observe(target)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener("scroll", schedule)
      root.removeEventListener("scroll", schedule)
      desktop.removeEventListener("change", schedule)
      resizeObserver.disconnect()
      delete html.dataset.canvas
    }
  }, [isHome, darkness, headerSolid, heroOpaqueTop])

  return (
    <SidebarProvider
      // Mobilde sarmalayıcı ekran boyunda bir kutu değil, içerikle uzayan bir
      // sütun: belge kayıyor. Masaüstünde ve sohbette eskisi gibi `h-svh`.
      className={docScroll ? "h-auto min-h-svh md:h-svh" : undefined}
    >
      {/* Sayfanın ilk odaklanabilir elemanı: sidebar + header tekrarlı chrome,
          klavye kullanıcısı tek Tab ile <main>'e iner.

          Taban `sr-only`: özel bir CSS sınıfı DEĞİL, çünkü o sınıf üretilmezse
          bağlantı akışta kalıp bütün düzeni sağa itiyor (production'da tam
          olarak bu oldu). `sr-only` zaten `position:absolute` — odak stilleri
          hiç uygulanmasa bile düzene dokunamaz, en kötü ihtimalle görünmez bir
          ama çalışan bağlantı kalır. */}
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:z-[100] focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-3.5 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:start-3"
      >
        İçeriğe atla
      </a>
      <AppSidebar blogPosts={blogPosts} />
      <SidebarInset
        // `overflow-hidden` mobilde belgenin içeriğini keser ve sticky
        // header'ın kaydırma kabını değiştirirdi; yalnız iç kaydırmada.
        className={
          docScroll
            ? "md:min-h-0 md:overflow-hidden"
            : "min-h-0 overflow-hidden"
        }
      >
        {/* Ana sayfanın hero zemini. HEADER'IN DE ARKASINDA: `SidebarInset`in
            (relative) ilk katmanı, header ve <main> onun üstünde.

            Neden burada, hero'nun içinde değil: shader'ın `colorBack`i yok,
            tuvalin tamamı renkli. Header ayrı bir `bg-background` şeridi olduğu
            sürece hero'nun tepesinde sayfayı kesen bir renk basamağı kalıyor ve
            hangi maske denendiyse basamağı gizlemek yerine soluk bir bant
            bırakıyordu. Basamağı yok etmenin tek yolu tek bir zeminin ikisinin
            de altından geçmesi.

            Yükseklik `--hero-vh` (home-hero.tsx'te donduruluyor): mobilde
            header 4rem + hero calc(--hero-vh - 4rem), masaüstünde header
            akıştan çıktığı için hero tek başına --hero-vh. Katmanın dibi
            birebir çakışıyor. Masaüstünde katman <main>'in DIŞINDA olduğu için
            kaydırınca yerinde kalır; sayfanın geri kalanı (opak blog bölümü)
            üstüne akar. Mobilde belge kaydığı için hero'yla birlikte yukarı
            kayar: belgenin parçası olduğundan Safari onu alttaki araç
            çubuğunun arkasında da çiziyor (sabit bir katmanı çizmezdi). */}
        {isHome ? (
          <HomeHeroBackdrop covered={heroCovered} offscreen={heroOffscreen} />
        ) : null}
        {/* Zemin rengi DIŞ sarmalayıcıda: `dark` sınıfı --home-base'i de gece
            değerine kilitlerdi, oysa bu renk gerçek temaya bağlı olmalı. `dark`
            yalnızca header'da → koyu zemine gelince metin/ikon/logo paleti açık
            renge döner.

            Ana sayfada düz `bg-background` YOK: zemin scroll'a bağlı
            (`headerBg`), sayfa tepedeyken saydam.

            Mobilde `sticky`: belge kayarken üstte kalır. iOS Safari kenara
            yapışık bir sticky elemanın zeminiyle saat şeridini dolduruyor, yani
            şerit her sayfada header'la aynı renk. */}
        <motion.div
          ref={headerRef}
          style={
            isHome
              ? ({ "--header-bg": headerBg } as React.CSSProperties)
              : undefined
          }
          className={cn(
            "relative z-10 shrink-0",
            docScroll && "max-md:sticky max-md:top-0 max-md:z-20",
            !isHome && "bg-background",
            isHome && "max-md:bg-(--header-bg)",
            /* PC'DE ANA SAYFADA HEADER AKIŞTAN ÇIKIYOR: yer kaplamıyor, zemin
               katmanları kapalı (aşağıda `md:hidden`), yani tamamen saydam —
               arkasındaki shader kesintisiz akıyor ve içerik altından geçiyor.
               Masaüstünde bu şeritte zaten yalnız "Oturum Aç" var (logo, sidebar
               anahtarı ve avatar `md:hidden`), o da kendi zeminini taşıyor.
               z-20 <main>'in z-10'unun üstünde ama sheet/dialog katmanının
               altında. Mobilde akışta kalıyor: dokunma hedefleri ve logo orada. */
            isHome && "md:absolute md:inset-x-0 md:top-0 md:z-20"
          )}
        >
          <motion.header
            // --logo-swap tema geçişini logoya taşır. Tema çözülene kadar
            // yazılmaz; o ana dek CSS varsayılanı (:root / .dark) geçerlidir.
            style={
              themeReady
                ? ({ "--logo-swap": logoSwap } as React.CSSProperties)
                : undefined
            }
            // [&_*]:transition-colors → tema değişiminde yazı/ikon/kenarlık
            // renkleri de birlikte akar; yoksa palet sert keser.
            className="relative flex h-16 items-center gap-2 transition-colors duration-300 [&_*]:transition-colors [&_*]:duration-300"
          >
            <div className="flex shrink-0 items-center gap-2 px-4">
              <SidebarToggleButton />
              <Separator
                orientation="vertical"
                className="mr-2 bg-foreground/12 data-vertical:h-4 data-vertical:self-auto md:hidden"
              />
              {isAssistantRoute ? (
                <NewConversationButton />
              ) : (
                // Logolar `display` ile değil opacity ile takas ediliyor:
                // display anahtarı geçişin ortasında sert bir kesme bırakıyordu.
                // Opaklık `--logo-swap`tan gelir (bkz. globals.css): varsayılanı
                // tema belirler, ana sayfada scroll rampası sürer. Böylece logo
                // zeminle AYNI eğride akar, 0.5'te basamak yapmaz.
                //
                // CSS transition YOK: değer zaten her karede scroll'dan geliyor,
                // üstüne zaman tabanlı bir geçiş koymak logoyu zeminin gerisine
                // düşürürdü. Tema değişiminin yumuşaklığı `--logo-swap`ı yaya
                // bağlayan app-shell tarafında sağlanır.
                //
                // Ana sayfaya bağlı: mobilde kenar çubuğu kapalı bir `Sheet`,
                // yani ekrandaki tek logo — ve tek "başa dön" kısayolu — bu.
                <BrandContextMenu>
                  <Link
                    href="/"
                    aria-label="Sepet ana sayfası"
                    className="relative inline-flex h-5 shrink-0 rounded-sm md:hidden focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <Image
                      src="/brand/sepet-dark.svg"
                      alt="Sepet"
                      width={846}
                      height={178}
                      priority
                      className="logo-on-light h-5 w-auto"
                    />
                    <Image
                      src="/brand/sepet-light.svg"
                      alt=""
                      aria-hidden
                      width={846}
                      height={178}
                      className="logo-on-dark absolute inset-0 h-5 w-auto"
                    />
                  </Link>
                </BrandContextMenu>
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-center">
              {isAssistantRoute ? (
                loading && !title ? (
                  <Skeleton className="h-4 w-40 rounded-md" />
                ) : title ? (
                  <div className="flex min-w-0 items-center">
                    {conversationId ? (
                      <>
                        <ConversationTitleEditor
                          conversationId={conversationId}
                          title={title}
                          editing={editingTitle}
                          onEditingChange={setEditingTitle}
                        />
                        <AssistantHeaderActions
                          conversationId={conversationId}
                          title={title}
                          onRename={() => setEditingTitle(true)}
                        />
                      </>
                    ) : (
                      <span className="truncate text-sm font-medium text-foreground">
                        {title}
                      </span>
                    )}
                  </div>
                ) : null
              ) : null}
            </div>
            <div className="flex shrink-0 items-center justify-end gap-1 px-4">
              {/* İki varyant da her zaman render edilir; hangisinin görüneceğine
                ilk boyamada <html data-session> ipucu üzerinden CSS karar verir
                (globals.css), oturum çözümlenince ipucu gerçekle senkronlanır.
                Böylece "skeleton → giriş butonu / avatar" çakması yaşanmaz:
                misafir statik HTML'de doğrudan "Hemen Başla" görür, dönen
                kullanıcı avatarını görür. */}
              <span data-session-guest>
                <Button variant="default" size="sm" onClick={() => loginDialog.open()}>
                  Oturum Aç
                </Button>
              </span>
              <span data-session-authed>
                {isAssistantRoute ? (
                  /* Sohbette sağ üst köşe Paylaş'ın (Claude'daki gibi).
                     Mobilde avatarın yerini alır: hesap menüsü kenar
                     çubuğunun altında da duruyor, iki dokunuş uzakta.
                     Yeni sohbette (henüz kayıt yok) paylaşılacak bir şey
                     olmadığı için boş kalır. */
                  conversationId && title ? (
                    <ShareConversationButton
                      conversationId={conversationId}
                      title={title}
                    />
                  ) : null
                ) : displayUser ? (
                  <HeaderUserMenu user={displayUser} className="md:hidden" />
                ) : pendingAuth ? (
                  // Yalnızca yeni giriş / OAuth dönüşünde (pending ipucu): /api/me
                  // gelene kadar avatarla aynı boyutta nötr yer tutucu. Misafirde
                  // ya da bayat ipucunda gösterilmez. Masaüstünde avatar sidebar'da
                  // olduğundan menü gibi bu da md:hidden.
                  <Skeleton className="size-7 rounded-full md:hidden" />
                ) : null}
              </span>
            </div>
          </motion.header>
        </motion.div>
        {/* Sayfanın tek <main> landmark'ı ve aynı zamanda kaydırma kabı.
            Header'ın DIŞINDA: <main> içindeki bir <header> banner landmark'ı
            sayılmaz, ayrıca "içeriğe atla" bağlantısının atlayacağı bir şey
            kalmazdı. */}
        <main
          id="main"
          ref={scrollRef}
          // Tüm rotalarda tek çubuk. Ana sayfa eskiden `no-scrollbar` ile çubuğu
          // tamamen gizliyordu: sayfayı yalnız tekerlek ya da klavyeyle
          // gezebiliyordun, aşağıdaki bölümlere (fiyatlandırma) sürükleyerek
          // inmenin yolu yoktu.
          // `relative z-10`: hero zemini SidebarInset'in ilk katmanı (yukarıda);
          // konumlandırılmış olduğu için normal akıştaki <main>'in üstüne
          // boyanırdı. İkisini de aynı yığın seviyesine çıkarınca sıra DOM'a
          // dönüyor: zemin altta, içerik üstünde.
          // Mobilde içerik sayfalarında kaydırma kabı değil, akıştaki bir sütun
          // (bkz. DESKTOP_QUERY notu).
          className={cn(
            "cn-scrollbar-thin relative z-10 flex flex-1 flex-col",
            docScroll
              ? "md:min-h-0 md:overflow-y-auto"
              : "min-h-0 overflow-y-auto"
          )}
        >
          {/* Ana sayfada hero görseli, scroll edilince header'ın hemen altında
              tam opaklıkta görünüp keskin yatay bir çizgi oluşturuyordu. Bu
              sticky fade header'ın zemin rengini içeriğe yumuşatarak o kesik
              geçişi kaldırır; -mb ile yer kaplamaz, scroll'da üstte sabit kalır.
              z-30: blog bölümü hero'nun üstünde kalmak için z-20 taşıyor; aynı
              seviyede olsaydı DOM'da sonra geldiği için fade'in üstüne binerdi. */}
          {isHome ? (
            // Rampa artık gradient'in RENK DURAKLARINDA değil, kabın
            // maskesinde. Eskiden iki yarı saydam gradient çapraz sönümleniyordu
            // ve rampanın ortasında bileşik alfa `d + (1-d)²` oluyordu: iki uçta
            // 1, ama d=0.5'te 0.75. Yani blog bölümüne girerken fade'in tepesi
            // delinip header'ın sert alt kenarı görünüyordu — sonra tekrar
            // kapanıyordu. Şimdi iki katman da DÜZ RENK: alttaki her zaman tam
            // opak, üstteki opacity ile geliyor, bileşim her karede tam opak
            // kalıyor. Alfa rampasını maske veriyor; maske sabit olduğu için
            // hangi ara değerde olursak olalım profil aynı.
            //
            // Renk yerine opacity animasyonu bilinçli: compositor'da kalıyor,
            // her scroll karesinde gradient yeniden boyanmıyor.
            <div
              aria-hidden
              // MASAÜSTÜNDE YOK. Header'la birleşince tepede kalın, yıkanmış
              // bir geçiş bandı gibi okunuyordu; geniş ekranda o mesafe
              // fade'in çözdüğü sert kenardan daha rahatsız edici. Mobilde
              // duruyor: orada bant oransal olarak rahatsız etmiyor ve
              // içeriğin header'ın altından keskin geçmesi daha çok belli
              // oluyor. `md:hidden` yüksekliği de -mb'yi de birlikte
              // düşürüyor, düzen kaymıyor.
              // `top-16`: mobilde belge kayıyor ve header da sticky; fade onun
              // hemen altına yapışır (eskiden <main>'in tepesi zaten oradaydı).
              className="home-header-fade pointer-events-none sticky top-16 z-30 -mb-12 h-12 shrink-0 md:hidden"
            >
              {/* Açık katman da artık `headerSolid`e bağlı. Eskiden düz
                  `bg-background`di ve sayfa tepedeyken hero'nun ilk 48px'ini
                  yıkayıp shader'ın üstünde soluk bir bant bırakıyordu — resimde
                  "üstteki fade" diye işaretlenen şey buydu. Header'ın kendi
                  zemini gibi, bu da ancak kaydırınca geliyor. */}
              <motion.div
                style={{ opacity: headerSolid }}
                className="absolute inset-0 bg-background"
              />
              <motion.div
                style={{ opacity: darkness }}
                className="absolute inset-0 bg-[var(--home-base)]"
              />
            </div>
          ) : null}
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
