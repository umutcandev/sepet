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
      {/* Footer bandı. Zemin --home-base'ten hafifçe koyulaşarak sayfayı
          kapatıyor; renk gerçek temadan gelir (gündüz kum, gece espresso).

          `dark` SARMALAYICI YOK: bu bant eskiden her iki temada da koyuydu ve
          palet oraya kilitleniyordu — gündüzde krem sayfanın altında kara bir
          blok bırakıyordu. Kilit kalkınca footer sayfanın geri kalanıyla aynı
          temada; `SiteFooter`ın logo varyantı da (`dark:hidden`/`dark:block`)
          doğru olanı seçiyor, ki token override'ıyla düzeltilemeyecek tek
          şey oydu. */}
      <div className="bg-[linear-gradient(to_bottom,var(--home-base)_0%,color-mix(in_srgb,var(--home-base)_92%,black)_100%)]">
        <SiteFooter className="mt-0" />
      </div>
    </>
  )
}
