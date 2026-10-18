import { COVER_SIZE, coverUrl, type CoverSource } from "@/lib/blog/cover"
import type { Post } from "@/lib/blog"
import { cn } from "@/lib/utils"

// Yazının üretilen op-art kapağı (bkz. lib/blog/cover). Ayrı bir SVG dosyası:
// sayfa kapağı bir kez indirir ve önbellekten kullanır. Dekoratif; başlık hemen
// yanında olduğu için alt metni boş.
export function PostCover({
  post,
  priority = false,
  className,
}: {
  post: CoverSource & Pick<Post, "permalink">
  /** Yazı başlığındaki kapak sayfanın en büyük görseli: hemen yüklensin. */
  priority?: boolean
  className?: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={coverUrl(post)}
      alt=""
      width={COVER_SIZE.width}
      height={COVER_SIZE.height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={cn("aspect-video w-full rounded-lg object-cover", className)}
    />
  )
}
