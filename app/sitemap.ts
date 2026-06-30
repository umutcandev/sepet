import type { MetadataRoute } from "next"

import { getAllPosts } from "@/lib/blog"
import { absoluteUrl } from "@/lib/site"

// Tüm yayınlanmış yazılar + statik rotalar. draft yazılar getAllPosts'ta prod'da
// elendiği için sitemap dışında kalır.
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/blog"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/gizlilik"), changeFrequency: "yearly", priority: 0.3 },
    {
      url: absoluteUrl("/kullanim-sartlari"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/mesafeli-satis"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    { url: absoluteUrl("/iptal-iade"), changeFrequency: "yearly", priority: 0.3 },
  ]

  const posts: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: absoluteUrl(post.permalink),
    lastModified: post.updatedAt ?? post.publishedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }))

  return [...staticRoutes, ...posts]
}
