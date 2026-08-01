"use client"

import * as React from "react"
import * as runtime from "react/jsx-runtime"
import Link from "next/link"
import { CopyIcon } from "lucide-react"

import { CopiedIconSwap, copyText } from "@/components/blog/article-actions"
import { cn } from "@/lib/utils"

type MdxComponents = Record<string, React.ComponentType<unknown>>
type MdxRenderer = (props: { components?: MdxComponents }) => React.ReactElement

// Velite `s.mdx()` çıktısı, function-body string'idir; runtime'ı arguments[0]
// olarak alır ve { default: MDXContent } döndürür. (contentlayer/velite deseni.)
function useMDXComponent(code: string): MdxRenderer {
  return React.useMemo(() => {
    const fn = new Function(code)
    return fn({ ...runtime }).default as MdxRenderer
  }, [code])
}

// MDX gövdesinde kullanılabilecek özel bileşenler.
function MdxLink({
  href = "",
  ...props
}: React.ComponentProps<"a">) {
  // İç bağlantı: kök-göreli ("/…", ama protokol-göreli "//…" DEĞİL) veya çapa.
  const isInternal =
    (href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#")
  if (isInternal) {
    return <Link href={href} {...props} />
  }
  // Dış bağlantı yalnız güvenli şemalara izinli; javascript:/data: gibi şemalar
  // (ileride dış katkı gelirse XSS vektörü) href'siz düz metne indirgenir.
  const isSafeExternal = /^(https?:|mailto:)/i.test(href)
  if (!isSafeExternal) {
    return <a {...props} />
  }
  return <a href={href} target="_blank" rel="noopener noreferrer" {...props} />
}

function MdxImage({
  className,
  alt = "",
  ...props
}: React.ComponentProps<"img">) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      loading="lazy"
      // Görsel kenarı nötr siyah/beyaz outline: `--border` tonlu bir nötr
      // olduğu için görselin üstünde kir gibi okunuyordu. `outline` ayrıca
      // layout'a genişlik eklemez, `-outline-offset-1` ile içeri gömülür.
      className={cn(
        "rounded-lg outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10",
        className,
      )}
      {...props}
    />
  )
}

/** Bilgi/uyarı kutusu — MDX'te `<Callout>...</Callout>` ile kullanılır. */
function Callout({
  children,
  variant = "info",
}: {
  children: React.ReactNode
  variant?: "info" | "warning"
}) {
  return (
    <div
      className={cn(
        "not-prose my-6 border-l-2 px-4 py-3 text-sm leading-relaxed text-foreground",
        variant === "warning"
          ? "border-l-destructive bg-destructive/[0.06]"
          : "border-l-primary bg-muted/60",
      )}
    >
      {children}
    </div>
  )
}

// Fence'teki dil etiketi (```ts) → başlıkta gösterilen okunur ad. Listede
// olmayan bir dil geldiğinde etiket büyük harfe çevrilerek gösterilir, yani
// yeni bir dil eklemek için burayı güncellemek zorunlu değil.
const LANGUAGE_LABELS: Record<string, string> = {
  bash: "Bash",
  c: "C",
  cpp: "C++",
  css: "CSS",
  diff: "Diff",
  docker: "Dockerfile",
  dockerfile: "Dockerfile",
  go: "Go",
  graphql: "GraphQL",
  html: "HTML",
  ini: "INI",
  java: "Java",
  js: "JavaScript",
  javascript: "JavaScript",
  json: "JSON",
  jsonc: "JSONC",
  jsx: "JSX",
  kotlin: "Kotlin",
  md: "Markdown",
  mdx: "MDX",
  php: "PHP",
  plaintext: "Metin",
  prisma: "Prisma",
  py: "Python",
  python: "Python",
  rb: "Ruby",
  ruby: "Ruby",
  rust: "Rust",
  scss: "SCSS",
  sh: "Shell",
  shell: "Shell",
  sql: "SQL",
  svelte: "Svelte",
  swift: "Swift",
  text: "Metin",
  toml: "TOML",
  ts: "TypeScript",
  tsx: "TSX",
  typescript: "TypeScript",
  vue: "Vue",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML",
  zsh: "Zsh",
}

function languageLabel(language: string | undefined): string {
  if (!language) return "Metin"
  return LANGUAGE_LABELS[language] ?? language.toUpperCase()
}

/** `data-*` gibi tiplenmemiş HTML özniteliklerini props'tan okumak için. */
function attr(props: object, name: string): string | undefined {
  const value = (props as Record<string, unknown>)[name]
  return typeof value === "string" ? value : undefined
}

// rehype-pretty-code `title="…"` meta'sını <figure>'ün içinde ayrı bir
// <figcaption> olarak üretir. Başlığı kendi başlık çubuğumuza taşıyabilmek
// için figure seviyesinde yakalayıp context ile <pre>'ye indiriyoruz;
// böylece iki ayrı şerit yerine tek bir chrome oluşuyor.
const CodeTitleContext = React.createContext<React.ReactNode>(null)

