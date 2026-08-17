// Site geneli alt bilgi — tek kaynak. Paper'daki footer taslağının yapısı:
// solda marka + tanıtım + sosyal ikonlar, sağda dört bağlantı sütunu, altta
// telif satırı ile durum rozeti + tema anahtarı. Ölçüler blog sayfalarıyla aynı
// kabı (max-w-5xl px-4) kullanır ki sütunlar yazı gridiyle aynı hizaya otursun.
// Yeni bir sayfaya eklerken bu bileşeni import et; kopya footer dosyası açma.
import Image from "next/image"
import Link from "next/link"

import { GitHubLogo, XLogo } from "@/components/blog/brand-icons"
import { FooterLink } from "@/components/site-footer-link"
import { ThemeToggleInline } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CATEGORY_LIST } from "@/lib/blog/categories"
import { SITE_X } from "@/lib/site"
import { cn } from "@/lib/utils"

const STATUS_URL = "https://status.trysepet.com/"
const GITHUB_URL = "https://github.com/umutcandev/sepet"

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
  { label: "X", href: SITE_X, icon: XLogo },
  { label: "GitHub", href: GITHUB_URL, icon: GitHubLogo },
]

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
      <p className="mb-4 text-sm font-semibold tracking-tight text-balance text-foreground">
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
            <p className="text-sm leading-relaxed text-muted-foreground">
              Alışveriş listeni yaz, marketlerdeki en uygun fiyatları
              karşılaştır ve en ucuz sepeti saniyeler içinde oluştur.
            </p>
            <div className="flex items-center gap-2">
              {socials.map(({ label, href, icon: Icon }) => (
                <Button
                  key={label}
                  asChild
                  variant="outline"
                  size="icon"
                  aria-label={label}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    <Icon className="size-4" />
                  </a>
                </Button>
              ))}
            </div>
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
            </FooterColumn>
          </div>
        </div>

        {/* Alt şerit: solda telif, sağda aynı yükseklikteki iki kontrol —
            durum rozeti ve tema anahtarı. */}
        <div className="mt-10 flex flex-col gap-4 sm:mt-14 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            © {year}, Tüm hakları saklıdır.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {/* Varsayılan rozetten biraz daha dar (px-1.5) ve bir tık daha
                yüksek (h-6): yanındaki telif satırıyla optik olarak eşitlenir. */}
            <Badge
              asChild
              variant="outline"
              className="h-6 w-fit gap-1.5 bg-primary/5 px-1.5 text-primary"
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
            </Badge>
            <ThemeToggleInline />
          </div>
        </div>
      </div>
    </footer>
  )
}
