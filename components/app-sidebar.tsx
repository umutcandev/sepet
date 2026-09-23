"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  RiAddLine,
  RiHomeLine,
  RiLayoutLeftLine,
  RiQuestionAnswerLine,
  RiReceiptLine,
  RiSearchLine,
  RiShoppingBasketLine,
  RiSparklingLine,
} from "@remixicon/react"

import { NavGuest } from "@/components/nav-guest"
import { NavGuestInfo } from "@/components/nav-guest-info"
import { NavUser } from "@/components/nav-user"
import { BrandContextMenu } from "@/components/brand/brand-context-menu"
import { SepetWordmark } from "@/components/brand/sepet-wordmark"
import { Button } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { AssistantConversationsGroup } from "@/components/assistant/assistant-conversations-group"
import {
  BlogPostsGroup,
  type BlogNavItem,
} from "@/components/blog/blog-posts-group"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentUser } from "@/components/providers/session-provider"
import { useShortcutModifier } from "@/hooks/use-shortcut-modifier"
import {
  WORDMARK_HEIGHT,
  WORDMARK_MARK_WIDTH,
  WORDMARK_WIDTH,
} from "@/lib/brand/wordmark"

type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  soon?: boolean
}

const nav: NavItem[] = [
  { title: "Ana Sayfa", url: "/", icon: RiHomeLine },
  { title: "Sohbetler", url: "/sohbetler", icon: RiQuestionAnswerLine },
  { title: "Ürün Ara", url: "/urun-ara", icon: RiSearchLine },
  {
    title: "Sepetlerim",
    url: "/sepetlerim",
    icon: RiShoppingBasketLine,
  },
  {
    title: "Fişlerim",
    url: "/fis-gecmisi",
    icon: RiReceiptLine,
  },
  {
    title: "Asistan",
    url: "/asistan",
    icon: RiSparklingLine,
  },
]

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  blogPosts?: BlogNavItem[]
}

/**
 * Başlıktaki marka yuvası: GÖRSEL katman sabit, ETKİLEŞİM katmanı duruma göre
 * değişir (genişken ana sayfa bağlantısı, rayda kenar çubuğu anahtarı).
 *
 * Wordmark tek bir düğüm olarak hep DOM'da kalır ve yalnız "sepet" yazısı
 * soluyor (bkz. SepetWordmark) — kapanışla açılış simetrik. Eskiden genişken
 * <Image>, rayda <SepetMark> vardı ve takas anlıktı: açılış anında rayda
 * anahtar ikonu durduğu için logo sıfırdan beliriyordu.
 *
 * Kutunun genişliği CSS ile daralıyor: hem yazının gittiği yer kapansın hem de
 * ilk boyamada (hidrasyondan önce) durum doğru olsun.
 *
 * Anahtar düğmesi `peer/rail`: üzerine gelince wordmark'ı ikonla çaprazlar.
 * `h-12` iki durumda da korunur, böylece başlığın — ve altındaki her satırın —
 * y konumu açılıp kapanırken oynamaz.
 */
