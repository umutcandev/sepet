// Bir yazıyı LLM'ler ve "düz metin görüntüle" için temiz Markdown'a çevirir.
// Hem yazı sayfasındaki "Makaleyi kopyala" düğmesi (prop olarak) hem de
// /blog/[slug]/markdown route'u tek bu kaynaktan beslenir.
import type { Post } from "@/lib/blog"
import { absoluteUrl } from "@/lib/site"

// Kaydırmalı bloktaki görsel: <Slide src alt>alt yazı</Slide> ya da kendini
// kapatan <Slide src alt />. Öznitelik değeri çift ya da tek tırnaklı olabilir
// ve içinde ">" geçebilir; bu yüzden etiket öznitelik öznitelik eşleşir.
const SLIDE =
  /<Slide((?:\s+[\w-]+=(?:"[^"]*"|'[^']*'))*)\s*(?:\/>|>([\s\S]*?)<\/Slide>)/g
// Önce/sonra bloğu: Markdown'da iki görsel art arda iner.
const COMPARE =
  /<Compare((?:\s+[\w-]+=(?:"[^"]*"|'[^']*'))*)\s*(?:\/>|>([\s\S]*?)<\/Compare>)/g
const ATTR = /([\w-]+)=(?:"([^"]*)"|'([^']*)')/g

function attrsOf(attrs: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const [, name, double, single] of attrs.matchAll(ATTR))
    values[name] = double ?? single
  return values
}

const imageMd = (src: string, alt = "") =>
  `![${alt.replace(/[[\]\\]/g, (c) => `\\${c}`)}](${absoluteUrl(src)})`

function compareToMarkdown(attrs: string, caption = ""): string {
  const v = attrsOf(attrs)
  const text = caption.trim()
  const images = [
    v.before ? `Önce: ${imageMd(v.before, v.beforeAlt)}` : "",
    v.after ? `Sonra: ${imageMd(v.after, v.afterAlt)}` : "",
  ].filter(Boolean)
  return [...images, text].filter(Boolean).join("\n") + "\n"
}

function slideToMarkdown(attrs: string, caption = ""): string {
  const values = attrsOf(attrs)
  const text = caption.trim()
  // Kaynaksız görsel üretilmez; absoluteUrl("") site kökünü görsel sanardı.
  if (!values.src) return text ? `${text}\n` : ""
  const image = imageMd(values.src, values.alt)
  return text ? `${image}\n${text}\n` : `${image}\n`
}

/**
 * MDX gövdesindeki JSX bileşenlerini (örn. <Callout variant="warning">…</Callout>)
 * ve import/export satırlarını ayıklar; içlerindeki düz metni korur. Slide
 * ve Compare görselleri Markdown görseline iner. Büyük harfle başlayan etiketler bileşen
 * sayılır, böylece <https://…> autolink'leri ve normal HTML'e dokunulmaz.
 */
export function stripMdx(body: string): string {
  return body
    .replace(/^(?:import|export)\s.*$/gm, "")
    .replace(SLIDE, (_, attrs: string, caption?: string) =>
      slideToMarkdown(attrs, caption)
    )
    .replace(COMPARE, (_, attrs: string, caption?: string) =>
      compareToMarkdown(attrs, caption)
    )
    .replace(/<\/?[A-Z][A-Za-z0-9]*(?:\s[^>]*?)?\/?>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Yazıyı başlık + kaynak başlığı olan temiz bir Markdown belgesine dönüştürür. */
export function postToMarkdown(post: Post): string {
  const source = absoluteUrl(post.permalink)
  return [
    `# ${post.title}`,
    "",
    `> ${post.description}`,
    "",
    `Kaynak: ${source}`,
    "",
    "---",
    "",
    stripMdx(post.raw),
    "",
  ].join("\n")
}
