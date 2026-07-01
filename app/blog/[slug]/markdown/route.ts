import { notFound } from "next/navigation"

import { getAllPosts, getPostBySlug } from "@/lib/blog"
import { postToMarkdown } from "@/lib/blog/markdown"

// Yazının ham Markdown'ı (düz metin). "Markdown olarak görüntüle" bunu yeni
// sekmede açar; "ChatGPT/Claude'da aç" ise asistanın okuması için bu URL'i verir.
// Yazılar derleme zamanında statik üretildiğinden bu route da statiktir.
export const dynamic = "force-static"

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  return new Response(postToMarkdown(post), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}
