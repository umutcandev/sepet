"use client"

import * as React from "react"
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiClaudeFill,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiFileTextLine,
  RiGeminiFill,
  RiGrokAiFill,
  RiLinkedinFill,
  RiLinksLine,
  RiOpenaiFill,
  RiTwitterXFill,
  RiWhatsappFill,
  type RemixiconComponentType,
} from "@remixicon/react"
import { toast } from "@/components/ui/sonner"
import { getAssistantLinks, type AssistantLink } from "@/lib/ai-assistants"
import { copyText } from "@/lib/copy"

import { IconSwap } from "@/components/motion/icon-swap"
import { useRotation } from "@/components/motion/rolling-text"
import { TypewriterText } from "@/components/motion/typewriter-text"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"


/**
 * Kopyalama geri bildirimi için ikon takası. Geçişin kendisi `IconSwap`'ta
 * (components/motion/icon-swap.tsx) — aynı fizik daraltılmış kenar çubuğunda
 * logo → anahtar takasında da kullanılıyor, iki yerde ayrı ayrı yaşamasın.
 */
export function CopiedIconSwap({
  copied,
  idleIcon: IdleIcon,
  className,
  copiedClassName,
}: {
  copied: boolean
  idleIcon: RemixiconComponentType
  className?: string
  copiedClassName?: string
}) {
  return (
    <IconSwap swapKey={copied ? "copied" : "idle"}>
      {copied ? (
        <RiCheckLine className={cn(className, copiedClassName)} />
      ) : (
        <IdleIcon className={className} />
      )}
    </IconSwap>
  )
}

export type ShareTarget = {
  label: string
  href: string
  icon: RemixiconComponentType
}

// Sosyal paylaşım hedeflerini üretir. Masaüstü (ikon satırı) ve mobil (drawer)
// görünümleri aynı listeyi kullansın diye dışarı veriliyor.
export function getShareTargets(url: string, title: string): ShareTarget[] {
  const text = encodeURIComponent(title)
  const link = encodeURIComponent(url)
  return [
    { label: "X'te paylaş", icon: RiTwitterXFill, href: `https://twitter.com/intent/tweet?text=${text}&url=${link}` },
    { label: "LinkedIn'de paylaş", icon: RiLinkedinFill, href: `https://www.linkedin.com/sharing/share-offsite/?url=${link}` },
    { label: "WhatsApp'ta paylaş", icon: RiWhatsappFill, href: `https://wa.me/?text=${text}%20${link}` },
  ]
}

// Temiz metni okuyabilmeleri için sayfa yerine Markdown URL'i veriliyor.
function getArticleAssistantLinks(title: string, markdownUrl: string) {
  return getAssistantLinks(
    `"${title}" başlıklı bu makaleyi oku, ardından hakkında sorularımı yanıtla:\n${markdownUrl}`
  )
}

