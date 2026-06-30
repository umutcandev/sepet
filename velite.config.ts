import { defineConfig, s } from "velite"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypePrettyCode from "rehype-pretty-code"
import rehypeSlug from "rehype-slug"
import remarkGfm from "remark-gfm"

import { AUTHOR_IDS } from "./lib/blog/authors"
import { CATEGORY_IDS } from "./lib/blog/categories"

// İçerik katmanı: content/blog/*.mdx → typed veri (.velite/). Tümü build-time
// çalışır; runtime'a yük binmez. readingTime/toc/derlenmiş MDX otomatik eklenir.
const posts = {
  name: "Post",
  pattern: "blog/**/*.mdx",
  schema: s
    .object({
      title: s.string().max(120),
      description: s.string().max(200),
      // slug dosya yolundan türetilir (örn. content/blog/foo.mdx → "foo").
      slug: s.path(),
      publishedAt: s.isodate(),
      updatedAt: s.isodate().optional(),
      authors: s.enum(AUTHOR_IDS).array().min(1).max(2),
      category: s.enum(CATEGORY_IDS),
      tags: s.array(s.string()).default([]),
      // cover boşsa next/og otomatik üretir; doluysa public altındaki görsel.
      cover: s.image().optional(),
      featured: s.boolean().default(false),
      draft: s.boolean().default(false),
      // Gövdeden türetilenler:
      metadata: s.metadata(), // { readingTime, wordCount }
      toc: s.toc(), // başlık ağacı (TOC için)
      content: s.mdx(), // derlenmiş MDX (function-body string)
      // Ham MDX gövdesi (frontmatter'sız). "Markdown olarak kopyala / görüntüle"
      // ve LLM'lere açma özelliği bundan beslenir; lib/blog/markdown.ts temizler.
      raw: s.raw(),
    })
    .transform((data) => {
      const slug = data.slug.replace(/^blog\/?/, "")
      return { ...data, slug, permalink: `/blog/${slug}` }
    }),
}

export default defineConfig({
  root: "content",
  collections: { posts },
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      // Başlık metni LİNK DEĞİL: anchor başlığın önüne (prepend) eklenir; CSS
      // ile yalnız hover'da, başlığın solunda küçük bir link simgesi olarak
      // belirir (bkz. globals.css .heading-anchor). Tıklayınca #id'ye gider.
      [
        rehypeAutolinkHeadings,
        {
          behavior: "prepend",
          properties: {
            className: ["heading-anchor"],
            ariaLabel: "Bu başlığa bağlantı",
            tabIndex: -1,
          },
          content: {
            type: "element",
            tagName: "span",
            properties: { className: ["heading-anchor-icon"], ariaHidden: "true" },
            children: [],
          },
        },
      ],
      [
        rehypePrettyCode,
        {
          // Çift tema: light/dark token'a CSS ile bağlanır (globals.css).
          theme: { light: "github-light", dark: "github-dark" },
          keepBackground: false,
        },
      ],
    ],
  },
})
