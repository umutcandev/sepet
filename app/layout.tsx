import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { AppShell } from "@/components/app-shell"
import { LoginDialogHost } from "@/components/auth/login-dialog-host"
import { SessionProvider } from "@/components/providers/session-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getCurrentUser } from "@/lib/auth/session"
import { cn } from "@/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: "Sepet - Yapay Zekâ Destekli Akıllı Alışveriş Asistanı",
    template: "%s",
  },
  description:
    "Alışveriş listeni yaz, marketlerdeki en uygun fiyatları karşılaştır ve en ucuz sepeti saniyeler içinde oluştur.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getCurrentUser()
  return (
    <html
      lang="tr"
      className={cn("style-nova antialiased", fontMono.variable, "font-sans", geist.variable)}
    >
      <body>
        <TooltipProvider>
          <SessionProvider user={user}>
            <AppShell user={user}>{children}</AppShell>
            <LoginDialogHost />
          </SessionProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
