import type { Metadata } from "next"

import { BlogToolbar } from "@/components/blog/blog-toolbar"
import { FeaturedPostCard } from "@/components/blog/featured-post-card"
import { JsonLd } from "@/components/blog/json-ld"
import { PostCard } from "@/components/blog/post-card"
import {
  getAllPosts,
  getFeaturedPosts,
  getPostsByCategory,
  getSearchDocs,
} from "@/lib/blog"
import { isCategoryId, type CategoryId } from "@/lib/blog/categories"
import { blogLd, breadcrumbLd } from "@/lib/blog/jsonld"

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Sepet'in tekniği, sağlık ve ikisinin kesiştiği yer üzerine yazılar. Mühendislik günlüğünden hareket sağlığına, bütçeyle sağlıklı yaşamdan akıllı alışverişe.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    url: "/blog",
    title: "Sepet Blog",
    description:
      "Sepet'in tekniği, sağlık ve ikisinin kesiştiği yer üzerine yazılar.",
  },
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>
}) {
  const { kategori } = await searchParams
  const active: CategoryId | undefined =
    kategori && isCategoryId(kategori) ? kategori : undefined

  const allPosts = getAllPosts()
  const featured = active ? [] : getFeaturedPosts(3)
  const featuredSlugs = new Set(featured.map((post) => post.slug))
  const gridPosts = active
    ? getPostsByCategory(active)
    : allPosts.filter((post) => !featuredSlugs.has(post.slug))

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <JsonLd
        data={[
          blogLd(allPosts),
          breadcrumbLd([
            { name: "Ana sayfa", url: "/" },
            { name: "Blog", url: "/blog" },
          ]),
        ]}
      />

      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
        <p className="text-sm text-muted-foreground">
          Sepet&apos;in tekniği, sağlıklı yaşam ve ikisinin kesiştiği yer
          üzerine yazdıklarımız.
        </p>
      </div>

      <div className="mb-10">
        <BlogToolbar active={active} docs={getSearchDocs()} />
      </div>

      {featured.length > 0 ? (
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((post) => (
            <FeaturedPostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : null}

      {gridPosts.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {gridPosts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Bu kategoride henüz yazı yok.
        </p>
      )}
    </div>
  )
}