function SidebarBrand() {
  const { toggleSidebar, state, isMobile } = useSidebar()
  const modifier = useShortcutModifier()
  // Mobilde kenar çubuğu bir `Sheet`; masaüstü durumu oraya taşınmamalı.
  const collapsed = !isMobile && state === "collapsed"

  return (
    <div
      className="relative flex h-12 min-w-0 flex-1 items-center"
      style={
        {
          // h-6 wordmark'ın genişliği ve içindeki işaretin bittiği yer.
          "--wordmark-w": `calc(1.5rem * ${WORDMARK_WIDTH} / ${WORDMARK_HEIGHT})`,
          "--wordmark-mark-w": `calc(1.5rem * ${WORDMARK_MARK_WIDTH} / ${WORDMARK_HEIGHT})`,
        } as React.CSSProperties
      }
    >
      {/* Rayda logonun YERİNE anahtar: 32 pikselden başka yer yok ve ikisi de
          aynı şeye bakıyor — "burası kenar çubuğu". */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Kenar çubuğunu aç"
            className="peer/rail absolute inset-y-0 left-0 my-auto hidden size-8 rounded-md ring-sidebar-ring outline-hidden transition-colors group-data-[collapsible=icon]:block hover:bg-sidebar-accent focus-visible:ring-2"
          />
        </TooltipTrigger>
        <TooltipContent side="right">
          Kenar çubuğunu aç
          <KbdGroup>
            <Kbd>{modifier}</Kbd>
            <Kbd>B</Kbd>
          </KbdGroup>
        </TooltipContent>
      </Tooltip>

      {/* Sağ tık / basılı tutma → marka menüsü; tetikleyici `asChild` ile tek
          bir eleman çocuk bekliyor. */}
      <BrandContextMenu>
        <Link
          href="/"
          aria-label="Sepet ana sayfası"
          className="absolute inset-y-0 left-0 w-[calc(var(--wordmark-w)+1rem)] rounded-md ring-sidebar-ring outline-hidden group-data-[collapsible=icon]:hidden focus-visible:ring-2"
        />
      </BrandContextMenu>

      {/* `left-2`: sol kenar wordmark'ın ve altındaki bütün gezinme ikonlarının
          hizasına (24 piksel) oturur. Genişlik geçişi kenar çubuğununkiyle aynı
          süre ve eğri. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-2 my-auto flex h-6 w-(--wordmark-w) items-center overflow-hidden transition-[width,opacity] duration-200 ease-linear group-data-[collapsible=icon]:w-(--wordmark-mark-w) peer-hover/rail:opacity-0 peer-focus-visible/rail:opacity-0"
      >
        <SepetWordmark collapsed={collapsed} className="h-6 w-(--wordmark-w)" />
      </span>

      {/* Anahtar ikonu yalnız rayda görünür: düğme genişken `hidden`, yani
          hover varyantı hiç eşleşmez. Fizik IconSwap'ın aynısı. */}
      <RiLayoutLeftLine
        aria-hidden
        className="cn-rtl-flip pointer-events-none absolute inset-y-0 left-2 my-auto size-4 text-sidebar-accent-foreground opacity-0 transition-[opacity,transform,filter] duration-200 ease-linear motion-safe:scale-50 motion-safe:blur-[2px] peer-hover/rail:opacity-100 motion-safe:peer-hover/rail:scale-100 motion-safe:peer-hover/rail:blur-[0px] peer-focus-visible/rail:opacity-100 motion-safe:peer-focus-visible/rail:scale-100 motion-safe:peer-focus-visible/rail:blur-[0px]"
      />
    </div>
  )
}

/**
 * Genişletilmiş başlığın sağındaki kapatma anahtarı. Eskiden üst bardaydı;
 * kenar çubuğunu açıp kapatan düğmenin kenar çubuğunun DIŞINDA durması,
 * üstelik yanında kalıcı bir "⌘B" etiketiyle, sayfanın en solunu gereksiz
 * meşgul ediyordu. Üst bardaki eş şimdi yalnız mobilde (orada kenar çubuğu
 * tümüyle kapanıyor, açacak başka bir tutamak kalmıyor).
 *
 * Daraltılmış rayda gizli: oradaki karşılığı SidebarBrandToggle.
 */
function SidebarPanelToggle() {
  const { toggleSidebar, isMobile } = useSidebar()
  const modifier = useShortcutModifier()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          aria-label="Kenar çubuğunu kapat"
          className="shrink-0 text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <RiLayoutLeftLine className="cn-rtl-flip size-4" />
        </Button>
      </TooltipTrigger>
      {/* Mobilde tooltip YOK. Bu düğme daraltılmış rayda gizlenir
          (`group-data-[collapsible=icon]:hidden`) ama mobilde kenar çubuğu bir
          `Sheet` ve o dalda ne `group` sınıfı ne `data-collapsible` var — yani
          varyant hiç eşleşmiyor, düğme görünür kalıyor ve dokununca tooltip
          açılıyordu. Üstelik içeriği telefonda anlamsız bir kısayol.
          `hidden` koşulu SidebarMenuButton'ınkiyle aynı kalıp (ui/sidebar.tsx). */}
      <TooltipContent side="bottom" hidden={isMobile}>
        Kenar çubuğunu kapat
        <KbdGroup>
          <Kbd>{modifier}</Kbd>
          <Kbd>B</Kbd>
        </KbdGroup>
      </TooltipContent>
    </Tooltip>
  )
}

