// Rich Snippet uyumlu JSON-LD üreticileri. Tek kaynak; sayfalar <JsonLd> ile
// XSS-safe enjekte eder (bkz. components/blog/json-ld.tsx).
import type { Post } from "@/.velite"
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, SITE_X, absoluteUrl } from "@/lib/site"

import { getAuthor } from "./authors"
import { getCategory } from "./categories"

const ORG_ID = absoluteUrl("/#organization")
const WEBSITE_ID = absoluteUrl("/#website")

// Organization ve WebSite düğümleri TEK bir @graph içinde yayımlanır (bkz.
// siteGraphLd). Bu yüzden ikisi de kendi "@context"ini taşımaz — bağlam
// sarmalayıcıda bir kez verilir.
function organizationNode() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/brand/sepet-light.svg"),
    },
    sameAs: [SITE_X],
  }
}

function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    inLanguage: "tr-TR",
    publisher: { "@id": ORG_ID },
  }
}

/**
 * Site geneli kimlik grafiği (kök layout'ta bir kez basılır).
 *
 * Düğümler ÇIPLAK BİR DİZİ olarak değil `@graph` altında verilir: iki biçim de
 * JSON-LD'ye göre geçerli, ama üst seviyesi dizi olan belgede tüketicinin
 * `@type`/`name` gibi alanları okumak için önce diziyi dolaşması gerekir.
 * Pratikte birçok ayrıştırıcı (arama motoru zenginleştiricileri, ajan
 * tarayıcıları) üst seviyede tek bir nesne bekleyip alanları bulamadan
 * "eksik" raporluyor. `@graph` bu belirsizliği ortadan kaldırır ve @id
 * referansları (publisher → ORG_ID) aynı belge içinde çözülebilir kalır.
 */
export function siteGraphLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationNode(), websiteNode()],
  }
}

function ogImageFor(post: Post) {
  return {
    "@type": "ImageObject",
    url: absoluteUrl(`${post.permalink}/opengraph-image`),
    width: 1200,
    height: 630,
  }
}

export function blogPostingLd(post: Post) {
  const url = absoluteUrl(post.permalink)
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: ogImageFor(post),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    // Ayrı yazar sayfası olmadığından url + sameAs doğrudan X profiline işaret
    // eder; Google bunu yazar entity'si için kullanır (E-E-A-T, YMYL sinyali).
    author: post.authors.map((id) => {
      const author = getAuthor(id)
      return {
        "@type": "Person",
        name: author.name,
        url: author.x,
        sameAs: [author.x],
      }
    }),
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    articleSection: getCategory(post.category).label,
    keywords: post.tags.join(", "),
    inLanguage: "tr-TR",
  }
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  }
}

export function blogLd(posts: Post[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": absoluteUrl("/blog#blog"),
    name: `${SITE_NAME} Blog`,
    description:
      "Sepet'in tekniği, sağlık ve ikisinin kesiştiği yer üzerine yazılar.",
    url: absoluteUrl("/blog"),
    inLanguage: "tr-TR",
    publisher: { "@id": ORG_ID },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: absoluteUrl(post.permalink),
      datePublished: post.publishedAt,
      dateModified: post.updatedAt ?? post.publishedAt,
    })),
  }
}
