"use client"

import * as React from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileTextIcon,
  LinkIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  ChatGptLogo,
  ClaudeLogo,
  LinkedInLogo,
  WhatsAppLogo,
  XLogo,
} from "@/components/blog/brand-icons"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// Panoya kopyalama: güvenli bağlam yoksa (clipboard API yok) gizli bir textarea'ya
// düşer. Kullanıcı hareketi (tıklama) içinde çağrıldığı için her iki yol da çalışır.
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // textarea fallback'e düş
  }
  try {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

export type ShareTarget = {
  label: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

// Sosyal paylaşım hedeflerini üretir. Masaüstü (ikon satırı) ve mobil (drawer)
// görünümleri aynı listeyi kullansın diye dışarı veriliyor.
export function getShareTargets(url: string, title: string): ShareTarget[] {
  const text = encodeURIComponent(title)
  const link = encodeURIComponent(url)
  return [
    { label: "X'te paylaş", icon: XLogo, href: `https://twitter.com/intent/tweet?text=${text}&url=${link}` },
    { label: "LinkedIn'de paylaş", icon: LinkedInLogo, href: `https://www.linkedin.com/sharing/share-offsite/?url=${link}` },
    { label: "WhatsApp'ta paylaş", icon: WhatsAppLogo, href: `https://wa.me/?text=${text}%20${link}` },
  ]
}

// Asistanlara makaleyi okutan derin bağlantılar. Temiz metni okuyabilmeleri için
// sayfa yerine Markdown URL'ini veriyoruz.
export function getAssistantUrls(title: string, markdownUrl: string) {
  const prompt = `"${title}" başlıklı bu makaleyi oku, ardından hakkında sorularımı yanıtla:\n${markdownUrl}`
  return {
    chatGptUrl: `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
    claudeUrl: `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
  }
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
      <p className="text-xs font-medium tracking-wide text-muted-foreground">
        Paylaş
      </p>
      <div className="flex items-center gap-1.5">
        {targets.map((target) => (
          <Button
            key={target.label}
            asChild
            variant="outline"
            size="icon-sm"
            aria-label={target.label}
            title={target.label}
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
        >
          {copied ? (
            <CheckIcon className="size-3.5 text-emerald-600 dark:text-emerald-500" />
          ) : (
            <LinkIcon className="size-3.5" />
          )}
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
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
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
            <ExternalLinkIcon className="size-3 text-muted-foreground" />
          ) : null}
        </span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </>
  )
}

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between gap-0 px-0">
          <span className="flex items-center gap-1.5 pr-2 pl-2.5">
            <CopyIcon className="size-3.5" />
            Makaleyi Kopyala
          </span>
          <span className="flex items-center self-stretch border-l border-border px-1.5">
            <ChevronDownIcon className="size-3.5 transition-transform group-aria-expanded/button:rotate-180" />
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
  )
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

  const { chatGptUrl, claudeUrl } = getAssistantUrls(title, markdownUrl)

  return (
    <>
      <DropdownMenuItem className="items-start gap-2 py-1.5" onSelect={handleCopyArticle}>
        <ActionItemContent
          icon={CopyIcon}
          title="Makaleyi kopyala"
          description="LLM'ler için Markdown olarak kopyala"
        />
      </DropdownMenuItem>
      <DropdownMenuItem className="items-start gap-2 py-1.5" asChild>
        <a href={markdownUrl} target="_blank" rel="noopener noreferrer">
          <ActionItemContent
            icon={FileTextIcon}
            title="Markdown olarak görüntüle"
            description="Bu makaleyi düz metin olarak aç"
            external
          />
        </a>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="items-start gap-2 py-1.5" asChild>
        <a href={chatGptUrl} target="_blank" rel="noopener noreferrer">
          <ActionItemContent
            icon={ChatGptLogo}
            title="ChatGPT'de aç"
            description="Makale hakkında soru sor"
            external
          />
        </a>
      </DropdownMenuItem>
      <DropdownMenuItem className="items-start gap-2 py-1.5" asChild>
        <a href={claudeUrl} target="_blank" rel="noopener noreferrer">
          <ActionItemContent
            icon={ClaudeLogo}
            title="Claude'da aç"
            description="Makale hakkında soru sor"
            external
          />
        </a>
      </DropdownMenuItem>
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
