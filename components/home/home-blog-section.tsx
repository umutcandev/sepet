import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { AuthorAvatarGroup } from "@/components/blog/author-meta"
import { getLatestPosts } from "@/lib/blog"
import { formatAuthorNames } from "@/lib/blog/authors"
import { getCategory } from "@/lib/blog/categories"
import { formatPostDateMedium } from "@/lib/blog/format"

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
    <section className="relative z-20 -mt-24 bg-[var(--home-base)] md:-mt-28">
      {/* pb: altında footer var; sayfa dibi boşluğunu footer'ın kendi padding'i
          tamamlıyor, bu yüzden burada eskisinden dar. */}
      <div className="dark mx-auto w-full max-w-5xl px-4 pb-14 pt-8 text-foreground md:pt-12">
        <h2 className="mb-5 text-2xl font-semibold tracking-tight text-foreground">
          Blog Gönderileri
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map((post) => {
            const category = getCategory(post.category)
            return (
              <Link
                key={post.slug}
                href={post.permalink}
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
              </Link>
            )
          })}
        </div>

        <Link
          href="/blog"
          className="group mt-4 inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 transition-colors hover:underline"
        >
          Tüm blog yazıları
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </section>
  )
}
