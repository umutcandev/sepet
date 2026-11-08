import { CompactPostCard } from "@/components/blog/compact-post-card"
import type { Post } from "@/lib/blog"

export function RelatedPosts({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null
  return (
    <section className="not-prose">
      <h2 className="mb-5 text-sm font-medium tracking-wide text-muted-foreground uppercase">
        İlgili yazılar
      </h2>
      <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2">
        {posts.map((post) => (
          <CompactPostCard key={post.slug} post={post} />
        ))}
      </div>
    </section>
  )
}
