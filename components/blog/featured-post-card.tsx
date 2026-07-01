import Link from "next/link"

import { AuthorAvatarGroup } from "@/components/blog/author-meta"
import type { Post } from "@/lib/blog"
import { formatAuthorNames } from "@/lib/blog/authors"
import { getCategory } from "@/lib/blog/categories"
import { formatPostDateShort } from "@/lib/blog/format"

// Öne çıkan kart (Vercel blog öne çıkan kartı esinli): kart yüzeyi, tarih +
// kategori, büyük başlık, altta açıklama + yazar. Index'in üst sırasında.
export function FeaturedPostCard({ post }: { post: Post }) {
  const category = getCategory(post.category)
  return (
    <Link
      href={post.permalink}
      className="group flex min-h-[20rem] flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20"
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
    </Link>
  )
}
