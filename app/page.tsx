import { HomeBlogSection } from "@/components/home/home-blog-section"
import { HomeCtaSection } from "@/components/home/home-cta-section"
import { HomeHero } from "@/components/home/home-hero"
import { HomePricingSection } from "@/components/home/home-pricing-section"
import { SiteFooter } from "@/components/site-footer"

// Ana sayfa: tam ekran hero (client) + altında "son 4 yazı" blog bölümü (server)
// + fiyatlandırma/SSS bölümü + kapanış CTA'sı + site geneli footer.
export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeBlogSection />
      <HomePricingSection />
      <HomeCtaSection />
      <div className="bg-[linear-gradient(to_bottom,var(--home-base)_0%,color-mix(in_srgb,var(--home-base)_92%,black)_100%)]">
        <div className="dark text-foreground">
          <SiteFooter className="mt-0" />
        </div>
      </div>
    </>
  )
}
