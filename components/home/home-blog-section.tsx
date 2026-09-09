import { Squircle } from "@/components/ui/squircle"
import Link from "next/link"
import { RiArrowRightLine } from "@remixicon/react"

import { AuthorAvatarGroup } from "@/components/blog/author-meta"
import { HomeFeaturesSection } from "@/components/home/home-features-section"
import { HomeMarketsSection } from "@/components/home/home-markets-section"
import { getLatestPosts } from "@/lib/blog"
import { formatAuthorNames } from "@/lib/blog/authors"
import { getCategory } from "@/lib/blog/categories"
import { formatPostDateMedium } from "@/lib/blog/format"
import { Button } from "@/components/ui/button"
import { AnimateEnter } from "@/components/motion/animate-enter"
import { PressFx } from "@/components/motion/press-fx"
import { stagger } from "@/lib/motion"

// Ana sayfa "son 4 yazı" bölümü (plan §7.3). getLatestPosts ile beslenir.
export function HomeBlogSection() {
  const posts = getLatestPosts(4)
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
      {/* Market mozaiği ve üç özellik kartı. Zemin (`home-dark-ground`) ve
          `data-home-dark-start` nişanı bu section'a ait olduğu için ikisi de
          BURADA duruyor: page.tsx'te ayrı birer kardeş olsalardı hero'nun
          fade'iyle bu section'ın -mt bindirmesinin arasına düşerlerdi. İkisi de
          kendi kabını (max-w-5xl px-4) taşır, aşağıdaki blog bloğu gibi. */}
      <HomeMarketsSection />
      <HomeFeaturesSection />

      {/* pb: altında footer var; sayfa dibi boşluğunu footer'ın kendi padding'i
          tamamlıyor, bu yüzden burada eskisinden dar. */}
      <div className="mx-auto w-full max-w-5xl px-4 pt-12 pb-14 text-foreground md:pt-16">
        <AnimateEnter className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
            Blog Gönderileri
          </h2>
          <PressFx className="shrink-0">
            <Button asChild size="sm" className="group shrink-0">
              <Link href="/blog">
                Tüm blog yazıları
                <RiArrowRightLine
                  className="transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </Button>
          </PressFx>
        </AnimateEnter>

        {/* Kartlar 80 ms aralıkla girer: dört kart tek tek sayılmak yerine tek
            bir dalga olarak okunur. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map((post, i) => {
            const category = getCategory(post.category)
            return (
              <AnimateEnter
                key={post.slug}
                delay={stagger(i)}
                className="h-full"
              >
                {/* Yüzey (kenar + zemin) içerideki `Squircle`de duruyor:
                    clip-path elemanın KENDİ odak halkasını da sildiği için
                    `Link` kırpılmadan dışarıda kalıyor, klavye odağı onun
                    üzerinde çizilir. `grid` + `h-full` şart — `effects`
                    açıkken Lisse SVG katmanını barındıran bir sarmalayıcı div
                    doğuruyor; tek satırlık grid onu esnetmezse içerideki
                    `h-full` çözülemez ve kartlar eşit boyda durmaz.

                    `grid-cols-[minmax(0,1fr)]` ŞART. Örtük kolon `auto`dur ve
                    boyu sarmalayıcının min-content'ine göre belirlenir; o da
                    aşağıdaki `truncate` (white-space: nowrap) yüzünden KESİLMEMİŞ
                    yazar adının genişliği. İki yazarlı kartlarda 252px çıkıyor,
                    239px'lik kolonu 13px aşıyor ve 12px'lik gap'i yiyip komşu
                    kartın üstüne biniyordu. `min-w-0` bunu çözmez: layout'ta
                    küçülmeye izin verir, intrinsic ölçümdeki min-content
                    katkısını düşürmez. minmax(0,1fr) track'i kaba kilitler.

                    Dinlenme kenarı SVG'ye taşındığı için eski
                    `hover:border-foreground/20` artık boyanmıyor; hover geri
                    bildirimi zemin tonuna alındı. */}
                <Link
                  href={post.permalink}
                  className="group grid h-full grid-cols-[minmax(0,1fr)] rounded-xl"
                >
                  <Squircle
                    radius="xl"
                    effects
                    className="flex h-full flex-col border border-border bg-card p-4 transition-colors group-hover:bg-muted/40 [&_[data-slot=avatar]]:ring-card"
                  >
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm text-muted-foreground">
                      <time dateTime={post.publishedAt}>
                        {formatPostDateMedium(post.publishedAt)}
                      </time>
                      <span aria-hidden>·</span>
                      <span>{category.label}</span>
                    </div>

                    <h3 className="mt-1 grow text-base font-medium tracking-tight text-pretty text-foreground transition-colors group-hover:text-primary">
                      {post.title}
                    </h3>

                    {/* Sarmalamıyoruz: dar kartta "Nur Salan ve Umutcan Kaya"
                        sığmayınca avatarlar tek başına bir satırda kalıp
                        isimden kopuyordu. Tek satır + `truncate`, taşan adı
                        üç noktayla kesiyor; avatar grubu flex'in
                        `min-width:auto` tabanı sayesinde daralmıyor. */}
                    <div className="mt-8 flex items-center gap-2">
                      <AuthorAvatarGroup authors={post.authors} size="xs" />
                      <span className="min-w-0 truncate text-sm text-muted-foreground">
                        {formatAuthorNames(post.authors)}
                      </span>
                    </div>
                  </Squircle>
                </Link>
              </AnimateEnter>
            )
          })}
        </div>
      </div>
    </section>
  )
}
