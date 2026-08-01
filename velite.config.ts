import { defineConfig, s } from "velite"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypePrettyCode from "rehype-pretty-code"
import rehypeSlug from "rehype-slug"
import remarkGfm from "remark-gfm"

import { AUTHOR_IDS } from "./lib/blog/authors"
import { CATEGORY_IDS } from "./lib/blog/categories"
import { codeThemeDark, codeThemeLight } from "./lib/blog/code-theme"

// İçerik katmanı: content/blog/*.mdx → typed veri (.velite/). Tümü build-time
// çalışır; runtime'a yük binmez. readingTime/toc/derlenmiş MDX otomatik eklenir.
const posts = {
  name: "Post",
  // Yalnız düz dosyalar (content/blog/*.mdx). Alt klasör KULLANILMAZ: slug tek
  // segmentli `app/blog/[slug]` rotasına gider; iç içe yol slug'a "/" katıp
  // rotayı bozardı. Glob'u düz tutmak bu sözleşmeyi zorunlu kılar.
  pattern: "blog/*.mdx",
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
          // Çift tema: token'lar `--shiki-light` / `--shiki-dark` özel
          // değişkenleri olarak yazılır, rengi globals.css seçer. Temalar
          // sitenin paletinden türetilmiştir (lib/blog/code-theme.ts).
          theme: { light: codeThemeLight, dark: codeThemeDark },
          // Zemin figürün kendi `--code-surface`ından gelir.
          keepBackground: false,
          // Dilsiz ``` blokları da satır yapısı ve gutter kazansın.
          defaultLang: { block: "plaintext" },
        },
      ],
    ],
  },
})
