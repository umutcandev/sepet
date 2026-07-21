import type { Metadata } from "next"
import { Suspense } from "react"
import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { AppShell } from "@/components/app-shell"
import { JsonLd } from "@/components/blog/json-ld"
import { organizationLd, websiteLd } from "@/lib/blog/jsonld"
import { LoginDialogHost } from "@/components/auth/login-dialog-host"
import { LocationHost } from "@/components/location/location-host"
import { OnboardingHost } from "@/components/onboarding/onboarding-host"
import { CheckoutResultHost } from "@/components/subscription/checkout-result-host"
import { SessionProvider } from "@/components/providers/session-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SESSION_HINT_SCRIPT } from "@/lib/auth/session-snapshot"
import { getLatestPosts } from "@/lib/blog"
import { cn } from "@/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

const siteName = "Sepet"
const siteTitle = "Sepet - Yapay Zekâ Destekli Akıllı Alışveriş Asistanı"
const siteDescription =
  "Alışveriş listeni yaz, marketlerdeki en uygun fiyatları karşılaştır ve en ucuz sepeti saniyeler içinde oluştur."

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s",
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/",
    siteName,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/brand/opengraph-image.png",
        width: 957,
        height: 410,
        alt: siteTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/brand/opengraph-image.png"],
  },
}

// Kök layout kasıtlı olarak `auth()`/cookie okumaz: böylece paylaşımlı rotalar
// (ana sayfa, blog, yasal sayfalar) statik/ISR olarak CDN'de cache'lenebilir.
// Kullanıcıya özel durum (avatar, konum, sohbet listesi) SessionProvider
// tarafından mount sonrası `/api/me`'den çekilir. blogPosts velite'tan gelir
// (statik içerik, cookie yok).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Sidebar "Blog Gönderileri" grubu için son 4 yazı (başlık + link + yazar).
  const blogPosts = getLatestPosts(4).map((post) => ({
    title: post.title,
    permalink: post.permalink,
    authors: post.authors,
  }))
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={cn("style-nova antialiased", fontMono.variable, "font-sans", geist.variable)}
    >
      <body>
        {/* Son bilinen oturum ipucunu ilk boyamadan önce <html data-session>'a
            yazar (next-themes'in tema scriptiyle aynı kalıp). Header/sidebar
            iki varyantı da render eder; globals.css'teki [data-session-*]
            kuralları yanlış olanı gizler → statik sayfada oturum flicker'ı
            yaşanmaz. Kaynak: lib/auth/session-snapshot.ts */}
        <script dangerouslySetInnerHTML={{ __html: SESSION_HINT_SCRIPT }} />
        {/* Site geneli kök JSON-LD: Organization + WebSite (Rich Snippet). */}
        <JsonLd data={[organizationLd(), websiteLd()]} />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <SessionProvider>
              <AppShell blogPosts={blogPosts}>{children}</AppShell>
              {/* useSearchParams okur → statik prerender'ın CSR bailout
                  vermemesi için Suspense sınırı (görünür fallback yok). */}
              <Suspense fallback={null}>
                <LoginDialogHost />
              </Suspense>
              <OnboardingHost />
              <LocationHost />
              <CheckoutResultHost />
              <Toaster position="top-right" richColors />
            </SessionProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
