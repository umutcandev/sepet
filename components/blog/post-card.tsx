import Link from "next/link"

import { AuthorAvatarGroup } from "@/components/blog/author-meta"
import type { Post } from "@/lib/blog"
import { formatAuthorNames } from "@/lib/blog/authors"
import { getCategory } from "@/lib/blog/categories"
import { formatPostDateShort } from "@/lib/blog/format"
import { cn } from "@/lib/utils"

// Index grid + ilgili yazılar kartı (Vercel blog grid kartı esinli): tarih +
// kategori, başlık, altta yazar avatar-group + ad(lar). Kartın tamamı linktir;
// yazar adları burada düz metindir (iç içe <a> olmasın diye X linkleri yalnız
// yazı başlığında ve yazar kutusunda).
export function PostCard({
  post,
  className,
}: {
  post: Post
  className?: string
}) {
  const category = getCategory(post.category)
  return (
    <Link
      href={post.permalink}
      className={cn(
        "group flex h-full flex-col gap-3.5 rounded-lg p-1",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <time dateTime={post.publishedAt} className="text-foreground">
          {formatPostDateShort(post.publishedAt)}
        </time>
        <span className="text-muted-foreground">{category.label}</span>
      </div>
      <h3 className="text-xl font-medium tracking-tight text-balance text-foreground transition-colors group-hover:text-primary">
        {post.title}
      </h3>
      <div className="mt-auto flex items-center gap-2 pt-1">
        <AuthorAvatarGroup authors={post.authors} size="sm" />
        <span className="text-sm text-muted-foreground">
          {formatAuthorNames(post.authors)}
        </span>
      </div>
    </Link>
  )
}