function MdxFigure({ children, ...props }: React.ComponentProps<"figure">) {
  // Kod bloğu olmayan figure'lara (görsel + açıklama) dokunma.
  if (!("data-rehype-pretty-code-figure" in props)) {
    return <figure {...props}>{children}</figure>
  }

  const items = React.Children.toArray(children)
  const caption = items.find(
    (child) =>
      React.isValidElement(child) &&
      "data-rehype-pretty-code-title" in (child.props as object),
  )
  const title = React.isValidElement(caption)
    ? ((caption.props as { children?: React.ReactNode }).children ?? null)
    : null

  return (
    <figure {...props}>
      <CodeTitleContext.Provider value={title}>
        {caption ? items.filter((child) => child !== caption) : items}
      </CodeTitleContext.Provider>
    </figure>
  )
}

/** `<code>` içindeki `<span data-line>` sayısı — gutter genişliği için. */
function countLines(children: React.ReactNode): number {
  const code = React.Children.toArray(children).find(React.isValidElement)
  if (!code) return 0
  const codeChildren = (code.props as { children?: React.ReactNode }).children
  return React.Children.toArray(codeChildren).filter(
    (line) => React.isValidElement(line) && "data-line" in (line.props as object),
  ).length
}

/**
 * Kod bloğu: rehype-pretty-code'un <pre>'sinin üstüne dil etiketi + kopyala
 * butonundan oluşan bir başlık çubuğu ekler, ikisini tek bir çerçeveye alır.
 * Satır numaraları sol gutter'da CSS sayacıyla çizilir (globals.css) — DOM'a
 * girmedikleri için ne kopyalanan metne ne de seçime karışırlar. Kopyalanan
 * metin pre'nin textContent'inden okunur, vurgulama span'leri sorun çıkarmaz.
 */
function Pre({ children, ...props }: React.ComponentProps<"pre">) {
  const ref = React.useRef<HTMLPreElement>(null)
  const [copied, setCopied] = React.useState(false)
  const title = React.useContext(CodeTitleContext)

  const label = languageLabel(attr(props, "data-language"))
  // Gutter tam gerektiği kadar geniş olsun: 2 hane taban, 100+ satırda büyür.
  const digits = Math.max(2, String(countLines(children)).length)

  // Elle memoize edilmiyor: React Compiler bu bileşende manuel memoizasyonu
  // koruyamıyor (setCopied'ı bağımlılık olarak çıkarıyor) ve derlemeyi tamamen
  // atlıyordu. Bırakınca memoizasyonu compiler kendisi yapıyor.
  const copy = async () => {
    const text = ref.current?.textContent ?? ""
    if (!text) return
    // Paylaş butonuyla aynı yardımcı: güvenli bağlam yoksa textarea'ya düşer.
    if (!(await copyText(text))) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div
      data-slot="code-block"
      className="not-prose overflow-hidden rounded-lg border border-border bg-(--code-surface)"
      style={{ "--code-gutter-digits": String(digits) } as React.CSSProperties}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-(--code-chrome) py-1.5 pr-1.5 pl-3">
        <div className="flex min-w-0 items-baseline gap-2">
          {title ? (
            <span className="truncate text-xs font-medium text-foreground">{title}</span>
          ) : null}
          {/* Kasıtlı olarak `uppercase` YOK: <html lang="tr"> altında CSS
              Türkçe kurallarıyla büyütüyor ve "TypeScript" → "TYPESCRİPT"
              oluyordu. Etiketler zaten doğru yazımlarıyla tutuluyor. */}
          <span
            className={cn(
              "shrink-0 font-mono text-[11px] leading-none font-medium tracking-wide text-muted-foreground",
              title && "text-[10px]",
            )}
          >
            {label}
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          // Etiket sabit kalır: odaklı bir düğmenin `aria-label`'ını değiştirmek
          // ekran okuyucularda güvenilir seslendirilmiyor. Onay aşağıdaki sabit
          // durum bölgesinden duyuruluyor (paylaş butonundaki toast'un karşılığı).
          aria-label="Kodu kopyala"
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
            "hover:bg-foreground/[0.06] hover:text-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
          )}
        >
          <CopiedIconSwap
            copied={copied}
            idleIcon={CopyIcon}
            className="size-3.5"
            copiedClassName="text-primary"
          />
        </button>
      </div>
      {/* rehype `tabIndex=0` verir (kaydırılabilir bölge klavyeyle gezilebilsin);
          etiket olmadan ekran okuyucuda isimsiz bir bölge olarak duyuruluyordu. */}
      <pre ref={ref} aria-label={`${label} kod bloğu`} {...props}>
        {children}
      </pre>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Kod kopyalandı" : ""}
      </span>
    </div>
  )
}

const components = {
  a: MdxLink,
  img: MdxImage,
  figure: MdxFigure,
  pre: Pre,
  Callout,
} as unknown as MdxComponents

export function MdxContent({ code }: { code: string }) {
  // MDX render fonksiyonunu JSX <Component/> yerine doğrudan çağırıyoruz: MDX
  // çıktısı kendi içinde hook kullanmaz, böylece "render'da component oluşturma"
  // (react-hooks/static-components) uyarısı doğmaz.
  const render = useMDXComponent(code)
  return render({ components })
}
