import Link from "next/link"

import { AuthorAvatarGroup, AuthorNameLinks } from "@/components/blog/author-meta"
import { Badge } from "@/components/ui/badge"
import type { Post } from "@/lib/blog"
import { getAuthor } from "@/lib/blog/authors"
import { getCategory } from "@/lib/blog/categories"
import { formatPostDate, formatPostDateShort } from "@/lib/blog/format"

// Yazı başlığı bloğu: kategori rozeti + tarih, başlık, açıklama, yazar
// avatar-group + X profiline giden ad linkleri. Yazar adının yanında rolü
// (soluk) ve onun yanında okuma süresi gösterilir.
export function PostHeader({ post }: { post: Post }) {
  const category = getCategory(post.category)
  // Rol yalnız tek yazarlı yazıda gösterilir; eş-yazarda roller karışmasın diye
  // atlanır, yerine doğrudan okuma süresine geçilir.
  const role =
    post.authors.length === 1 ? getAuthor(post.authors[0]).role : null

  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-muted-foreground">
        <Link href={`/blog?kategori=${category.slug}`}>
          <Badge variant="secondary" className="hover:bg-secondary/70">
            {category.label}
          </Badge>
        </Link>
        <time dateTime={post.publishedAt} className="lg:hidden">
          {formatPostDate(post.publishedAt)}
        </time>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground md:text-4xl">
        {post.title}
      </h1>

      <p className="text-base leading-relaxed text-muted-foreground">
        {post.description}
      </p>

      <div className="flex items-center gap-3 pt-1">
        <AuthorAvatarGroup authors={post.authors} size="sm" />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <AuthorNameLinks authors={post.authors} />
          {role ? (
            <span className="text-muted-foreground/70">{role}</span>
          ) : null}
          <span aria-hidden className="text-muted-foreground/50">
            ·
          </span>
          <time
            dateTime={post.publishedAt}
            className="hidden text-muted-foreground/70 lg:inline"
          >
            {formatPostDateShort(post.publishedAt)}
          </time>
          <span aria-hidden className="hidden text-muted-foreground/50 lg:inline">
            ·
          </span>
          <span className="text-muted-foreground/70">
            {post.metadata.readingTime} dk okuma
          </span>
        </div>
      </div>
    </header>
  )
}