export function AppSidebar({ blogPosts, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  // Görüntü için displayUser (çözümlenmiş kullanıcı ya da localStorage
  // snapshot'ı): dönen ziyaretlerde ad/avatar hidrasyonla birlikte anında
  // görünür, /api/me beklenmez. İlk boyamada (hidrasyondan önce) hangi
  // varyantın görüneceğine <html data-session> ipucu üzerinden CSS karar
  // verir — aşağıdaki [data-session-*] sarmalayıcıları.
  const { displayUser, pendingAuth } = useCurrentUser()

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  // Yeni sohbet başlatıldığında assistant-chat URL'yi history.replaceState ile
  // /asistan/[id]'ye günceller (SSE stream'i koparmamak için). URL bar
  // /asistan/[id] gösterse de Next bunu hâlâ /asistan segment'i olarak işler →
  // Link href="/asistan" tıklaması aynı segment'e gider, AssistantChat remount
  // olmaz ve useChat client state'i (mesajlar, conversationId) korunur.
  // Gerçek /asistan/[id] sayfasında da aynı segment durumu olmadığı için
  // SPA çalışıyor; ama drift case'i SPA ile çözmek mümkün değil. Bu yüzden
  // /asistan/* altındaki her durumda tam reload ile fresh mount sağlıyoruz.
  const handleNewChatClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    handleNavClick()
    if (
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/asistan/")
    ) {
      e.preventDefault()
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- fresh mount kasıtlı; router.push aynı segment'e düşüp remount etmez (yukarıdaki drift notu).
      window.location.assign("/asistan")
    }
  }

  const showAssistantConversations = !!displayUser

  return (
    // collapsible="icon": kapanınca kenar çubuğu tamamen kaybolmaz, ikon
    // genişliğinde bir ray kalır. Gezinme tek tıkla erişilebilir olmaya devam
    // eder; etiketleri tooltip taşır (bkz. SidebarMenuButton `tooltip`).
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <SidebarBrand />
          <SidebarPanelToggle />
        </div>
      </SidebarHeader>

      <SidebarContent aria-label="Ana gezinme" className="overflow-hidden">
        {/* Yeni Sohbet gezinme listesinin İÇİNDE değil, kendi grubunda: bir
            gezinme hedefi değil bir eylem, ve tek primary yüzey olarak listenin
            tarama ritmine karışmamalı. Ayrı grup olması ayrıca misafirde temiz
            düşmesini sağlıyor — `display:contents` taşıyan sarmalayıcı gizlenince
            grup da, çevresindeki boşluk da gider. */}
        <div data-session-authed>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    variant="primary"
                    tooltip="Yeni Sohbet"
                    // Genişken ikon+metin birlikte ortalanır; rayda etiketi
                    // varyantın kendisi gizliyor, ikon 32'lik kutuda ortalanır.
                    className="justify-center"
                  >
                    <Link href="/asistan" onClick={handleNewChatClick}>
                      <RiAddLine />
                      <span>Yeni Sohbet</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const Icon = item.icon
                const isAssistant = item.url === "/asistan"
                const isActive = isAssistant
                  ? pathname === "/asistan"
                  : pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={!item.soon}
                      disabled={item.soon}
                      isActive={isActive}
                      aria-disabled={item.soon || undefined}
                      tooltip={item.title}
                      className={item.soon ? "cursor-not-allowed opacity-40" : undefined}
                    >
                      {item.soon ? (
                        <span className="flex items-center gap-2">
                          <Icon />
                          <span>{item.title}</span>
                        </span>
                      ) : (
                        <Link href={item.url} onClick={handleNavClick}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showAssistantConversations ? (
          // Liste assistantConversations store'undan okunur; store hidrasyonunu
          // SessionProvider `/api/me` sonrası yapar. Buradaki fallback yalnızca
          // hidrasyondan önceki ilk render için (boş).
          <AssistantConversationsGroup conversations={[]} />
        ) : null}

        <BlogPostsGroup posts={blogPosts ?? []} />
      </SidebarContent>

      <SidebarFooter>
        {/* Footer kimlik alanı: iki varyant da render edilir, ilk boyamada
            data-session ipucu üzerinden CSS doğru olanı gösterir. Oturumlu
            kullanıcı "Giriş Yap" flash'ı görmez; snapshot varsa ad/avatar
            hidrasyonla birlikte gelir, yoksa /api/me'ye kadar iskelet. */}
        <div data-session-guest>
          <NavGuestInfo />
          <NavGuest />
        </div>
        <div data-session-authed>
          {displayUser ? (
            <NavUser user={displayUser} />
          ) : pendingAuth ? (
            <NavUserSkeleton />
          ) : null}
        </div>
        {/* Rayda `hidden` DEĞİL `invisible`: gizlemek bu satırın yüksekliğini
            de alıp götürüyordu ve footer alttan hizalı olduğu için üstündeki
            avatar aşağı kayıyordu. Görünmez hâlde kutu duruyor, bağlantılar
            ne çiziliyor ne de odaklanılabiliyor (visibility:hidden sekme
            sırasından da düşer).
            `h-4 leading-4`: yükseklik satır yüksekliğinden TÜRETİLMESİN diye
            sabitlendi. Miras alınan line-height'e bırakıldığında bu kutu
            footer'ın tek değişken parçası oluyordu ve altına demirlenmiş
            avatarın y konumu ona bağlı kalıyordu. */}
        <div className="flex h-4 items-center justify-center gap-1.5 overflow-hidden px-2 text-[0.6875rem] leading-4 whitespace-nowrap text-muted-foreground/60 group-data-[collapsible=icon]:invisible">
          <Link
            href="/gizlilik"
            onClick={handleNavClick}
            className="transition-colors hover:text-foreground"
          >
            Gizlilik Politikası
          </Link>
          <span aria-hidden>·</span>
          <Link
            href="/kullanim-sartlari"
            onClick={handleNavClick}
            className="transition-colors hover:text-foreground"
          >
            Kullanım Şartları
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

// NavUser'ın SidebarMenuButton size="lg" düzeniyle birebir aynı boyutlarda
// yer tutucu: snapshot henüz yokken (ör. OAuth dönüşündeki ilk yükleniş)
// /api/me çözülene kadar footer zıplamadan bekler.
function NavUserSkeleton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex h-12 items-center gap-2 rounded-md p-2">
          <Skeleton className="size-6 rounded-lg" />
          <div className="grid flex-1 gap-1">
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
