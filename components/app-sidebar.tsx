"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  HomeIcon,
  MessagesSquareIcon,
  PanelLeftIcon,
  PlusIcon,
  ReceiptIcon,
  ShoppingBasketIcon,
  SparklesIcon,
  SearchIcon,
} from "lucide-react"

import { NavGuest } from "@/components/nav-guest"
import { NavGuestInfo } from "@/components/nav-guest-info"
import { NavUser } from "@/components/nav-user"
import { BrandContextMenu } from "@/components/brand/brand-context-menu"
import { SepetMark } from "@/components/brand/sepet-mark"
import { IconSwap } from "@/components/motion/icon-swap"
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

type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  soon?: boolean
}

const nav: NavItem[] = [
  { title: "Ana Sayfa", url: "/", icon: HomeIcon },
  { title: "Sohbetler", url: "/sohbetler", icon: MessagesSquareIcon },
  { title: "Ürün Ara", url: "/urun-ara", icon: SearchIcon },
  {
    title: "Sepetlerim",
    url: "/sepetlerim",
    icon: ShoppingBasketIcon,
  },
  {
    title: "Fişlerim",
    url: "/fis-gecmisi",
    icon: ReceiptIcon,
  },
  {
    title: "Asistan",
    url: "/asistan",
    icon: SparklesIcon,
  },
]

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  blogPosts?: BlogNavItem[]
}

/**
 * Daraltılmış raydaki başlık: normalde Sepet işareti, üzerine gelince kenar
 * çubuğu anahtarı. Aynı yuvada iki ikon olduğu için takas `IconSwap` ile
 * yapılıyor — kod bloğundaki kopyalama onayıyla birebir aynı fizik.
 *
 * Neden logonun YERİNE anahtar: daraltılmış rayda 32 pikselden başka yer yok ve
 * ikisi de aynı şeye bakıyor — "burası kenar çubuğu". Ayrı bir anahtar düğmesi
 * koymak rayı iki satır uzatırdı.
 *
 * Genişken hiç render edilmez (`hidden` → yalnız `collapsible=icon` altında
 * `flex`): orada wordmark ve üst bardaki anahtar zaten duruyor. Mobil sayfada
 * `Sheet` portala gittiği için `.group` atası yok, yani orada da gizli kalır.
 */
function SidebarBrandToggle() {
  const { toggleSidebar } = useSidebar()
  const modifier = useShortcutModifier()
  // Hover VE focus: klavyeyle gelen kullanıcı da düğmenin ne yaptığını görür,
  // yoksa odaktaki eleman hâlâ "logo" gibi durur.
  const [active, setActive] = React.useState(false)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggleSidebar}
          onMouseEnter={() => setActive(true)}
          onMouseLeave={() => setActive(false)}
          onFocus={() => setActive(true)}
          onBlur={() => setActive(false)}
          aria-label="Kenar çubuğunu aç"
          // `my-2`: düğme 32px ama genişken burada 48px'lik (h-12) wordmark
          // düğmesi duruyor. 8+8 piksel dikey marj kutuyu aynı 48'e tamamlar,
          // böylece açılıp kapanırken başlığın yüksekliği — ve dolayısıyla
          // ALTINDAKİ her satırın y konumu — hiç oynamaz. Ray genişlerken
          // yalnızca genişlik animasyonu görünür, içerik zıplamaz.
          //
          // `justify-start px-2`: ORTALAMA DEĞİL. İşaret wordmark'tan dar
          // (14 piksel) olduğu için 32 piksellik kutuda ortalanınca sol kenarı
          // ~1 piksel sağa kayıyordu — kapanma anında logo yerinden oynuyormuş
          // gibi. 8 piksel dolgu ile sol kenar wordmark'ın ve altındaki bütün
          // gezinme ikonlarının hizasına (24 piksel) oturur.
          className="my-2 hidden size-8 shrink-0 items-center justify-start rounded-md px-2 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-colors group-data-[collapsible=icon]:flex hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2"
        >
          <IconSwap swapKey={active ? "toggle" : "mark"}>
            {active ? (
              <PanelLeftIcon className="cn-rtl-flip size-4" />
            ) : (
              // h-6: genişken burada duran wordmark ile birebir aynı yükseklik.
              <SepetMark className="h-6" />
            )}
          </IconSwap>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        Kenar çubuğunu aç
        <KbdGroup>
          <Kbd>{modifier}</Kbd>
          <Kbd>B</Kbd>
        </KbdGroup>
      </TooltipContent>
    </Tooltip>
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
          <PanelLeftIcon className="cn-rtl-flip size-4" />
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
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            {/* Genişken wordmark + kapatma anahtarı, daralınca üstüne gelince
                anahtara dönüşen kare işaret. Hangisinin görüneceğine
                `data-collapsible` karar verir. */}
            {/* Sağ tık / basılı tutma → marka menüsü. Sarmalayıcı
                SidebarMenuButton'ın DIŞINDA: o `asChild` ile Slot kullanıyor ve
                tek bir eleman çocuk bekliyor. İçine konduğunda prop'lar (sınıf,
                ref) Link'e hiç ulaşmıyor ve menü hiç açılmıyordu. */}
            <BrandContextMenu>
              <SidebarMenuButton
                size="lg"
                asChild
                className="hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:hidden"
              >
                <Link href="/">
                  <Image
                    src="/brand/sepet-dark.svg"
                    alt="Sepet"
                    width={846}
                    height={178}
                    priority
                    className="h-6 w-auto dark:hidden"
                  />
                  <Image
                    src="/brand/sepet-light.svg"
                    alt=""
                    aria-hidden
                    width={846}
                    height={178}
                    className="hidden h-6 w-auto dark:block"
                  />
                </Link>
              </SidebarMenuButton>
            </BrandContextMenu>
            <SidebarBrandToggle />
            <SidebarPanelToggle />
          </SidebarMenuItem>
        </SidebarMenu>
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
                    // Genişken ikon+metin birlikte ortalanır. Rayda ORTALAMA
                    // KAPALI: 32 piksellik kutuda taşan etiketle birlikte
                    // ortalanınca artı işareti sola, görünür alanın dışına
                    // itiliyordu. Sola hizalı olunca ikon tam p-2 kutusuna oturur.
                    className="justify-center group-data-[collapsible=icon]:justify-start"
                  >
                    <Link href="/asistan" onClick={handleNewChatClick}>
                      <PlusIcon />
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
