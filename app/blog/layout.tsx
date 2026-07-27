import { SiteFooter } from "@/components/site-footer"

// Blog bölümünün kabı: yazı listesi ve tekil yazı sayfaları aynı alt bilgiyi
// paylaşsın diye footer burada, sayfaların içinde değil.
export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  )
}
