import { Squircle } from "@/components/ui/squircle"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { AuthorAvatarGroup } from "@/components/blog/author-meta"
import { HomeFeaturesSection } from "@/components/home/home-features-section"
import { LogoMarquee } from "@/components/home/logo-marquee"
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

  // Zemin = hero fade'inin dip rengi (--home-base) ile birebir aynı; gerçek
  // temaya bağlı (gündüz #0d0f0c / gece #1b0e08), bu yüzden section'a `dark`
  // SABİTLEMİYORUZ — yoksa değişken hep gece değerine kilitlenirdi. İç sarmalayıcı
  // `dark` taşır ki metin/kart paleti her iki temada da koyu (açık metin) kalsın.
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
      {/* Logo şeridi. Kap aşağıdaki kart gridiyle BİREBİR aynı: aynı max-w,
          aynı px — şerit kartların sol/sağ hizasında başlayıp bitiyor.

          Üst boşluk kasıtlı olarak dar. Bölüm hero'nun üstüne -mt ile biniyor
          ve hero fade'i bu bölümün üst kenarından önce zaten tam opak
          --home-base'e ulaşıyor; yani şeridin üstünde ölçülen boşluğa, gözün
          aynı koyu bandın parçası saydığı fade payı da ekleniyor. Buraya
          gridin dikey ritmini uygulasak şerit bandın ortasında asılı kalıyor,
          hero'nun hemen ardına iliştirilmiş gibi durmuyordu.

          Rengini `dark` sarmalayıcıdan alır — bu bölüm her iki temada da koyu,
          o yüzden logolar tek renk marka tonunda (dark `--primary`) oturur. */}
      <div className="dark mx-auto w-full max-w-5xl px-4 pt-3 text-foreground md:pt-5">
        {/* Şerit fold'un TAM sınırında duruyor: hangi ekran yüksekliğinde
            olursak olalım ilk ekranın alt kenarına denk geliyor, dolayısıyla
            scroll reveal'a hiç girmiyor ve animasyonsuz beliriyordu. Bu yüzden
            açılış moduna alındı; gecikme hero'daki diziyi sürdürür
            (rozet 0.1 → başlık 0.22 → prompt 0.34 → chip 0.46 → şerit 0.58).

            `isWhileInView={false}` sunucu HTML'ine sınıfı doğrudan yazar, yani
            animasyon ilk kareden itibaren kuruludur. Hidrasyondan sonra sınıf
            eklenseydi eleman önce görünür boyanıp sonra sıfır opaklığa düşerdi. */}
        <AnimateEnter isWhileInView={false} delay={0.58}>
          {/* Wordmark'lar `currentColor` — renk buradan iner. `text-primary`,
              `dark` sarmalayıcı içinde olduğumuz için koyu temanın sıcak
              marka tonu; kart zemininde (`--card`) rahat okunuyor, o yüzden
              eski kırma opaklığa (foreground/45) gerek kalmadı. */}
          <LogoMarquee className="text-primary" />
        </AnimateEnter>
      </div>

      {/* Üç özellik kartı. Zemin (`home-dark-ground`) ve `data-home-dark-start`
          nişanı bu section'a ait olduğu için özellik bölümü de BURADA duruyor:
          page.tsx'te ayrı bir kardeş olsaydı hero'nun fade'iyle bu section'ın
          -mt bindirmesinin arasına düşerdi. Kendi `dark` sarmalayıcısını
          taşır — aşağıdaki blog bloğu gibi. */}
      <HomeFeaturesSection />

      {/* pb: altında footer var; sayfa dibi boşluğunu footer'ın kendi padding'i
          tamamlıyor, bu yüzden burada eskisinden dar. */}
      <div className="dark mx-auto w-full max-w-5xl px-4 pt-12 pb-14 text-foreground md:pt-16">
        <AnimateEnter className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
            Blog Gönderileri
          </h2>
          <PressFx className="shrink-0">
            <Button asChild size="sm" className="group shrink-0">
              <Link href="/blog">
                Tüm blog yazıları
                <ArrowRight
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

                    Dinlenme kenarı SVG'ye taşındığı için eski
                    `hover:border-foreground/20` artık boyanmıyor; hover geri
                    bildirimi zemin tonuna alındı. */}
                <Link
                  href={post.permalink}
                  className="group grid h-full rounded-xl"
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
