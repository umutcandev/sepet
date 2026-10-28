import Link from "next/link"
import { RiArrowRightLine, RiArrowRightSLine } from "@remixicon/react"

import { PostCover } from "@/components/blog/post-cover"
import { HomeFeaturesSection } from "@/components/home/home-features-section"
import { HomeMarketsSection } from "@/components/home/home-markets-section"
import { getLatestPosts } from "@/lib/blog"
import { getCategory } from "@/lib/blog/categories"
import { formatPostDateShort } from "@/lib/blog/format"
import { Button } from "@/components/ui/button"
import { PressFx } from "@/components/motion/press-fx"

// Ana sayfa "son 3 yazı" bölümü (plan §7.3). getLatestPosts ile beslenir.
export function HomeBlogSection() {
  const posts = getLatestPosts(3)
  if (posts.length === 0) return null

  // Zemin = hero fade'inin dip rengi (--home-base), gerçek temaya bağlı:
  // gündüz sıcak kum #F5E8DA, gece espresso #1b0e08.
  //
  // İÇERİDE `dark` SARMALAYICI YOK, ARTIK. Bu bölüm eskiden her iki temada da
  // koyuydu ve paleti `dark` sınıfıyla oraya kilitleniyordu; gündüz temasında
  // krem bir sayfanın altına oturan kara blok olarak okunuyordu. Kilit
  // kalkınca bant gerçek temayı izliyor: gündüzde açık, gecede koyu.
  //
  // `-mt-*` ile bölümü fade'in tam dolduğu bölgeye yukarı çekiyoruz (z-20 ile
  // hero'nun üstünde kalır), boşluk kapanır.
  return (
    // Zemin section'ın KENDİ `background-image`ı (`.home-dark-ground`,
    // globals.css): üst kenarı 6rem boyunca saydamdan --home-base'e çıkan bir
    // rampa, altı düz --home-base.
    //
    // Rampanın sebebi: hero'nun dip fade'i (`.home-hero-fade`) artık shader ile
    // birlikte, hidrasyondan SONRA geliyor; bu bölüm ise ilk boyamada hazır.
    // Düz renk olsaydı o boşlukta krem hero'nun dibine simsiyah bir blok keskin
    // bir çizgiyle otururdu. Rampa bindirme payı (96px) kadar, yani bölüm
    // hero'nun üstünden çıktığı yerde tam opak; senkron kaçsa bile sert kenar
    // çıkamaz. Oturunca GÖRÜNMEZ, çünkü hero'nun fade'i o bölgede zaten tam
    // opak --home-base.
    //
    // AYRI BİR KATMAN DEĞİL. Burada bir zamanlar `absolute inset-0 -z-10`
    // taşıyan bir div vardı; negatif z, kendi stacking context'inde en alta
    // boyanır, bağlam tutmazsa katman `SidebarInset`in `bg-background`ının
    // (krem) ALTINA düşüp tamamen kaybolur — bölümün zemini krem kalırken
    // içeriği `dark` paletiyle boyanmaya devam eder (başlık krem üstünde krem).
    // Section'ın kendi arka planı olarak hiçbir boyama sırası varsayımı yok:
    // arka plan her zaman kendi içeriğinin altında, ata zeminlerin üstünde.
    <section className="home-dark-ground relative z-20 -mt-24 md:-mt-28">
      {/* Header'ın zeminini bu noktadan itibaren --home-base'e çeviren nişan
          (AppShell IntersectionObserver ile izler). Bölümün kendisini hedef
          almıyoruz: çok uzun olduğu için üst kenarı header'ın altına geçerken
          kesişim durumu değişmez ve observer hiç tetiklenmez. */}
      <div
        aria-hidden
        data-home-dark-start
        className="absolute inset-x-0 top-0 h-px"
      />
      {/* Zeminin tam opak başladığı çizgi (rampanın sonu). Bu header'ın
          üstüne çıkınca hero zemini hiçbir yerden görünmez; AppShell shader
          katmanını o noktada çizimden çıkarır. */}
      <div
        aria-hidden
        data-home-opaque-start
        className="absolute inset-x-0 top-[calc(var(--home-dark-start)+var(--home-dark-length))] h-px"
      />
      {/* Market mozaiği ve üç özellik kartı. Zemin (`home-dark-ground`) ve
          `data-home-dark-start` nişanı bu section'a ait olduğu için ikisi de
          BURADA duruyor: page.tsx'te ayrı birer kardeş olsalardı hero'nun
          fade'iyle bu section'ın -mt bindirmesinin arasına düşerlerdi. İkisi de
          kendi kabını (max-w-5xl px-4) taşır, aşağıdaki blog bloğu gibi. */}
      <HomeMarketsSection />
      <HomeFeaturesSection />

      {/* pb: altında footer var; sayfa dibi boşluğunu footer'ın kendi padding'i
          tamamlıyor, bu yüzden burada eskisinden dar. */}
      <div className="@container/blog mx-auto w-full max-w-5xl px-4 pt-12 pb-14 text-foreground md:pt-16">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-medium tracking-tight text-balance text-foreground">
            Blog Gönderileri
          </h2>
          <PressFx className="shrink-0">
            <Button
              variant="default"
              asChild
              size="sm"
              className="group shrink-0"
            >
              <Link href="/blog">
                Tüm blog yazıları
                <RiArrowRightLine
                  className="transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </Button>
          </PressFx>
        </div>

        <div className="grid grid-cols-1 gap-x-5 gap-y-8 @2xl/blog:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={post.permalink}
              className="group flex flex-col rounded-lg"
            >
              <PostCover
                post={post}
                className="border border-hairline transition-opacity group-hover:opacity-90"
              />
              <div className="mt-4 flex items-center gap-2 text-[0.8125rem]">
                <span className="font-medium text-foreground">
                  {getCategory(post.category).label}
                </span>
                <span aria-hidden className="text-muted-foreground">
                  ·
                </span>
                <time dateTime={post.publishedAt} className="text-foreground/80">
                  {formatPostDateShort(post.publishedAt)}
                </time>
              </div>
              <h3 className="mt-1.5 text-base font-medium tracking-tight text-pretty text-foreground">
                {post.title}
                <RiArrowRightSLine
                  aria-hidden
                  className="ml-1 inline size-4 align-[-0.2em] text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
