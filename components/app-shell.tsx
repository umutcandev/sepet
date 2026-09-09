"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PanelLeftIcon, PlusIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { animate, motion, useMotionValue, useMotionValueEvent } from "motion/react"

import { EASE_OUT_SOFT } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { useMounted } from "@/hooks/use-mounted"
import { AppSidebar } from "@/components/app-sidebar"
import { AssistantHeaderActions } from "@/components/assistant/assistant-header-actions"
import { HomeHeroBackdrop } from "@/components/home/hero-shader"
import type { BlogNavItem } from "@/components/blog/blog-posts-group"
import { Button } from "@/components/ui/button"
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
   zemin oturuyor ama sayfa tepedeyken hiçbir iz bırakmıyor. */
const HOME_HEADER_SOLID_RANGE = 56

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
      <PanelLeftIcon className="cn-rtl-flip size-4" />
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
      <Button asChild size="sm" className="hidden h-7 gap-1.5 md:inline-flex">
        <Link href="/asistan" onClick={handleClick}>
          <PlusIcon className="size-3.5" />
          Yeni Sohbet
        </Link>
      </Button>
      <Button
        asChild
        size="icon-sm"
        className="md:hidden"
        aria-label="Yeni Sohbet"
      >
        <Link href="/asistan" onClick={handleClick}>
          <PlusIcon className="size-4" />
        </Link>
      </Button>
    </>
  )
}

