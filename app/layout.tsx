import type { Metadata } from "next"
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
import { getCurrentUser } from "@/lib/auth/session"
import { listConversations } from "@/lib/actions/conversations"
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
        url: "/opengraph-image.png",
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
    images: ["/opengraph-image.png"],
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getCurrentUser()
  const conversations = user ? await listConversations() : []
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
        {/* Site geneli kök JSON-LD: Organization + WebSite (Rich Snippet). */}
        <JsonLd data={[organizationLd(), websiteLd()]} />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <SessionProvider user={user}>
              <AppShell
                user={user}
                conversations={conversations}
                blogPosts={blogPosts}
              >
                {children}
              </AppShell>
              <LoginDialogHost />
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
