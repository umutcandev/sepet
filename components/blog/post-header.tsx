import { AuthorAvatarGroup, AuthorNameLinks } from "@/components/blog/author-meta"
import type { Post } from "@/lib/blog"

// Yazı başlığı bloğu: başlık, açıklama, yazar avatar-group + X profiline giden
// ad linkleri ve okuma süresi. Yazar satırı üstteki breadcrumb satırıyla aynı
// büyük harfli üslupta; yazarın rolü burada gösterilmez (authors.ts'te durur,
// yazar kutusu ve paylaşım görseli kullanır). Kategori ve tarih breadcrumb
// satırında, kapak ise ayraçtan sonra içeriğin başında (bkz.
// app/blog/[slug]/page.tsx). `actions` yazar satırının en sağına oturur
// (mobilde Kopyala ve Paylaş).
export function PostHeader({
  post,
  actions,
}: {
  post: Post
  actions?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-5">
      {/* Ana sayfa başlıklarıyla aynı vitrin yüzü (Cooper). Ailede yalnız 400
          kayıtlı (font-normal); sıkılık cn-font-display'in kendisinden gelir. */}
      <h1
        data-post-title
        className="cn-font-display text-3xl font-normal text-balance text-foreground md:text-4xl">
        {post.title}
      </h1>

      <p className="text-base leading-relaxed text-muted-foreground">
        {post.description}
      </p>

      <div className="flex items-center gap-3 pt-1">
        <AuthorAvatarGroup authors={post.authors} size="sm" />
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium tracking-wider uppercase">
          <AuthorNameLinks authors={post.authors} />
          <span aria-hidden className="text-muted-foreground/50">
            ·
          </span>
          <span className="text-muted-foreground/70">
            {post.metadata.readingTime} dk okuma
          </span>
        </div>
        {actions ? <div className="ml-auto shrink-0">{actions}</div> : null}
      </div>
    </header>
  )
}
