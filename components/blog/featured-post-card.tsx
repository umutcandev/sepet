import Link from "next/link"

import { AuthorAvatarGroup } from "@/components/blog/author-meta"
import { Squircle } from "@/components/ui/squircle"
import type { Post } from "@/lib/blog"
import { formatAuthorNames } from "@/lib/blog/authors"
import { getCategory } from "@/lib/blog/categories"
import { formatPostDateShort } from "@/lib/blog/format"

// Öne çıkan kart (Vercel blog öne çıkan kartı esinli): kart yüzeyi, tarih +
// kategori, büyük başlık, altta açıklama + yazar. Index'in üst sırasında.
//
// Yüzey reçetesi ana sayfadaki blog kartıyla BİREBİR (bkz. home-blog-section):
// `radius="xl"` + `effects` + `smooth-shadow-ring-sm`, ayrıca `border` YOK —
// halka zaten gölgenin içinde (globals.css'teki not). Eskiden düz
// `border border-border` idi ve gölgesizdi.
//
// `Link` dışarıda: Squircle'ın clip-path'i elemanın KENDİ odak halkasını da
// siler. `grid` + `h-full`, `effects`in doğurduğu sarmalayıcıyı hücre boyuna
// esnetmek için; `minmax(0,1fr)` ise içerideki `truncate`ın min-content
// katkısının kolonu taşırmasını engelliyor.
export function FeaturedPostCard({ post }: { post: Post }) {
  const category = getCategory(post.category)
  return (
    <Link
      href={post.permalink}
      className="group grid h-full grid-cols-[minmax(0,1fr)] rounded-xl"
    >
      <Squircle
        radius="xl"
        effects
        // Kenar SVG'ye taşındığı için eski `hover:border-foreground/20` artık
        // boyanmıyor; hover geri bildirimi zemin tonuna alındı.
        className="flex h-full min-h-[20rem] flex-col gap-4 bg-card p-5 transition-colors smooth-shadow-ring-sm group-hover:bg-muted/40 [&_[data-slot=avatar]]:ring-card"
      >
        <div className="flex items-center gap-2 text-sm">
          <time dateTime={post.publishedAt} className="text-foreground">
            {formatPostDateShort(post.publishedAt)}
          </time>
          <span className="text-muted-foreground">{category.label}</span>
        </div>

        <h3 className="text-2xl font-medium tracking-tight text-balance text-foreground transition-colors group-hover:text-primary md:text-[1.75rem] md:leading-tight">
          {post.title}
        </h3>

        <div className="mt-auto flex flex-col gap-4 pt-2">
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {post.description}
          </p>
          <div className="flex items-center gap-2">
            <AuthorAvatarGroup authors={post.authors} size="sm" />
            <span className="text-sm text-muted-foreground">
              {formatAuthorNames(post.authors)}
            </span>
          </div>
        </div>
      </Squircle>
    </Link>
  )
}
