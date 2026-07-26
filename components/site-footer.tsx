// Site geneli alt bilgi — tek kaynak. Paper'daki footer taslağının yapısı:
// solda marka + tanıtım + sosyal ikonlar, sağda üç bağlantı sütunu, altta ince
// ayraçla telif satırı. Ölçüler blog sayfalarıyla aynı kabı (max-w-5xl px-4)
// kullanır ki sütunlar yazı gridiyle aynı hizaya otursun.
// Yeni bir sayfaya eklerken bu bileşeni import et; kopya footer dosyası açma.
import Image from "next/image"
import Link from "next/link"

import { GitHubLogo, XLogo } from "@/components/blog/brand-icons"
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
  return (
    <div className="min-w-0">
      <h2 className="mb-4 text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <ul className="flex flex-col gap-3">{children}</ul>
    </div>
  )
}

function FooterLink({
  href,
  external,
  children,
}: {
  href: string
  external?: boolean
  children: React.ReactNode
}) {
  const className =
    "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"

  return (
    <li>
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          {children}
        </a>
      ) : (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    </li>
  )
}

export function SiteFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear()

  return (
    <footer className={cn("mt-16", className)}>
      <div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between md:gap-16">
          {/* Marka sütunu */}
          <div className="flex flex-col gap-6 md:max-w-xs">
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
            <div className="flex items-center gap-5">
              {socials.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon className="size-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Bağlantı sütunları — mobilde iki, sm ve üstünde üç sütun */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 md:gap-x-12 lg:gap-x-16">
            <FooterColumn title="Ürün">
              {productLinks.map((link) => (
                <FooterLink key={link.href} href={link.href}>
                  {link.label}
                </FooterLink>
              ))}
            </FooterColumn>

            <FooterColumn title="Blog">
              <FooterLink href="/blog">Tüm Yazılar</FooterLink>
              {CATEGORY_LIST.map((category) => (
                <FooterLink
                  key={category.id}
                  href={`/blog?kategori=${category.slug}`}
                >
                  {category.label}
                </FooterLink>
              ))}
            </FooterColumn>

            <FooterColumn title="Destek">
              <FooterLink href={STATUS_URL} external>
                Sistem Durumu
              </FooterLink>
              <FooterLink href={GITHUB_URL} external>
                Geri Bildirim
              </FooterLink>
              <FooterLink href="mailto:support@trysepet.com" external>
                Destek
              </FooterLink>
            </FooterColumn>
          </div>
        </div>

        {/* Alt şerit */}
        <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:mt-14 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-xs font-medium text-muted-foreground">
              © {year} Sepet. Tüm hakları saklıdır.
            </p>
            <a
              href={STATUS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-emerald-500"
              />
              Sistem durumu
            </a>
          </div>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
