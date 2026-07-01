import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { PostCard } from "@/components/blog/post-card"
import { Button } from "@/components/ui/button"
import { getLatestPosts } from "@/lib/blog"

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
      <div className="dark mx-auto w-full max-w-6xl px-4 pb-24 pt-8 text-foreground md:px-6 md:pt-12">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Blog Gönderileri
            </h2>
            <p className="text-sm text-muted-foreground">
              Sepet&apos;in sağlık, beslenme ve tekniği üzerine yazdığımız son
              yazılar.
            </p>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Link href="/blog">
              Tüm yazıları gör
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </section>
  )
}
