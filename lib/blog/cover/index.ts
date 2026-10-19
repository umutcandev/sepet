// Blog kapakları: yazının slug + kategori (+ isteğe bağlı frontmatter ayarları)
// → op-art SVG. Motor saf ve deterministik (covergen.ts); burada yalnız yazıya
// bağlama, kapağın adresi ve aynı kapağı yeniden hesaplamayı önleyen önbellek
// var.
import type { Post } from "@/lib/blog"

import { COVER_SIZE, design, hash32, render, type CoverSpec } from "./covergen"

export { COVER_SIZE }

export type CoverSource = Pick<
  Post,
  "slug" | "category" | "coverVariant" | "coverMotif" | "coverPolarity"
>

export type CoverSize = { readonly width: number; readonly height: number }

// Girdi küçük ve sabit (yazı sayısı × boyut); süreç ömrünce tutmak güvenli.
const cache = new Map<string, { spec: CoverSpec; svg: string }>()

export function getPostCover(post: CoverSource, size: CoverSize = COVER_SIZE) {
  const key = [
    post.slug,
    post.category,
    post.coverVariant ?? 0,
    post.coverMotif ?? "",
    post.coverPolarity ?? "auto",
    size.width,
    size.height,
  ].join(":")
  let cover = cache.get(key)
  if (!cover) {
    const spec = design(post.slug, post.category, {
      width: size.width,
      height: size.height,
      variant: post.coverVariant,
      motif: post.coverMotif,
      polarity: post.coverPolarity,
    })
    cover = { spec, svg: render(spec) }
    cache.set(key, cover)
  }
  return cover
}

/**
 * Kapak dosyasının adresi (app/blog/[slug]/kapak.svg). Sorgudaki içerik
 * hash'i, kapak değişince adresi de değiştirir; dosya bir yıl önbelleklenir.
 */
export function coverUrl(post: CoverSource & Pick<Post, "permalink">) {
  const version = hash32(getPostCover(post).svg).toString(36)
  return `${post.permalink}/kapak.svg?v=${version}`
}
