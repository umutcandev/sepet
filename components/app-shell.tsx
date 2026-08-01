"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CommandIcon, PanelLeftIcon, PlusIcon } from "lucide-react"
import { motion, useMotionValue, useMotionValueEvent } from "motion/react"

import { cn } from "@/lib/utils"
import { AppSidebar } from "@/components/app-sidebar"
import { AssistantHeaderActions } from "@/components/assistant/assistant-header-actions"
import type { BlogNavItem } from "@/components/blog/blog-posts-group"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { HeaderUserMenu } from "@/components/header-user-menu"
import { ThemeToggleButton } from "@/components/theme-toggle"
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

function SidebarToggleButton() {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={toggleSidebar}
      aria-label="Kenar çubuğunu aç/kapat"
      className="-ml-1 h-8 gap-2 px-2 md:pr-2.5"
    >
      <PanelLeftIcon className="cn-rtl-flip size-4" />
      <span className="hidden items-center gap-0.5 font-mono text-[11px] leading-none font-medium text-muted-foreground/60 md:inline-flex">
        <CommandIcon className="size-3 shrink-0" />
        {/* Büyük "B"nin optik merkezi font metrikleri yüzünden ikon merkezinin
            ~0.5px üstünde kalıyor → ⌘ ile yatay hizada görünmesi için hafif
            aşağı nudge. */}
        <span className="inline-flex h-3 translate-y-[0.5px] items-center justify-center leading-none">
          B
        </span>
      </span>
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
  const scrollRef = React.useRef<HTMLDivElement>(null)
  // Değer MotionValue'da tutulur: her scroll karesinde React re-render'ı
  // tetiklemeden doğrudan style'a yazılır.
  const darkness = useMotionValue(0)
  // Metin/ikon paleti interpolate edilemez (token'lar `dark` sınıfıyla topluca
  // değişir); rampanın ortasında yumuşak bir transition ile flip eder.
  const [paletteDark, setPaletteDark] = React.useState(false)

  useMotionValueEvent(darkness, "change", (v) => {
    setPaletteDark(v >= 0.5)
  })

  React.useEffect(() => {
    if (!isHome) {
      darkness.set(0)
      return
    }
    const root = scrollRef.current
    const target = root?.querySelector("[data-home-dark-start]")
    if (!root || !target) return

    let frame = 0
    const measure = () => {
      frame = 0
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
    resizeObserver.observe(target)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      root.removeEventListener("scroll", schedule)
      resizeObserver.disconnect()
    }
  }, [isHome, darkness])

  return (
    <SidebarProvider>
      <AppSidebar blogPosts={blogPosts} />
      <SidebarInset className="min-h-0 overflow-hidden">
        {/* Zemin rengi DIŞ sarmalayıcıda: `dark` sınıfı --home-base'i de gece
            değerine kilitlerdi, oysa bu renk gerçek temaya bağlı olmalı. `dark`
            yalnızca header'da → koyu zemine gelince metin/ikon/logo paleti açık
            renge döner. */}
        <div className="relative shrink-0 bg-background">
          {/* Koyu zemin ayrı katman ve sadece opacity ile sürülüyor: her scroll
              karesinde background-color yeniden hesaplanmaz, opacity
              compositor'da kalır. */}
          <motion.div
            aria-hidden
            style={{ opacity: darkness }}
            className="pointer-events-none absolute inset-0 bg-[var(--home-base)]"
          />
          <header
            className={cn(
              // [&_*]:transition-colors → `dark` düştüğünde yazı/ikon/kenarlık
              // renkleri de birlikte akar; yoksa palet sert keser.
              "relative flex h-16 items-center gap-2 transition-colors duration-300 [&_*]:transition-colors [&_*]:duration-300",
              paletteDark && "dark text-foreground"
            )}
          >
            <div className="flex shrink-0 items-center gap-2 px-4">
              <SidebarToggleButton />
              <Separator
                orientation="vertical"
                className={cn(
                  "mr-2 data-vertical:h-4 data-vertical:self-auto",
                  !isAssistantRoute && "md:hidden"
                )}
              />
              {isAssistantRoute ? (
                <NewConversationButton />
              ) : (
                // Logolar `display` ile değil opacity ile takas ediliyor:
                // display anahtarı geçişin ortasında sert bir kesme bırakıyordu.
                // `dark:` varyantı hem gerçek temayı hem header'ın koyu bölge
                // sınıfını yakalar.
                <span className="relative inline-flex h-5 shrink-0 md:hidden">
                  <Image
                    src="/brand/sepet-dark.svg"
                    alt="Sepet"
                    width={846}
                    height={178}
                    priority
                    className="h-5 w-auto transition-opacity duration-300 dark:opacity-0"
                  />
                  <Image
                    src="/brand/sepet-light.svg"
                    alt=""
                    aria-hidden
                    width={846}
                    height={178}
                    className="absolute inset-0 h-5 w-auto opacity-0 transition-opacity duration-300 dark:opacity-100"
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
              <ThemeToggleButton />
              {/* İki varyant da her zaman render edilir; hangisinin görüneceğine
                ilk boyamada <html data-session> ipucu üzerinden CSS karar verir
                (globals.css), oturum çözümlenince ipucu gerçekle senkronlanır.
                Böylece "skeleton → giriş butonu / avatar" çakması yaşanmaz:
                misafir statik HTML'de doğrudan "Hemen Başla" görür, dönen
                kullanıcı avatarını görür. */}
              <span data-session-guest>
                <Button size="sm" onClick={() => loginDialog.open()}>
                  Hemen Başla
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
          </header>
        </div>
        <div
          ref={scrollRef}
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-y-auto",
            isHome ? "no-scrollbar" : "cn-scrollbar-thin"
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
              className="home-header-fade pointer-events-none sticky top-0 z-30 -mb-12 h-12 shrink-0"
            >
              <div className="absolute inset-0 bg-background" />
              <motion.div
                style={{ opacity: darkness }}
                className="absolute inset-0 bg-[var(--home-base)]"
              />
            </div>
          ) : null}
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
