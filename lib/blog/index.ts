// Blog veri erişim katmanı. Velite çıktısını (.velite) okur, draft filtreler ve
// sıralar. Tüm sayfalar bu yardımcılardan beslenir.
//
// .velite, velite build ile üretilir (next.config dev/build'de otomatik çağırır;
// elle: `pnpm exec velite build`). Üretilmeden tip/derleme hatası beklenir.
import { posts as allPosts, type Post } from "@/.velite"

import { type AuthorId } from "@/lib/blog/authors"
import { CATEGORIES, type CategoryId } from "@/lib/blog/categories"
import { formatPostDateMedium } from "@/lib/blog/format"
import { type SearchDoc } from "@/lib/blog/search"

export type { Post }

// draft yazılar yalnız geliştirme ortamında görünür; prod'da (sitemap/RSS dâhil)
// tamamen gizlenir.
const showDrafts = process.env.NODE_ENV === "development"

function byNewest(a: Post, b: Post): number {
  return +new Date(b.publishedAt) - +new Date(a.publishedAt)
}

/** Yayınlanmış tüm yazılar, en yeniden eskiye. */
export function getAllPosts(): Post[] {
  return allPosts
    .filter((post) => showDrafts || !post.draft)
    .sort(byNewest)
}

export function getPostBySlug(slug: string): Post | undefined {
  return getAllPosts().find((post) => post.slug === slug)
}

/** Ana sayfa / "son yazılar" bölümü için en yeni n yazı. */
export function getLatestPosts(limit = 4): Post[] {
  return getAllPosts().slice(0, limit)
}

/** Index'te öne çıkan kartlar. */
export function getFeaturedPosts(limit = 3): Post[] {
  return getAllPosts()
    .filter((post) => post.featured)
    .slice(0, limit)
}

export function getPostsByCategory(category: CategoryId): Post[] {
  return getAllPosts().filter((post) => post.category === category)
}

export function getPostsByAuthor(author: AuthorId): Post[] {
  return getAllPosts().filter((post) => post.authors.includes(author))
}

/** Yazı sonu "ilgili yazılar": aynı kategori öncelikli, sonra ortak etiket. */
export function getRelatedPosts(post: Post, limit = 2): Post[] {
  const others = getAllPosts().filter((p) => p.slug !== post.slug)
  const scored = others
    .map((p) => {
      let score = p.category === post.category ? 2 : 0
      score += p.tags.filter((tag) => post.tags.includes(tag)).length
      return { post: p, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || byNewest(a.post, b.post))
  return scored.slice(0, limit).map((entry) => entry.post)
}

/**
 * İstemci arama bileşeni için hafif belge listesi. Post'un ağır alanları
 * (content/raw/toc) dışarıda bırakılır; yalnız eşleştirme + sonuç kartı için
 * gereken alanlar istemciye taşınır.
 */
export function getSearchDocs(): SearchDoc[] {
  return getAllPosts().map((post) => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    permalink: post.permalink,
    category: post.category,
    categoryLabel: CATEGORIES[post.category].label,
    dateLabel: formatPostDateMedium(post.publishedAt),
    publishedAt: post.publishedAt,
    tags: post.tags,
  }))
}

/** Index kategori sayımları (Tümü dâhil tab rozetleri için). */
export function getCategoryCounts(): Record<CategoryId, number> {
  const counts = {} as Record<CategoryId, number>
  for (const post of getAllPosts()) {
    counts[post.category] = (counts[post.category] ?? 0) + 1
  }
  return counts
}
