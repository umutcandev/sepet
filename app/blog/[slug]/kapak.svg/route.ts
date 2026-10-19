import { notFound } from "next/navigation"

import { getAllPosts, getPostBySlug } from "@/lib/blog"
import { getPostCover } from "@/lib/blog/cover"

// Yazının üretilen kapağı, ayrı bir SVG dosyası olarak. Kart ve yazı başlığı
// bunu <img> ile gösterir: satır içi SVG hem HTML'e hem RSC yüküne giriyor,
// liste sayfasının yarısından fazlasını kapaklar tutuyordu. Dosya olarak bir
// kez iner ve tarayıcıda önbellekte kalır. Yazılarla birlikte statik üretilir.
export const dynamic = "force-static"
export const dynamicParams = false

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  return new Response(getPostCover(post).svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Bağlantı içerik hash'ini taşıyor (?v=, bkz. coverUrl); kapak
      // değişince adres de değişir, eski kopya önbellekte bayat kalmaz.
      "Cache-Control": "public, max-age=31536000, immutable",
      // Adres doğrudan açılırsa SVG belge olarak çalışmasın.
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
