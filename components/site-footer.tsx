// Site geneli alt bilgi — tek kaynak. Paper'daki footer taslağının yapısı:
// solda marka + tanıtım + asistan butonları, sağda dört bağlantı sütunu, altta
// telif + sosyal bağlantılar ile durum butonu + tema anahtarı. Ölçüler blog sayfalarıyla aynı
// kabı (max-w-5xl px-4) kullanır ki sütunlar yazı gridiyle aynı hizaya otursun.
// Yeni bir sayfaya eklerken bu bileşeni import et; kopya footer dosyası açma.
import Image from "next/image"
import Link from "next/link"

import { HackathonBadge } from "@/components/hackathon-badge"
import { FooterAssistantLinks, FooterLink } from "@/components/site-footer-link"
import { ThemeToggleInline } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { CATEGORY_LIST } from "@/lib/blog/categories"
import { SITE_X, absoluteUrl } from "@/lib/site"
import { cn } from "@/lib/utils"

const STATUS_URL = "https://status.trysepet.com/"
const GITHUB_URL = "https://github.com/umutcandev/sepet"
const GITHUB_ORG_URL = "https://github.com/trysepetcom"
const LINKEDIN_URL = "https://www.linkedin.com/company/trysepetcom/"

const productLinks = [
  { label: "Asistan", href: "/asistan" },
  { label: "Ürün Ara", href: "/urun-ara" },
  { label: "Sepetlerim", href: "/sepetlerim" },
  { label: "Fiş Geçmişi", href: "/fis-gecmisi" },
]

const legalLinks = [
  { label: "Gizlilik Politikası", href: "/gizlilik" },
  { label: "Kullanım Şartları", href: "/kullanim-sartlari" },
  { label: "Mesafeli Satış", href: "/mesafeli-satis" },
  { label: "İptal ve İade", href: "/iptal-iade" },
]

const socials = [
  { label: "X", href: SITE_X },
  { label: "LinkedIn", href: LINKEDIN_URL },
  { label: "GitHub", href: GITHUB_ORG_URL },
]

const assistantPrompt = `Sepet (${absoluteUrl("/")}) nedir, ne işe yarar, nasıl çalışır ve fiyatı ne kadar? Önce ${absoluteUrl("/llms.txt")} adresini, fiyatlar için de ana sayfayı oku ve bana özetle.`