export function AppShell({ blogPosts, children }: Props) {
  const pathname = usePathname()
  const { title, loading, conversationId } = useAssistantTitle()
  // Kullanıcı/sohbet listesi artık kök layout prop'undan değil, istemci
  // tarafı SessionProvider'dan gelir (paylaşımlı rotalar statik cache'lenebilsin
  // diye). Sidebar sohbet listesi assistantConversations store'undan okunur ve
  // hidrasyonu SessionProvider `/api/me` sonrası bir kez yapar.
  // displayUser: çözümlenmiş kullanıcı, yoksa localStorage snapshot'ı —
  // dönen ziyaretlerde avatar hidrasyonla birlikte anında görünür.
  const { displayUser, pendingAuth } = useCurrentUser()
  const isAssistantRoute = pathname?.startsWith("/asistan") ?? false
  const isHome = pathname === "/"

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
  // Değer MotionValue'da tutulur: her scroll karesinde React re-render'ı
  // tetiklemeden doğrudan style'a yazılır.
  const darkness = useMotionValue(0)
  // Header'ın kendi zemininin opaklığı. Ana sayfada 0'dan başlar (shader
  // header'ın arkasından kesintisiz akar), ilk kaydırmada 1'e çıkar. Diğer
  // rotalarda header zemini düz CSS sınıfı, bu değer hiç kullanılmaz.
  const headerSolid = useMotionValue(0)
  // Hero zemini tamamen kapandı mı? darkness 1'e vardığında blog bölümünün üst
  // kenarı header'a dayanmış demektir, yani katmanın görünen tek pikseli
  // kalmaz. Shader o noktada donar (bkz. HomeHeroBackdrop `covered`).
  const [heroCovered, setHeroCovered] = React.useState(false)

  useMotionValueEvent(darkness, "change", (v) => {
    setHeroCovered(v >= 1)
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
     --home-base'e akıyor (aşağıdaki `darkness` katmanı). O bu haliyle doğru,
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
      return
    }
    const root = scrollRef.current
    if (!root) return
    // Nişan yoksa (blog bölümü hiç render edilmediyse) karartı rampası düşer ama
    // header zemini yine de sürülmeli — yoksa sayfa kaydırılırken içerik saydam
    // bir şeridin altından geçer.
    const target = root.querySelector("[data-home-dark-start]")

    let frame = 0
    const measure = () => {
      frame = 0
      headerSolid.set(Math.min(1, root.scrollTop / HOME_HEADER_SOLID_RANGE))
      if (!target) return
      // Scroll container header'ın hemen altında başlıyor → root'un üst kenarı
      // = header'ın alt kenarı. d, nişanın oraya olan uzaklığı.
      const d =
        target.getBoundingClientRect().top - root.getBoundingClientRect().top
      const p = 1 - d / HOME_DARK_RANGE
      darkness.set(p < 0 ? 0 : p > 1 ? 1 : p)
    }
    const schedule = () => {
      // Kare başına tek layout okuması: scroll olayları rAF ile birleştirilir.
      if (!frame) frame = requestAnimationFrame(measure)
    }

    measure()
    root.addEventListener("scroll", schedule, { passive: true })
    // Görsel yüklenmesi / viewport değişimi hero yüksekliğini oynatabilir.
    const resizeObserver = new ResizeObserver(schedule)
    resizeObserver.observe(root)
    if (target) resizeObserver.observe(target)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      root.removeEventListener("scroll", schedule)
      resizeObserver.disconnect()
    }
  }, [isHome, darkness, headerSolid])

  return (
    <SidebarProvider>
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
      <SidebarInset className="min-h-0 overflow-hidden">
        {/* Ana sayfanın hero zemini. HEADER'IN DE ARKASINDA: `SidebarInset`in
            (relative) ilk katmanı, header ve <main> onun üstünde.

            Neden burada, hero'nun içinde değil: shader'ın `colorBack`i yok,
            tuvalin tamamı renkli. Header ayrı bir `bg-background` şeridi olduğu
            sürece hero'nun tepesinde sayfayı kesen bir renk basamağı kalıyor ve
            hangi maske denendiyse basamağı gizlemek yerine soluk bir bant
            bırakıyordu. Basamağı yok etmenin tek yolu tek bir zeminin ikisinin
            de altından geçmesi.

            Yükseklik `--hero-vh` (home-hero.tsx'te donduruluyor): header 4rem +
            hero calc(--hero-vh - 4rem), yani katmanın dibi hero'nun dibiyle
            birebir çakışıyor. Katman <main>'in DIŞINDA olduğu için kaydırınca
            yerinde kalır; sayfanın geri kalanı (opak blog bölümü) üstüne akar. */}
        {isHome ? <HomeHeroBackdrop covered={heroCovered} /> : null}
        {/* Zemin rengi DIŞ sarmalayıcıda: `dark` sınıfı --home-base'i de gece
            değerine kilitlerdi, oysa bu renk gerçek temaya bağlı olmalı. `dark`
            yalnızca header'da → koyu zemine gelince metin/ikon/logo paleti açık
            renge döner.

            Ana sayfada düz `bg-background` YOK: zemin scroll'a bağlı bir katman
            (aşağıda), sayfa tepedeyken saydam. */}
        <div
          className={cn(
            "relative z-10 shrink-0",
            !isHome && "bg-background"
          )}
        >
          {isHome ? (
            <motion.div
              aria-hidden
              style={{ opacity: headerSolid }}
              className="pointer-events-none absolute inset-0 bg-background"
            />
          ) : null}
          {/* Koyu zemin ayrı katman ve sadece opacity ile sürülüyor: her scroll
              karesinde background-color yeniden hesaplanmaz, opacity
              compositor'da kalır. */}
          <motion.div
            aria-hidden
            style={{ opacity: darkness }}
            className="pointer-events-none absolute inset-0 bg-[var(--home-base)]"
          />
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
              {/* Anahtarla ondan sonra geleni ayırır; anahtar mobile özel
                  olduğu için ayraç da öyle. */}
              <Separator
                orientation="vertical"
                className="mr-2 data-vertical:h-4 data-vertical:self-auto md:hidden"
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
                <span className="relative inline-flex h-5 shrink-0 md:hidden">
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
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-center">
              {isAssistantRoute ? (
                loading && !title ? (
                  <Skeleton className="h-4 w-40 rounded-md" />
                ) : title ? (
                  <div className="flex min-w-0 items-center">
                    <span className="truncate text-sm font-medium text-foreground">
                      {title}
                    </span>
                    {conversationId ? (
                      <AssistantHeaderActions
                        conversationId={conversationId}
                        title={title}
                      />
                    ) : null}
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
                <Button size="sm" onClick={() => loginDialog.open()}>
                  Oturum Aç
                </Button>
              </span>
              <span data-session-authed>
                {displayUser ? (
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
        </div>
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
          className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto cn-scrollbar-thin"
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
              className="home-header-fade pointer-events-none sticky top-0 z-30 -mb-12 h-12 shrink-0"
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
