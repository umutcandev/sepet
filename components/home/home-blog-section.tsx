import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { AuthorAvatarGroup } from "@/components/blog/author-meta"
import { BlogDitherCard } from "@/components/home/blog-dither-card"
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
    <section className="relative z-20 -mt-24 md:-mt-28">
      {/* Zemin artık section'ın kendi düz `bg`si değil, üst kenarı yumuşayan
          ayrı bir katman (`home-dark-ground`).

          Sebep: hero'nun dip rampası (`.home-hero-fade`) artık shader ile
          birlikte, hidrasyondan SONRA geliyor. Bu bölüm ise ilk boyamada
          hazır. Düz renk olsaydı o boşlukta krem hero'nun dibine simsiyah bir
          blok keskin bir çizgiyle otururdu.

          Katman BİLEREK anime EDİLMİYOR. Denendi: bölüm ilk boyamada, shader
          ise hidrasyonda başladığı için aynı gecikmeyi verseler bile farklı
          anlardan sayıyorlar; zemin gelip shader'ı bekliyor gibi görünüyordu.
          Burası zaten bir sayfa bölümü, yerinde durması doğru — yükselerek
          gelen şey hero'nun zemini olmalı.

          `absolute` + `-z-10`: yerleşime hiç dokunmuyor. Bu şart, çünkü
          aşağıdaki `data-home-dark-start` nişanının KONUMU header'ın scroll
          rampasını besliyor (app-shell). Section'ın kendisini oynatsaydık
          nişan da oynar ve açılışta header rengi titrerdi. */}
      <div
        aria-hidden
        className="home-dark-ground pointer-events-none absolute inset-0 -z-10"
      />
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
          o yüzden logolar tek renk krem olarak oturur. */}
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
          <LogoMarquee className="text-foreground/45" />
        </AnimateEnter>
      </div>
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
                <BlogDitherCard
                  href={post.permalink}
                  index={i}
                  className="group flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20 [&_[data-slot=avatar]]:ring-card"
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

                  <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <AuthorAvatarGroup authors={post.authors} size="sm" />
                    <span className="min-w-0 text-sm text-muted-foreground">
                      {formatAuthorNames(post.authors)} ·{" "}
                      {post.metadata.readingTime} dk okuma
                    </span>
                  </div>
                </BlogDitherCard>
              </AnimateEnter>
            )
          })}
        </div>
      </div>
    </section>
  )
}
