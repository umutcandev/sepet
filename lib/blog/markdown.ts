// Bir yazıyı LLM'ler ve "düz metin görüntüle" için temiz Markdown'a çevirir.
// Hem yazı sayfasındaki "Makaleyi kopyala" düğmesi (prop olarak) hem de
// /blog/[slug]/markdown route'u tek bu kaynaktan beslenir.
import type { Post } from "@/lib/blog"
import { absoluteUrl } from "@/lib/site"

// MDX gövdesindeki JSX bileşenlerini (örn. <Callout variant="warning">…</Callout>)
// ve import/export satırlarını ayıklar; içlerindeki düz metni korur. Büyük harfle
// başlayan etiketler bileşen sayılır, böylece <https://…> autolink'leri ve normal
// HTML'e dokunulmaz.
function stripMdx(body: string): string {
  return body
    .replace(/^(?:import|export)\s.*$/gm, "")
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
