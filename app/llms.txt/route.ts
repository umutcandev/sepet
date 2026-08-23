import { getAllPosts } from "@/lib/blog"
import { buildLlmsTxt } from "@/lib/llms"

// /llms.txt — robots.ts ve sitemap.ts ile aynı duruş: statik dosya yerine
// koddan üretilir ki host (SITE_URL) ve yazı listesi tek kaynaktan gelsin.
// İçerik build zamanında sabitlenir (velite yazıları), bu yüzden prerender.
export const dynamic = "force-static"

export function GET() {
  const body = buildLlmsTxt(
    getAllPosts().map((post) => ({
      title: post.title,
      description: post.description,
      permalink: post.permalink,
    })),
  )

  return new Response(body, {
    headers: {
      // llms.txt markdown'dır. charset açıkça verilir: dosya Türkçe karakter
      // içeriyor ve text/* için varsayılan latin-1 varsayan istemciler var.
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  })
}