function SocialShare({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = React.useState(false)
  const targets = getShareTargets(url, title)

  const handleCopyLink = async () => {
    const ok = await copyText(url)
    if (!ok) return toast.error("Bağlantı kopyalanamadı")
    setCopied(true)
    toast.success("Bağlantı kopyalandı")
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        Paylaş
      </p>
      {/* Görünen kutular 28px kalıyor; dokunma hedefi pseudo-element ile 40px'e
          çıkıyor. Aradaki boşluk bu yüzden 12px: 6px'lik iki genişletme tam
          değiyor, üst üste binmiyor (binen hedefler yanlış butonu tetikler). */}
      <div className="flex items-center gap-3">
        {targets.map((target) => (
          <Button
            key={target.label}
            asChild
            variant="outline"
            size="icon-sm"
            aria-label={target.label}
            title={target.label}
            hitArea
          >
            <a href={target.href} target="_blank" rel="noopener noreferrer">
              <target.icon className="size-3.5" />
            </a>
          </Button>
        ))}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={handleCopyLink}
          aria-label="Bağlantıyı kopyala"
          title="Bağlantıyı kopyala"
          hitArea
        >
          <CopiedIconSwap
            copied={copied}
            idleIcon={RiLinksLine}
            className="size-3.5"
            copiedClassName="text-emerald-600 dark:text-emerald-500"
          />
        </Button>
      </div>
    </div>
  )
}

// Açılır menü öğesi: solda ikon, sağında iki satırlık başlık + açıklama. Dış
// bağlantılar için sağ üstte küçük bir "yeni sekme" simgesi gösterilir.
export function ActionItemContent({
  icon: Icon,
  title,
  description,
  external,
}: {
  icon: RemixiconComponentType
  title: string
  description: string
  external?: boolean
}) {
  return (
    <>
      <Icon className="mt-0.5 size-4 shrink-0 self-start" />
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1 font-medium text-foreground">
          {title}
          {external ? (
            <RiExternalLinkLine className="size-3 text-muted-foreground" />
          ) : null}
        </span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </>
  )
}

// Düğmede sırayla dönen etiketler; menüdeki seçenekleri tanıtır.
const COPY_LABELS = [
  { key: "copy", text: "Makaleyi kopyala", icon: RiFileCopyLine },
  { key: "chatgpt", text: "ChatGPT ile yorumla", icon: RiOpenaiFill },
  { key: "claude", text: "Claude ile yorumla", icon: RiClaudeFill },
  { key: "gemini", text: "Gemini ile yorumla", icon: RiGeminiFill },
  { key: "grok", text: "Grok ile yorumla", icon: RiGrokAiFill },
  { key: "markdown", text: "Markdown'ı görüntüle", icon: RiFileTextLine },
]
const COPY_TEXTS = COPY_LABELS.map((label) => label.text)
const COPY_LABEL_INTERVAL = 3200

// "Makaleyi kopyala" bölünmüş düğmesi. Sözleşmeler menüsüyle (ContractsMenu) aynı
// kalıpta çalışır: tüm düğme açılır menüyü tetikler. İlk öğe makaleyi LLM'ler için
// Markdown olarak panoya kopyalar; diğerleri düz metni açar ya da asistanlara verir.
function CopyArticleMenu({
  markdown,
  markdownUrl,
  title,
}: {
  markdown: string
  markdownUrl: string
  title: string
}) {
  const [open, setOpen] = React.useState(false)
  const [index] = useRotation(COPY_LABELS.length, !open, COPY_LABEL_INTERVAL)
  const { key, icon: Icon } = COPY_LABELS[index]

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        KOPYALA
      </p>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            aria-label="Makaleyi kopyala veya bir asistanla aç"
            className="w-fit gap-0 px-0"
          >
            <span className="flex items-center gap-1.5 pr-2 pl-2.5">
              <IconSwap swapKey={key}>
                <Icon className="size-3.5" />
              </IconSwap>
              <TypewriterText texts={COPY_TEXTS} index={index} />
            </span>
            <span className="flex items-center self-stretch border-l border-border px-1.5">
              <RiArrowDownSLine className="size-3.5 transition-transform group-aria-expanded/button:rotate-180" />
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <CopyArticleMenuItems
            markdown={markdown}
            markdownUrl={markdownUrl}
            title={title}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// Bulunma eki ünlü uyumuna göre: ChatGPT'de, Claude'da, Grok'ta.
const OPEN_SUFFIX: Record<AssistantLink["key"], string> = {
  chatgpt: "de aç",
  claude: "da aç",
  gemini: "de aç",
  grok: "ta aç",
}

// "Makaleyi kopyala" menüsünün öğeleri. Masaüstü split-button menüsü ile mobil
// satırdaki açılır menü aynı listeyi paylaşsın diye ayrı tutuldu.
export function CopyArticleMenuItems({
  markdown,
  markdownUrl,
  title,
}: {
  markdown: string
  markdownUrl: string
  title: string
}) {
  const handleCopyArticle = async (event: Event) => {
    // Menü kapanırken kopyalama kullanıcı hareketi içinde kalsın diye varsayılanı
    // engellemiyoruz; clipboard yazımı select anında yapılır.
    void event
    const ok = await copyText(markdown)
    toast[ok ? "success" : "error"](
      ok ? "Makale kopyalandı" : "Makale kopyalanamadı",
    )
  }

  const assistants = getArticleAssistantLinks(title, markdownUrl)

  return (
    <>
      <DropdownMenuItem className="items-start gap-2 py-1.5" onSelect={handleCopyArticle}>
        <ActionItemContent
          icon={RiFileCopyLine}
          title="Makaleyi kopyala"
          description="LLM'ler için Markdown olarak kopyala"
        />
      </DropdownMenuItem>
      <DropdownMenuItem className="items-start gap-2 py-1.5" asChild>
        <a href={markdownUrl} target="_blank" rel="noopener noreferrer">
          <ActionItemContent
            icon={RiFileTextLine}
            title="Markdown olarak görüntüle"
            description="Bu makaleyi düz metin olarak aç"
            external
          />
        </a>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      {assistants.map((assistant) => (
        <DropdownMenuItem key={assistant.key} className="items-start gap-2 py-1.5" asChild>
          <a href={assistant.href} target="_blank" rel="noopener noreferrer">
            <ActionItemContent
              icon={assistant.icon}
              title={`${assistant.name}'${OPEN_SUFFIX[assistant.key]}`}
              description="Makale hakkında soru sor"
              external
            />
          </a>
        </DropdownMenuItem>
      ))}
    </>
  )
}

// Yazı kenar çubuğunda İçindekiler'in altına gelen eylemler: sosyal paylaşım ve
// "Makaleyi kopyala" menüsü.
export function ArticleActions({
  markdown,
  markdownUrl,
  pageUrl,
  title,
  className,
}: {
  markdown: string
  markdownUrl: string
  pageUrl: string
  title: string
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <SocialShare url={pageUrl} title={title} />
      <CopyArticleMenu markdown={markdown} markdownUrl={markdownUrl} title={title} />
    </div>
  )
}

// `copyText` lib/copy.ts'e taşındı; buradan yeniden dışa aktarılıyor ki
// mevcut import'lar (ör. blog/mdx-content) kırılmasın.
export { copyText }
