import Link from "next/link"

import { AuthorAvatarGroup } from "@/components/blog/author-meta"
import { PostCover } from "@/components/blog/post-cover"
import type { Post } from "@/lib/blog"
import { formatAuthorNames } from "@/lib/blog/authors"
import { getCategory } from "@/lib/blog/categories"
import { formatPostDateDayMonth } from "@/lib/blog/format"

// Ana sayfa blog bölümü ve ilgili yazılar kartı.
export function CompactPostCard({ post }: { post: Post }) {
  return (
    <Link
      href={post.permalink}
      className="group flex h-full flex-col rounded-lg"
    >
      <PostCover
        post={post}
        className="border border-hairline transition-opacity group-hover:opacity-90"
      />
      <h3 className="mt-4 text-lg/6 font-medium tracking-tight text-pretty text-foreground transition-colors group-hover:text-foreground/70">
        {post.title}
      </h3>
      {/* mt-auto: başlıklar farklı satır sayısında olsa da ayraçlar aynı hizada. */}
      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between gap-3 border-t border-hairline pt-3 text-xs font-medium tracking-wide uppercase">
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-muted-foreground">
              {getCategory(post.category).label}
            </span>
            <span aria-hidden className="text-muted-foreground">
              ·
            </span>
            <time dateTime={post.publishedAt} className="text-muted-foreground">
              {formatPostDateDayMonth(post.publishedAt)}
            </time>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <AuthorAvatarGroup
              authors={post.authors}
              size="xs"
              className="data-[size=xs]:size-4"
            />
            <span className="truncate text-muted-foreground">
              {formatAuthorNames(post.authors)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
