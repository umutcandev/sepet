import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ArticleActions } from "@/components/blog/article-actions"
import { ArticleToc } from "@/components/blog/article-toc"
import { JsonLd } from "@/components/blog/json-ld"
import { MdxContent } from "@/components/blog/mdx-content"
import { MobileArticleActions } from "@/components/blog/mobile-article-actions"
import { PostCover } from "@/components/blog/post-cover"
import { PostHeader } from "@/components/blog/post-header"
import { RelatedPosts } from "@/components/blog/related-posts"
import { TableOfContents } from "@/components/blog/table-of-contents"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { getAllPosts, getPostBySlug, getRelatedPosts } from "@/lib/blog"
import { getAuthor } from "@/lib/blog/authors"
import { getCategory } from "@/lib/blog/categories"
import { formatPostDate } from "@/lib/blog/format"
import { blogPostingLd, breadcrumbLd } from "@/lib/blog/jsonld"
import { postToMarkdown } from "@/lib/blog/markdown"
import { absoluteUrl } from "@/lib/site"

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: post.permalink },
    openGraph: {
      type: "article",
      url: post.permalink,
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      authors: post.authors.map((id) => getAuthor(id).name),
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
    // OG/Twitter görseli opengraph-image.tsx ile otomatik eklenir.
    robots: post.draft ? { index: false, follow: false } : undefined,
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const category = getCategory(post.category)
  const related = getRelatedPosts(post, 2)
  const pageUrl = absoluteUrl(post.permalink)
  const markdownUrl = absoluteUrl(`${post.permalink}/markdown`)
  const markdown = postToMarkdown(post)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:py-10">
      <JsonLd
        data={[
          blogPostingLd(post),
          breadcrumbLd([
            { name: "Ana sayfa", url: "/" },
            { name: "Blog", url: "/blog" },
            { name: category.label, url: `/blog?kategori=${category.slug}` },
            { name: post.title, url: post.permalink },
          ]),
        ]}
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-12 xl:gap-16">
        <article className="min-w-0 max-w-2xl">
          {/* Üst satır: solda Blog › kategori, sağda tarih; ikisi de büyük harf.
              Yazının adı zaten hemen altındaki başlıkta. */}
          <div className="mb-6 flex items-center justify-between gap-4 text-xs font-medium tracking-wider uppercase">
            <Breadcrumb>
              <BreadcrumbList className="flex-nowrap text-xs">
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/blog">Blog</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink
                    asChild
                    className="text-primary hover:text-primary/80"
                  >
                    <Link href={`/blog?kategori=${category.slug}`}>
                      {category.label}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <time
              dateTime={post.publishedAt}
              className="shrink-0 text-muted-foreground"
            >
              {formatPostDate(post.publishedAt)}
            </time>
          </div>

          {/* Mobilde Kopyala ve Paylaş yazar satırının sağında; masaüstünde
              kenar çubuğu kullanıldığı için gizli (lg:hidden bileşen içinde). */}
          <PostHeader
            post={post}
            actions={
              <MobileArticleActions
                markdown={markdown}
                markdownUrl={markdownUrl}
                pageUrl={pageUrl}
                title={post.title}
              />
            }
          />

          <Separator className="my-8" />

          {/* Kapak içeriğin başında, ayraçtan hemen sonra. Sayfanın en büyük
              görseli olduğu için hemen yüklenir. */}
          <PostCover post={post} priority className="mb-8" />

          {/* Mobilde içindekiler metnin başında bir blok; masaüstünde kenar
              çubuğunda (lg:hidden bileşen içinde). */}
          <ArticleToc toc={post.toc} className="mb-8" />

          <div className="prose max-w-none">
            <MdxContent code={post.content} />
          </div>

          {related.length > 0 ? (
            <div className="mt-16">
              <RelatedPosts posts={related} />
            </div>
          ) : null}
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-6 flex flex-col gap-6">
            <TableOfContents toc={post.toc} />
            <ArticleActions
              markdown={markdown}
              markdownUrl={markdownUrl}
              pageUrl={pageUrl}
              title={post.title}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
