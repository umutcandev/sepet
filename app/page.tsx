import { HomeBlogSection } from "@/components/home/home-blog-section"
import { HomeHero } from "@/components/home/home-hero"

// Ana sayfa: tam ekran hero (client) + altında "son 4 yazı" blog bölümü (server).
export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeBlogSection />
    </>
  )
}
