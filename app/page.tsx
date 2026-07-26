import { HomeBlogSection } from "@/components/home/home-blog-section"
import { HomeHero } from "@/components/home/home-hero"
import { SiteFooter } from "@/components/site-footer"

// Ana sayfa: tam ekran hero (client) + altında "son 4 yazı" blog bölümü (server)
// + site geneli footer.
export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeBlogSection />
      <div className="bg-[linear-gradient(to_bottom,var(--home-base)_0%,color-mix(in_srgb,var(--home-base)_92%,black)_100%)]">
        <div className="dark text-foreground">
          <SiteFooter className="mt-0" />
        </div>
      </div>
    </>
  )
}
