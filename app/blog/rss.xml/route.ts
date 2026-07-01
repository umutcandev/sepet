import { getAllPosts } from "@/lib/blog"
import { formatAuthorNames } from "@/lib/blog/authors"
import { getCategory } from "@/lib/blog/categories"
import { SITE_NAME, absoluteUrl } from "@/lib/site"

// RSS 2.0 akışı. Build-time statik üretilir; içerik değişince yeniden derlenir.
export const dynamic = "force-static"

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case "&":
        return "&amp;"
      case "'":
        return "&apos;"
      default:
        return "&quot;"
    }
  })
}

export function GET() {
  const posts = getAllPosts()
  const lastBuild = posts[0]
    ? new Date(posts[0].publishedAt).toUTCString()
    : new Date().toUTCString()

  const items = posts
    .map((post) => {
      // URL de XML metnine gömüldüğü için kaçırılır (slug'da & vb. çıkarsa
      // akışı bozmasın); absoluteUrl normalde güvenli üretir, bu ek güvence.
      const link = escapeXml(absoluteUrl(post.permalink))
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(post.description)}</description>
      <dc:creator>${escapeXml(formatAuthorNames(post.authors))}</dc:creator>
      <category>${escapeXml(getCategory(post.category).label)}</category>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
    </item>`
    })
    .join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME} Blog</title>
    <link>${absoluteUrl("/blog")}</link>
    <description>Fizyoterapi &amp; rehabilitasyon ve Sepet'in tekniği üzerine yazılar.</description>
    <language>tr-TR</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${absoluteUrl("/blog/rss.xml")}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