function FooterColumn({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  // Sütun etiketi başlık değil: `<h2>` olduğunda üç footer etiketi her sayfanın
  // başlık taslağına makale bölümleriyle aynı seviyede giriyordu. Etiketli bir
  // `<nav>` landmark'ı gezinme değerini koruyor, taslağı kirletmiyor.
  return (
    <nav aria-label={title} className="min-w-0">
      <p className="mb-4 text-xs font-medium tracking-wider text-balance text-foreground uppercase">
        {title}
      </p>
      <ul className="flex flex-col gap-3">{children}</ul>
    </nav>
  )
}

// Sütun bağlantısı: liste öğesi kabuğu burada, hover alt çizgisi FooterLink'te.
function FooterListLink({
  href,
  external,
  children,
}: {
  href: string
  external?: boolean
  children: React.ReactNode
}) {
  return (
    <li>
      <FooterLink href={href} external={external}>
        {children}
      </FooterLink>
    </li>
  )
}

export function SiteFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear()

  return (
    <footer className={cn("mt-16", className)}>
      {/* Üst/alt boşluk asimetrik: alt şerit sayfanın dibine daha yakın dursun
          diye pb üstteki pt'nin yarısı kadar. */}
      <div className="mx-auto w-full max-w-5xl px-4 pt-10 pb-5 md:pt-14 md:pb-7">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between md:gap-10 lg:gap-12">
          {/* Marka sütunu */}
          <div className="flex flex-col gap-6 md:max-w-[17rem]">
            <div className="flex items-center gap-3">
              <Link href="/" className="inline-flex w-fit items-center">
                <Image
                  src="/brand/sepet-dark.svg"
                  alt="Sepet"
                  width={846}
                  height={178}
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
              <span aria-hidden className="h-4 w-px bg-border" />
              <HackathonBadge />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Alışveriş listeni yaz, marketlerdeki en uygun fiyatları
              karşılaştır ve en ucuz sepeti saniyeler içinde oluştur.
            </p>
            <FooterAssistantLinks prompt={assistantPrompt} />
          </div>

          {/* Bağlantı sütunları — mobilde iki, sm'de dört. md'de marka sütunu
              yana geçince dört sütuna yer kalmadığı için 2×2'ye düşer, lg'de
              yeniden tek sıra dört sütun olur. */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4 md:grid-cols-2 md:gap-x-10 lg:grid-cols-4 lg:gap-x-8">
            <FooterColumn title="Ürün">
              {productLinks.map((link) => (
                <FooterListLink key={link.href} href={link.href}>
                  {link.label}
                </FooterListLink>
              ))}
            </FooterColumn>

            <FooterColumn title="Blog">
              <FooterListLink href="/blog">Tüm Yazılar</FooterListLink>
              {CATEGORY_LIST.map((category) => (
                <FooterListLink
                  key={category.id}
                  href={`/blog?kategori=${category.slug}`}
                >
                  {category.label}
                </FooterListLink>
              ))}
            </FooterColumn>

            <FooterColumn title="Yasal">
              {legalLinks.map((link) => (
                <FooterListLink key={link.href} href={link.href}>
                  {link.label}
                </FooterListLink>
              ))}
            </FooterColumn>

            <FooterColumn title="Destek">
              <FooterListLink href={STATUS_URL} external>
                Sistem Durumu
              </FooterListLink>
              <FooterListLink href={GITHUB_URL} external>
                Geri Bildirim
              </FooterListLink>
              <FooterListLink href="mailto:support@trysepet.com" external>
                Destek
              </FooterListLink>
              <FooterListLink href={`${GITHUB_URL}/discussions`} external>
                Tartışma
              </FooterListLink>
            </FooterColumn>
          </div>
        </div>

        {/* Mobil (grid): sosyal + tema üst satırda, telif altta.
            md+ (flex): telif, sosyal, sağda durum + tema. */}
        <div className="mt-10 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-5 sm:mt-14 md:flex md:gap-6">
          <p className="col-span-2 row-start-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            © {year} Sepet. Tüm hakları saklıdır.
          </p>
          {/* lang="en": tr uppercase "LinkedIn"i "LİNKEDİN" yapıyordu. */}
          <nav
            aria-label="Sosyal medya"
            lang="en"
            className="row-start-1 flex items-center gap-5 font-medium tracking-wider uppercase"
          >
            {socials.map(({ label, href }) => (
              <FooterLink
                key={label}
                href={href}
                external
                className="relative text-xs after:absolute after:-inset-x-2.5 after:-inset-y-3"
              >
                {label}
              </FooterLink>
            ))}
          </nav>
          <div className="row-start-1 flex items-center gap-2 md:ml-auto">
            {/* Mobilde gizli: Destek sütunundaki "Sistem Durumu" ile aynı yer. */}
            <Button
              asChild
              variant="outline"
              size="xs"
              className="hidden gap-1.5 text-muted-foreground hover:text-foreground md:inline-flex"
            >
              <a href={STATUS_URL} target="_blank" rel="noopener noreferrer">
                {/* Canlı sinyali: sabit nokta + üzerinde dışa açılan halka.
                    motion-safe, hareket azaltma tercihinde nokta sabit kalır. */}
                <span aria-hidden className="relative flex size-1.5 shrink-0">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-75 motion-safe:animate-ping" />
                  <span className="relative size-1.5 rounded-full bg-emerald-500" />
                </span>
                Sistem Durumu
              </a>
            </Button>
            <ThemeToggleInline />
          </div>
        </div>
      </div>
    </footer>
  )
}
